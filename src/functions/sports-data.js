// US pro/college leagues + UFC live scores. Uses ESPN's public scoreboard JSON (no key needed), normalized to the Sidelyne Sports game shape:
// { id, sp, a, b, sa, sb, st:'live'|'up'|'final', clk, date }
const { cached, TTL, db } = require('./_cache');
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/';
const LEAGUES = { // code -> ESPN {sport}/{league}
  NFL: 'football/nfl', NBA: 'basketball/nba', MLB: 'baseball/mlb', NHL: 'hockey/nhl', WNBA: 'basketball/wnba', CFL: 'football/cfl',
  CFB: 'football/college-football', CBB: 'basketball/mens-college-basketball', CBASE: 'baseball/college-baseball' };
const PATHS = { UFC: 'mma/ufc/scoreboard', PFL: 'mma/pfl/scoreboard' }, TEAM_PATHS = {};
const MMA_SP = new Set(['UFC', 'PFL']); // fight leagues (ESPN mma/*), handled with the fighter-card code
for (const k of Object.keys(LEAGUES)) { PATHS[k] = LEAGUES[k] + '/scoreboard'; TEAM_PATHS[k] = LEAGUES[k] + '/teams'; }
// Leagues switched off to stay inside Cloudflare's free-plan CPU / request limits. To bring one back, delete it from this list.
const OFF = ['WNBA', 'CFL', 'CBB', 'CBASE']; for (const k of OFF) { delete PATHS[k]; delete TEAM_PATHS[k]; }
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
  const seg = MMA_SP.has(sp) ? 'mma' : LEAGUES[sp] ? LEAGUES[sp].split('/').pop() : '';
  return seg ? 'https://a.espncdn.com/i/headshots/' + seg + '/players/full/' + id + '.png' : '';
};
const lgo = (t) => String((t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href))) || '').replace(/^http:/, 'https:');
// Every ESPN call goes through here: never served from an edge/browser cache (that is what froze the upcoming games), one retry on failure.
const espn = async (url) => {
  let last;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; SidelineSports/1.0)' }, cf: { cacheTtl: 0, cacheEverything: false } });
      if (r.ok) return r;
      last = new Error('espn ' + r.status);
    } catch (e) { last = e; }
  }
  throw last;
};
const state = (s) => (s === 'in' ? 'live' : s === 'post' ? 'final' : 'up');

