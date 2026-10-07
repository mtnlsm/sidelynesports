// NFL + NBA + UFC live scores. Uses ESPN's public scoreboard JSON (no key needed), normalized to the Sidelyne Sports game shape:
// { id, sp, a, b, sa, sb, st:'live'|'up'|'final', clk, date }
const { cached, TTL, db } = require('./_cache');
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES = { // code -> ESPN {sport}/{league}
  NFL: 'football/nfl', NBA: 'basketball/nba', MLB: 'baseball/mlb', NHL: 'hockey/nhl', WNBA: 'basketball/wnba', CFL: 'football/cfl',
  CFB: 'football/college-football', CBB: 'basketball/mens-college-basketball', CBASE: 'baseball/college-baseball',
  EPL: 'soccer/eng.1', LALIGA: 'soccer/esp.1', BUND: 'soccer/ger.1', SERIEA: 'soccer/ita.1', LIGUE1: 'soccer/fra.1', MLS: 'soccer/usa.1',
  UCL: 'soccer/uefa.champions', UEL: 'soccer/uefa.europa', WC: 'soccer/fifa.world', LIGAMX: 'soccer/mex.1', ERED: 'soccer/ned.1', PORT: 'soccer/por.1' };
const PATHS = { UFC: 'mma/ufc/scoreboard', PFL: 'mma/pfl/scoreboard' }, TEAM_PATHS = {};
for (const k of Object.keys(LEAGUES)) { PATHS[k] = LEAGUES[k] + '/scoreboard'; TEAM_PATHS[k] = LEAGUES[k] + '/teams'; }
// Extra query params ESPN needs for the big college scoreboards/team lists (FBS / Division I only).
const EXTRA = { CFB: 'groups=80&limit=300', CBB: 'groups=50&limit=400', CBASE: 'limit=300' };
const TEAM_Q = { CFB: 'groups=80&limit=500', CBB: 'groups=50&limit=500', CBASE: 'limit=500' };
// Team naming: NFL/NBA keep the short name (existing favorites), colleges use the school name, every other league uses the full unique name.
const SHORT = new Set(['NFL', 'NBA', 'CFB', 'CBB', 'CBASE']);
const tn = (sp, t) => (SHORT.has(sp) ? (t.shortDisplayName || t.name) : (t.displayName || t.shortDisplayName || t.name));
// A game is only kept if it has a real, confirmed date and is not stale (upcoming games already past their start time, or finals older than 2 days, are dropped).
const fresh = (st, date) => { const t = Date.parse(date); if (!t) return false; const age = Date.now() - t; if (st === 'up') return age < 0; if (st === 'final') return age < 2 * 864e5; return true; };
// ESPN image links (logos + headshots). Anything missing just falls back to letters in the app.
const hs = (a, sp, cid) => {
  if (!a) return '';
  const h = a.headshot, u = typeof h === 'string' ? h : (h && h.href) || '';
  if (u) return u.replace(/^http:/, 'https:');
  const id = a.id || cid; if (!id) return '';
  const seg = sp === 'UFC' || sp === 'PFL' ? 'mma' : LEAGUES[sp] ? LEAGUES[sp].split('/').pop() : '';
  return seg ? 'https://a.espncdn.com/i/headshots/' + seg + '/players/full/' + id + '.png' : '';
};
const lgo = (t) => String((t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href))) || '').replace(/^http:/, 'https:');
const state = (s) => (s === 'in' ? 'live' : s === 'post' ? 'final' : 'up');

// Betting odds shown for information only (ESPN lists them on upcoming team games; not every game has them). a = away team, b = home team.
function normOdds(c) {
  const o = c && c.odds && c.odds[0]; if (!o) return undefined;
  const fmt = (v) => { if (v == null || v === '') return ''; let t = String(v).trim(); if (/^even$/i.test(t)) return '+100'; if (/^\d/.test(t)) t = '+' + t; return /^[+-]\d+$/.test(t) ? t : ''; };
  const ml = (side) => { const t = o[side + 'TeamOdds'] || {}; const m = o.moneyline && o.moneyline[side] && o.moneyline[side].close && o.moneyline[side].close.odds; return fmt(t.moneyLine != null ? t.moneyLine : m); };
  const out = { a: ml('away'), b: ml('home'), d: o.details ? String(o.details).slice(0, 24) : '', ou: o.overUnder != null && o.overUnder !== '' ? Number(o.overUnder) : '', p: o.provider && o.provider.name ? String(o.provider.name).slice(0, 24) : '' };
  return out.a || out.b || out.d || out.ou ? out : undefined;
}
// Live situation (ESPN scoreboard/summary "situation"): baseball = count/outs/runners/batter/pitcher, football = down & distance/possession, others = last play.
const pn = (o) => { if (!o) return ''; const a = o.athlete || o; return String(a.shortName || a.displayName || a.fullName || '').slice(0, 30); };
function normSit(sp, s, ids) {
  if (!s || typeof s !== 'object') return undefined;
  const lg = LEAGUES[sp] || '', lp = s.lastPlay && s.lastPlay.text ? String(s.lastPlay.text).slice(0, 200) : '';
  if (lg.startsWith('baseball')) return { k: 'b', ba: Number(s.balls) || 0, sk: Number(s.strikes) || 0, o: Number(s.outs) || 0, r1: !!s.onFirst, r2: !!s.onSecond, r3: !!s.onThird, bt: pn(s.batter), pt: pn(s.pitcher), lp };
  if (lg.startsWith('football')) { const p = s.possession != null ? String(s.possession) : '';
    return { k: 'f', dd: String(s.downDistanceText || s.shortDownDistanceText || '').slice(0, 40), pt: String(s.possessionText || '').slice(0, 30), po: ids && p === ids.a ? 'a' : ids && p === ids.b ? 'b' : '', rz: !!s.isRedZone,
      ta: s.awayTimeouts != null ? Number(s.awayTimeouts) : undefined, tb: s.homeTimeouts != null ? Number(s.homeTimeouts) : undefined, lp }; }
  return lp ? { k: 'g', lp } : undefined;
}
function normTeam(sp, ev) {
  const c = ev.competitions && ev.competitions[0]; if (!c) return null;
  const home = c.competitors.find((x) => x.homeAway === 'home'), away = c.competitors.find((x) => x.homeAway === 'away');
  if (!home || !away) return null;
  const st = state(ev.status.type.state), sa = Number(away.score || 0), sb = Number(home.score || 0);
  if (st === 'up' && (c.timeValid === false || /TBD|TBA/i.test(ev.status.type.shortDetail || ''))) return null; // no confirmed start time
  if (!fresh(st, ev.date)) return null;
  if (st === 'final' && ev.status.type.completed === false) return null; // postponed / canceled: never a result (it used to settle as a 0-0 draw)
  return { id: sp + ':' + ev.id, sp, a: tn(sp, away.team), b: tn(sp, home.team), la: lgo(away.team), lb: lgo(home.team),
    sa: st === 'up' ? '' : sa, sb: st === 'up' ? '' : sb, st, date: ev.date,
    od: st === 'up' ? normOdds(c) : undefined,
    sit: st === 'live' ? normSit(sp, c.situation, { a: String(away.team.id), b: String(home.team.id) }) : undefined,
    ld: st === 'up' ? [away, home].flatMap((x) => (x.leaders || []).map((l) => { const o = (l.leaders || [])[0]; return o && o.athlete ? { n: l.name, p: o.athlete.displayName, v: Number(o.value), i: hs(o.athlete, sp) } : null; }).filter(Boolean)) : undefined,
    clk: st === 'final' ? 'Final' : st === 'live' ? (ev.status.type.shortDetail || ev.status.displayClock) : ''};
}
function normUfc(ev, sp = 'UFC') {
  return (ev.competitions || []).map((c) => {
    const f = (c.competitors || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
    if (f.length < 2) return null;
    if (f.some((x) => !x.athlete || !x.athlete.displayName || /\b(TBA|TBD)\b|opponent/i.test(x.athlete.displayName))) return null; // fighter not confirmed
    const st = state(c.status && c.status.type ? c.status.type.state : ev.status.type.state);
    if (st === 'up' && /TBD|TBA/i.test(((c.status && c.status.type && c.status.type.shortDetail) || '') + ' ' + ((ev.status && ev.status.type && ev.status.type.shortDetail) || ''))) return null; // no confirmed start time
    if (!fresh(st, c.date || ev.date)) return null;
    return { id: sp + ':' + c.id, sp, a: f[0].athlete.displayName, b: f[1].athlete.displayName, ia: hs(f[0].athlete, sp, f[0].id), ib: hs(f[1].athlete, sp, f[1].id),
      sa: st === 'final' ? (f[0].winner ? 'W' : f[1].winner ? 'L' : 'D') : '', sb: st === 'final' ? (f[1].winner ? 'W' : f[0].winner ? 'L' : 'D') : '', st, date: c.date || ev.date,
      clk: st === 'final' ? 'Final' : st === 'live' ? ((c.status && c.status.type && c.status.type.shortDetail) || 'Live') : '' };
  }).filter(Boolean).reverse().slice(0, 8);
}
// ESPN's default scoreboard only covers "today"/the current week, so ask for an explicit window (yesterday .. +7 days; UFC/PFL +14).
const ymd = (o) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
async function load(sp) {
  // UFC: ranged request (works). NFL/NBA: try a ranged request, but fall back to ESPN's plain default scoreboard if it errors or comes back empty.
  const get = async (q) => { const r = await fetch(BASE + PATHS[sp] + q); if (!r.ok) throw new Error('espn ' + r.status); return (await r.json()).events || []; };
  let events = [];
  if (sp === 'UFC' || sp === 'PFL') events = await get(`?dates=${ymd(-1)}-${ymd(14)}&limit=100`);
  else {
    const x = EXTRA[sp] ? '&' + EXTRA[sp] : '';
    try { events = await get(`?dates=${ymd(-1)}-${ymd(7)}${x}`); } catch (e) {}
    if (!events.length) events = await get(x ? '?' + x.slice(1) : '');
  }
  return events.flatMap((ev) => (sp === 'UFC' || sp === 'PFL' ? normUfc(ev, sp) : [normTeam(sp, ev)])).filter(Boolean);
}
// ESPN gives team colors as 6-digit hex without '#'. Used by the SP Shop team themes.
const hexc = (x) => (/^[0-9a-f]{6}$/i.test(String(x || '')) ? String(x).toLowerCase() : '');
// Current teams (live from ESPN, so relocations/expansions are picked up automatically). Names use the same short form as the scoreboard.
async function loadTeams(sp) {
  const url = BASE + TEAM_PATHS[sp] + '?' + (TEAM_Q[sp] || 'limit=500');
  const r = await fetch(url).then((x) => (x.ok ? x : fetch(url))); if (!r.ok) throw new Error('espn ' + r.status);
  const j = await r.json(); const lg = (((j.sports || [])[0] || {}).leagues || [])[0];
  return ((lg && lg.teams) || []).map((x) => x.team).filter((t) => t && t.isActive !== false)
    .map((t) => ({ n: tn(sp, t), full: t.displayName, ab: t.abbreviation, sp, c: hexc(t.color), c2: hexc(t.alternateColor), lg: lgo(t) })).sort((a, b) => a.n.localeCompare(b.n));
}
exports.LEAGUES = LEAGUES;
exports.normSit = normSit; // used by game-detail.js
exports.load = load; // used by _settle.js to fetch only the leagues that have unpaid picks
exports.handler = async (event) => {
  const { sport = 'ALL', type = 'games' } = event.queryStringParameters || {};
  const S = sport.toUpperCase();
  if (type === 'teams') {
    const tl = S === 'ALL' ? Object.keys(TEAM_PATHS) : [S];
    if (tl.some((s) => !TEAM_PATHS[s])) return { statusCode: 400, body: JSON.stringify({ error: 'bad sport' }) };
    try {
      const data = await cached('teams3:' + S, TTL.standings, async () => {
        const res = await Promise.allSettled(tl.map(loadTeams));
        const items = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
        if (!items.length) throw new Error('team list unavailable');
        return { items, partial: res.some((r) => r.status === 'rejected'), updated: new Date().toISOString() };
      }, { provider: 'espn' });
      return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(data) };
    } catch (e) { return { statusCode: 502, body: JSON.stringify({ error: 'upstream unavailable', detail: String(e.message || e) }) }; }
  }
  if (type !== 'games' || (S !== 'ALL' && !PATHS[S])) return { statusCode: 400, body: JSON.stringify({ error: 'bad sport/type' }) };
  const list = S === 'ALL' ? Object.keys(PATHS) : [S];
  try {
    const data = await cached('games3:' + S, TTL.live, async () => {
      const res = await Promise.allSettled(list.map(load));
      const items = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (!items.length && res.every((r) => r.status === 'rejected')) throw new Error('all providers failed');
      // Save the moneylines of upcoming games so the database (not the browser) decides what a winning bet pays. Needs supabase/odds.sql.
      try { const c = db(), ml = (v) => { const n = parseInt(v, 10); return n ? n : null; };
        const rows = items.filter((g) => g.st === 'up' && g.od && (g.od.a || g.od.b)).map((g) => ({ game_id: String(g.id), a: g.a, b: g.b, a_ml: ml(g.od.a), b_ml: ml(g.od.b), updated_at: new Date().toISOString() }));
        if (c && rows.length) await c.from('game_odds').upsert(rows, { onConflict: 'game_id' }); } catch (e) {}
      return { items, updated: new Date().toISOString() };
    }, { provider: 'espn' });
    return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(data) };
  } catch (e) { return { statusCode: 502, body: JSON.stringify({ error: 'upstream unavailable', detail: String(e.message || e) }) }; }
};