// Betting odds shown for information only (ESPN lists them on upcoming team games; not every game has them). a = away team, b = home team.
function normOdds(c) {
  const o = c && c.odds && c.odds[0]; if (!o) return undefined;
  const fmt = (v) => { if (v == null || v === '') return ''; let t = String(v).trim(); if (/^even$/i.test(t)) return '+100'; if (/^\d/.test(t)) t = '+' + t; return /^[+-]\d+$/.test(t) ? t : ''; };
  const ml = (side) => { const t = o[side + 'TeamOdds'] || {}; const m = o.moneyline && o.moneyline[side] && o.moneyline[side].close && o.moneyline[side].close.odds; return fmt(t.moneyLine != null ? t.moneyLine : m); };
  const out = { a: ml('away'), b: ml('home'), d: o.details ? String(o.details).slice(0, 24) : '', ou: o.overUnder != null && o.overUnder !== '' ? Number(o.overUnder) : '', p: o.provider && o.provider.name ? String(o.provider.name).slice(0, 24) : '' };
  return out.a || out.b || out.d || out.ou ? out : undefined;
}
// UFC fight odds: ESPN lists a moneyline per fighter on upcoming bouts (awayAthleteOdds / homeAthleteOdds). We match each line to the right fighter
// by athlete id (or home/away) and never guess: if a line cannot be matched, no odds are shown and the bet pays the flat 2x like before.
function normMmaOdds(c, f) {
  const o = c && c.odds && c.odds[0]; if (!o) return undefined;
  const fmt = (v) => { if (v == null || v === '') return ''; let t = String(v).trim(); if (/^even$/i.test(t)) return '+100'; if (/^\d/.test(t)) t = '+' + t; return /^[+-]\d+$/.test(t) ? t : ''; };
  const idOf = (n) => { if (!n) return ''; const a = n.athlete || n; if (a.id != null) return String(a.id); const m = String(a.$ref || '').match(/athletes\/(\d+)/); return m ? m[1] : ''; };
  const side = (k) => { const n = o[k + 'AthleteOdds'] || o[k + 'TeamOdds'] || {}; const m = o.moneyline && o.moneyline[k] && o.moneyline[k].close && o.moneyline[k].close.odds;
    return { id: idOf(n), ml: fmt(n.moneyLine != null ? n.moneyLine : m) }; };
  const S = { away: side('away'), home: side('home') };
  const pick = (x) => { const ids = [String(x.id || ''), String((x.athlete && x.athlete.id) || '')].filter(Boolean);
    const k = ['away', 'home'].find((s) => S[s].id && ids.includes(S[s].id)) || (x.homeAway === 'away' || x.homeAway === 'home' ? x.homeAway : '');
    return k ? S[k].ml : ''; };
  const a = pick(f[0]), b = pick(f[1]);
  if (a && b && a === b && a !== '+100') return undefined; // same line twice = a bad match, do not show it
  return a || b ? { a, b, d: '', ou: '', p: o.provider && o.provider.name ? String(o.provider.name).slice(0, 24) : '' } : undefined;
}
// ESPN does NOT put fight odds on the scoreboard. They live on the core API, one request per fight:
//   sports.core.api.espn.com/v2/sports/mma/leagues/ufc/events/{eventId}/competitions/{fightId}/odds
// Results are remembered in memory for 15 minutes (also when a fight has no line yet) so we do not hit ESPN on every refresh.
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/';
const mmaOddsMem = new Map();
let oddsBudget = 0; // Cloudflare free plan allows ~50 outgoing requests per run: cap how many fight-odds lookups one refresh may make
const impl = (m) => { const n = parseInt(m, 10); return n ? (n < 0 ? -n / (-n + 100) : 100 / (n + 100)) : 0; };
async function fetchMmaOdds(sp, evId, c, f) {
  const key = sp + ':' + evId + ':' + c.id, hit = mmaOddsMem.get(key);
  if (hit && hit.exp > Date.now()) return hit.v;
  if (oddsBudget <= 0) return undefined; // out of budget: not cached, so it is retried on the next refresh
  oddsBudget--;
  let v;
  try {
    const url = CORE + sp.toLowerCase() + '/events/' + evId + '/competitions/' + c.id + '/odds';
    const r = await espn(url);
    let items = (await r.json()).items || [];
    // some responses only list links to each provider's line: open the first one
    if (items.length && !items[0].awayAthleteOdds && !items[0].homeAthleteOdds && items[0].$ref) {
      oddsBudget--; try { const r2 = await espn(String(items[0].$ref).replace(/^http:/, 'https:')); items = [await r2.json()]; } catch (e) {}
    }
    v = normMmaOdds({ odds: items }, f);
    // sanity gate: two sides of one fight add up to a bit over 100% (the book's cut). Anything else is a mismatch, so show nothing.
    if (v && v.a && v.b) { const t = impl(v.a) + impl(v.b); if (t < 0.95 || t > 1.35) v = undefined; }
  } catch (e) { v = undefined; }
  mmaOddsMem.set(key, { v, exp: Date.now() + 15 * 60 * 1000 });
  return v;
}
async function addMmaOdds(sp, events, fights) {
  const by = new Map();
  events.forEach((ev) => (ev.competitions || []).forEach((c) => by.set(sp + ':' + c.id, { ev, c })));
  await Promise.allSettled(fights.filter((g) => g.st === 'up' && !g.od).map(async (g) => {
    const x = by.get(g.id); if (!x) return;
    const f = (x.c.competitors || []).slice().sort((p, q) => (p.order || 0) - (q.order || 0));
    const od = await fetchMmaOdds(sp, x.ev.id, x.c, f);
    if (od) g.od = od;
  }));
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
// MLB / college baseball: probable starting pitcher per team (ESPN scoreboard "probables"), shown on the pick sheet.
const probP = (x) => { const pb = ((x && x.probables) || []).find((q) => q && q.athlete); if (!pb) return '';
  const a = pb.athlete, nm = String(a.displayName || a.shortName || a.fullName || '').slice(0, 40); if (!nm) return '';
  const era = (pb.statistics || []).find((t) => t && /^era$/i.test(String(t.abbreviation || t.name || '')));
  const rec = typeof pb.record === 'string' ? pb.record : (pb.record && pb.record.summary) || '';
  return nm + (rec ? ' (' + String(rec).slice(0, 8) + ')' : '') + (era && era.displayValue ? ' \u00b7 ' + String(era.displayValue).slice(0, 6) + ' ERA' : ''); };
function normTeam(sp, ev) {
  const c = ev.competitions && ev.competitions[0]; if (!c) return null;
  const home = c.competitors.find((x) => x.homeAway === 'home'), away = c.competitors.find((x) => x.homeAway === 'away');
  if (!home || !away) return null;
  const st = state(ev.status.type.state), sa = Number(away.score || 0), sb = Number(home.score || 0);
  if (st === 'up' && /TBD|TBA/i.test(ev.status.type.shortDetail || '') && sp !== 'NFL') return null; // placeholder time: only hidden when it is more than a day away, so today's games always show // no confirmed start time
  if (!fresh(st, ev.date)) return null;
  if (st === 'final' && ev.status.type.completed === false) return null; // postponed / canceled: never a result (it used to settle as a 0-0 draw)
  return { id: sp + ':' + ev.id, sp, a: tn(sp, away.team), b: tn(sp, home.team), la: lgo(away.team), lb: lgo(home.team),
    ca: String(away.team.conferenceId || ''), cb: String(home.team.conferenceId || ''),
    sa: st === 'up' ? '' : sa, sb: st === 'up' ? '' : sb, st, date: ev.date,
    od: st === 'up' ? normOdds(c) : undefined,
    pp: st === 'up' && String(LEAGUES[sp] || '').startsWith('baseball') ? (() => { const a = probP(away), b = probP(home); return a || b ? { a, b } : undefined; })() : undefined,
    sit: st === 'live' ? normSit(sp, c.situation, { a: String(away.team.id), b: String(home.team.id) }) : undefined,
    ld: st === 'up' ? [away, home].flatMap((x) => (x.leaders || []).map((l) => { const o = (l.leaders || [])[0]; return o && o.athlete ? { n: l.name, a: l.abbreviation, p: o.athlete.displayName, v: Number(o.value), i: MMA_SP.has(sp) ? hs(o.athlete, sp) : '' } : null; }).concat((x.probables || []).map((pb) => (pb && pb.athlete ? { n: 'probableStartingPitcher', a: 'pitch', p: pb.athlete.displayName, v: 0 } : null))).filter(Boolean)) : undefined,
    clk: st === 'final' ? 'Final' : st === 'live' ? (ev.status.type.shortDetail || ev.status.displayClock) : ''};
}
function normUfc(ev, sp = 'UFC') {
  const comps = (ev.competitions || []).slice().reverse(); // ESPN lists the opener first: reverse so index 0 = main event, 1 = co-main
  // PFL (and some other promotions) send no cardSegment: the later start time is the main card, earlier fights are the prelims.
  const stamps = comps.map((c) => Date.parse(c.date || ev.date)).filter(Boolean), lastT = Math.max(...stamps), firstT = Math.min(...stamps);
  const segOf = (c, i) => { const t = String((c.cardSegment && (c.cardSegment.description || c.cardSegment.name)) || '').toLowerCase(); if (/prelim/.test(t)) return 'pre'; if (/main/.test(t)) return 'main';
    if (stamps.length && lastT !== firstT) return Date.parse(c.date || ev.date) >= lastT ? 'main' : 'pre'; return i < 5 ? 'main' : 'pre'; };
  const venue = (ev.venues && ev.venues[0]) || (ev.competitions && ev.competitions[0] && ev.competitions[0].venue) || {};
  const ad = venue.address || {};
  const vn = [venue.fullName, [ad.city, ad.state || ad.country].filter(Boolean).join(', ')].filter(Boolean).join(' \u00b7 ').slice(0, 90);
  const times = { main: 0, pre: 0 };
  comps.forEach((c, i) => { const k = segOf(c, i), t = Date.parse(c.date || ev.date); if (t && (!times[k] || t < times[k])) times[k] = t; });
  const rec = (x) => { const r = (x.records || []).find((y) => y && y.summary); return r ? String(r.summary).slice(0, 12) : ''; };
  const flag = (x) => { const u = x.athlete && x.athlete.flag && x.athlete.flag.href; return u ? String(u).replace(/^http:/, 'https:') : ''; };
  return comps.map((c, i) => {
    const f = (c.competitors || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
    if (f.length < 2) return null;
    if (f.some((x) => !x.athlete || !x.athlete.displayName || /\b(TBA|TBD)\b|opponent/i.test(x.athlete.displayName))) return null; // fighter not confirmed
    const st = state(c.status && c.status.type ? c.status.type.state : ev.status.type.state);
    if (st === 'up' && /TBD|TBA/i.test(((c.status && c.status.type && c.status.type.shortDetail) || '') + ' ' + ((ev.status && ev.status.type && ev.status.type.shortDetail) || ''))) return null; // no confirmed start time
    if (!fresh(st, c.date || ev.date)) return null;
    const wc = String((c.type && (c.type.text || c.type.abbreviation)) || '').replace(/\s*bout$/i, '').slice(0, 40);
    const rd = Number(c.format && c.format.regulation && c.format.regulation.periods) || (i === 0 ? 5 : 3);
    return { id: sp + ':' + c.id, sp, ev: String(ev.name || ev.shortName || '').slice(0, 80), evi: String(ev.id || ''), a: f[0].athlete.displayName, b: f[1].athlete.displayName, ia: hs(f[0].athlete, sp, f[0].id), ib: hs(f[1].athlete, sp, f[1].id),
      sa: st === 'final' ? (f[0].winner ? 'W' : f[1].winner ? 'L' : 'D') : '', sb: st === 'final' ? (f[1].winner ? 'W' : f[0].winner ? 'L' : 'D') : '', st, date: c.date || ev.date,
      od: st === 'up' ? normMmaOdds(c, f) : undefined,
      pos: i, seg: segOf(c, i), wc, rd, ra: rec(f[0]), rb: rec(f[1]), fa: flag(f[0]), fb: flag(f[1]), vn, tm: times.main ? new Date(times.main).toISOString() : '', tp: times.pre ? new Date(times.pre).toISOString() : '',
      clk: st === 'final' ? 'Final' : st === 'live' ? ((c.status && c.status.type && c.status.type.shortDetail) || 'Live') : '' };
  }).filter(Boolean).slice(0, 20);
}
// ESPN's default scoreboard only covers "today"/the current week, so ask for an explicit window (yesterday .. +7 days; UFC +14).
const ymd = (o) => new Date(Date.now() + o * 864e5).toISOString().slice(0, 10).replace(/-/g, '');
const DBG = {};
async function load(sp) {
  if (!PATHS[sp]) return []; // switched off (see OFF above)
  // Ranged request first (yesterday .. +7 days, UFC +14). For team leagues we ALSO read ESPN's plain default scoreboard and merge the two, so a flaky range query can never leave the upcoming list empty or stuck.
  const get = async (q) => { const r = await espn(BASE + PATHS[sp] + q); return (await r.json()).events || []; };
  let events = [], rangeErr = '';
  if (MMA_SP.has(sp)) events = await get(`?dates=${ymd(-1)}-${ymd(14)}&limit=100`);
  else {
    const x = '&' + (EXTRA[sp] || 'limit=300'); // always ask for plenty of games: ESPN can cut a long list short otherwise
    let ranged = [], plain = [], err;
    try { ranged = await get(`?dates=${ymd(-1)}-${ymd(7)}${x}`); } catch (e) { err = e; rangeErr = String((e && e.message) || e); }
    // ESPN answers 400 to multi-day ranges for day-based leagues (NHL, NBA, MLB, WNBA...). When that happens, ask one day at a time
    // (yesterday .. +2 days = 4 requests per league, which keeps ALL under the free plan's ~50 outgoing requests).
    if (rangeErr) {
      const days = await Promise.allSettled([-1, 0, 1, 2].map((o) => get(`?dates=${ymd(o)}${x}`)));
      ranged = days.flatMap((d) => (d.status === 'fulfilled' ? d.value : []));
      if (ranged.length) err = null;
    }
    const hasUp = ranged.some((ev) => ev && ev.status && ev.status.type && ev.status.type.state === 'pre');
    if (!hasUp || sp === 'NFL') { try { plain = await get(x ? '?' + x.slice(1) : ''); } catch (e) { err = err || e; } }
    if (!ranged.length && !plain.length && err) throw err;
    let today = []; try { today = await get(`?dates=${ymd(0)}${x}`); } catch (e) {} // today's slate always asked for on its own, so a cut-off range can never hide today's games
    const seen = new Set();
    events = ranged.concat(today, plain).filter((ev) => ev && ev.id != null && !seen.has(ev.id) && seen.add(ev.id));
  }
  const out = events.flatMap((ev) => (MMA_SP.has(sp) ? normUfc(ev, sp) : [normTeam(sp, ev)])).filter(Boolean);
  DBG[sp] = { range_error: rangeErr || undefined, espn_events: events.length, espn_pre: events.filter((e) => e && e.status && e.status.type && e.status.type.state === 'pre').length,
    kept: out.length, games: events.filter((e) => e && !MMA_SP.has(sp)).map((e) => (e.shortName || e.name) + ' | ' + (e.status && e.status.type && e.status.type.state) + ' | ' + e.date), kept_up: out.filter((g) => g.st === 'up').length, kept_live: out.filter((g) => g.st === 'live').length, kept_final: out.filter((g) => g.st === 'final').length,
    next_up: (out.filter((g) => g.st === 'up').map((g) => g.date).sort()[0]) || null, sample_dropped: events.filter((e) => e && !MMA_SP.has(sp) && !normTeam(sp, e)).slice(0, 2).map((e) => ({ name: e.shortName, date: e.date, state: e.status && e.status.type && e.status.type.state, detail: e.status && e.status.type && e.status.type.shortDetail, timeValid: e.competitions && e.competitions[0] && e.competitions[0].timeValid })) };
  if (MMA_SP.has(sp)) { try { await addMmaOdds(sp, events, out); } catch (e) {} }
  return out;
}
// ESPN gives team colors as 6-digit hex without '#'. Used by the SP Shop team themes.
const hexc = (x) => (/^[0-9a-f]{6}$/i.test(String(x || '')) ? String(x).toLowerCase() : '');
// Current teams (live from ESPN, so relocations/expansions are picked up automatically). Names use the same short form as the scoreboard.
async function loadTeams(sp) {
  const url = BASE + TEAM_PATHS[sp] + '?' + (TEAM_Q[sp] || 'limit=500');
  const r = await espn(url);
  const j = await r.json(); const lg = (((j.sports || [])[0] || {}).leagues || [])[0];
  return ((lg && lg.teams) || []).map((x) => x.team).filter((t) => t && t.isActive !== false)
    .map((t) => ({ id: String(t.id || ''), n: tn(sp, t), full: t.displayName, ab: t.abbreviation, sp, c: hexc(t.color), c2: hexc(t.alternateColor), lg: lgo(t) })).sort((a, b) => a.n.localeCompare(b.n));
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
      const data = await cached('teams5:' + S, TTL.standings, async () => {
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
  if ((event.queryStringParameters || {}).debug) { // /sports-data?sport=ALL&type=games&debug=1 : live look, no cache, shows why games are kept or dropped
    oddsBudget = 0; const res = await Promise.allSettled(list.map(load));
    return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ now: new Date().toISOString(), window: ymd(-1) + '-' + ymd(7), leagues: Object.fromEntries(list.map((k, i) => [k, res[i].status === 'fulfilled' ? DBG[k] : { error: String((res[i].reason && res[i].reason.message) || res[i].reason) }])) }, null, 1) };
  }
  try {
    const data = await cached('games6:' + S, TTL.live, async () => {
      oddsBudget = S === 'ALL' ? 6 : 20;
      const res = await Promise.allSettled(list.map(load));
      const items = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
      if (!items.length && res.every((r) => r.status === 'rejected')) throw new Error('all providers failed: ' + res.slice(0, 3).map((r, i) => list[i] + ' -> ' + String((r.reason && r.reason.message) || r.reason)).join(' | '));
      // Save the moneylines of upcoming games so the database (not the browser) decides what a winning bet pays. Needs supabase/odds.sql.
      try { const c = db(), ml = (v) => { const n = parseInt(v, 10); return n ? n : null; };
        const rows = items.filter((g) => g.st === 'up' && g.od && (g.od.a || g.od.b)).map((g) => ({ game_id: String(g.id), a: g.a, b: g.b, a_ml: ml(g.od.a), b_ml: ml(g.od.b), updated_at: new Date().toISOString() }));
        if (c && rows.length) await c.from('game_odds').upsert(rows, { onConflict: 'game_id' }); } catch (e) {}
      return { items, updated: new Date().toISOString() };
    }, { provider: 'espn' });
    return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(data) };
  } catch (e) { return { statusCode: 502, body: JSON.stringify({ error: 'upstream unavailable', detail: String(e.message || e) }) }; }
};
