// Live game detail: line score, situation (outs/runners/down & distance), box score, lineups, team stats, recent plays.
// Source: ESPN's public summary JSON (no key). Cached 15s in the shared cache like the scoreboard.
// Call: /.netlify/functions/game-detail?id=MLB:401234567   (same id format as the games feed)
const { cached, TTL } = require('./_cache');
const { LEAGUES, normSit } = require('./sports-data');
const BASE = 'https://site.api.espn.com/apis/site/v2/sports/';
const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify(body) });
const https = (u) => String(u || '').replace(/^http:/, 'https:');
const logo = (t) => https(t && (t.logo || (t.logos && t.logos[0] && t.logos[0].href)));
const nm = (a) => (a ? a.shortName || a.displayName || '' : '');
// Player photo: ESPN's own headshot link when it sends one, else the standard ESPN headshot URL for that player id (the app hides it if it doesn't load).
const pic = (sp, a) => { if (!a) return ''; const h = a.headshot, u = typeof h === 'string' ? h : (h && h.href) || ''; if (u) return https(u); const seg = (LEAGUES[sp] || '').split('/').pop(); return a.id && seg && !(LEAGUES[sp] || '').startsWith('soccer') ? 'https://a.espncdn.com/i/headshots/' + seg + '/players/full/' + a.id + '.png' : ''; };
const posOf = (r) => (r.athlete && r.athlete.position && r.athlete.position.abbreviation) || (r.positions && r.positions[0] && r.positions[0].abbreviation) || (r.position && r.position.abbreviation) || '';
const state = (s) => (s === 'in' ? 'live' : s === 'post' ? 'final' : 'up');

// Column labels for the line score (innings / quarters / periods / halves).
function labels(sp, n) {
  const l = LEAGUES[sp] || '';
  const min = l.startsWith('baseball') ? 9 : l.startsWith('hockey') ? 3 : l.startsWith('soccer') ? 2 : l.includes('college') && l.startsWith('basketball') ? 2 : 4;
  const len = Math.max(n, min), out = [];
  for (let i = 0; i < len; i++) {
    if (l.startsWith('baseball')) out.push(String(i + 1));
    else if (l.startsWith('hockey')) out.push(i < 3 ? 'P' + (i + 1) : i === 3 ? 'OT' : 'SO');
    else if (l.startsWith('soccer')) out.push(i === 0 ? '1H' : i === 1 ? '2H' : 'ET');
    else if (l.includes('college') && l.startsWith('basketball')) out.push(i < 2 ? 'H' + (i + 1) : i === 2 ? 'OT' : 'OT' + (i - 1));
    else out.push(i < 4 ? 'Q' + (i + 1) : i === 4 ? 'OT' : 'OT' + (i - 3));
  }
  return out;
}

// boxscore.players -> { teamId: [ {n, k, labels, rows:[{n,jn,pos,s,st,bo,dnp}], tot} ] }
function normBox(sp, j) {
  const fb = (LEAGUES[sp] || '').startsWith('football'), out = {};
  for (const tp of (j.boxscore && j.boxscore.players) || []) {
    const id = String(tp.team && tp.team.id);
    const groups = (tp.statistics || []).map((s) => ({
      n: String(s.text || s.name || s.type || ''), k: String(s.type || s.name || ''),
      labels: (s.labels || []).map(String),
      rows: (s.athletes || []).filter((a) => a.athlete).map((a) => ({
        n: nm(a.athlete), i: pic(sp, a.athlete), jn: String(a.athlete.jersey || ''), pos: posOf(a), s: (a.stats || []).map(String),
        st: !!a.starter, bo: a.batOrder != null ? Number(a.batOrder) : undefined, dnp: !!a.didNotPlay })),
      tot: (s.totals || []).map(String) })).filter((g) => g.rows.length);
    out[id] = fb ? groups.slice(0, 5) : groups;
  }
  return out;
}

// Lineups: soccer-style rosters if ESPN sends them, otherwise built from the box score (MLB batting order, NBA/NHL starters).
function normLineups(j, box) {
  const out = {};
  if (Array.isArray(j.rosters) && j.rosters.length) {
    for (const r of j.rosters) {
      const id = String((r.team || {}).id);
      const list = (r.roster || []).map((p) => ({ n: nm(p.athlete), jn: String(p.jersey || (p.athlete && p.athlete.jersey) || ''), pos: posOf(p), st: !!p.starter }));
      out[id] = { f: r.formation || '', s: list.filter((p) => p.st), b: list.filter((p) => !p.st) };
    }
    return out;
  }
  const slim = (r) => ({ n: r.n, jn: r.jn, pos: r.pos, bo: r.bo, st: r.st });
  for (const id of Object.keys(box)) {
    const gs = box[id], bat = gs.find((g) => g.rows.some((r) => r.bo !== undefined));
    if (bat) {
      const ord = bat.rows.slice().sort((a, b) => (a.bo || 0) - (b.bo || 0)), pit = gs.find((g) => g.labels.includes('IP'));
      out[id] = { s: ord.filter((r) => r.st).map(slim), b: ord.filter((r) => !r.st).map(slim), p: pit ? pit.rows.map(slim) : [] };
    } else if (gs[0] && gs[0].rows.some((r) => r.st)) {
      out[id] = { s: gs[0].rows.filter((r) => r.st).map(slim), b: gs[0].rows.filter((r) => !r.st && !r.dnp).map(slim) };
    }
  }
  return out;
}

// Team stat comparison (fouls, FG%, rebounds, total yards, time of possession, hits ...).
function normTS(j, ids) {
  const by = {};
  ((j.boxscore && j.boxscore.teams) || []).forEach((x) => { by[String(x.team && x.team.id)] = x.statistics || []; });
  const A = by[ids.a] || [], H = by[ids.b] || [];
  return A.map((s) => { const h = H.find((x) => (x.label || x.name) === (s.label || s.name)); return [String(s.label || s.name || ''), String(s.displayValue != null ? s.displayValue : ''), h && h.displayValue != null ? String(h.displayValue) : '']; })
    .filter((r) => r[0] && r[1]).slice(0, 16);
}

function normPlays(j) {
  let p = Array.isArray(j.plays) ? j.plays : [];
  if (!p.length && j.drives) { const c = j.drives.current || (j.drives.previous || []).slice(-1)[0]; p = (c && c.plays) || []; }
  return p.slice(-10).reverse().map((x) => ({ t: String(x.text || x.shortText || '').slice(0, 200), c: (x.clock && x.clock.displayValue) || '', p: String((x.period && (x.period.displayValue || x.period.number)) || ''), sc: !!x.scoringPlay })).filter((x) => x.t);
}

function build(sp, id, j) {
  const hc = j.header && j.header.competitions && j.header.competitions[0];
  if (!hc) throw new Error('no game data');
  const cs = hc.competitors || [], aw = cs.find((x) => x.homeAway === 'away'), ho = cs.find((x) => x.homeAway === 'home');
  if (!aw || !ho) throw new Error('no teams');
  const ids = { a: String(aw.team.id), b: String(ho.team.id) };
  const side = (c) => ({ n: c.team.shortDisplayName || c.team.displayName || '', ab: c.team.abbreviation || '', lg: logo(c.team), sc: c.score != null && c.score !== '' ? Number(c.score) : '',
    ls: (c.linescores || []).map((l) => String(l.displayValue != null ? l.displayValue : l.value != null ? l.value : '')), h: c.hits != null ? Number(c.hits) : undefined, e: c.errors != null ? Number(c.errors) : undefined });
  const away = side(aw), home = side(ho), lab = labels(sp, Math.max(away.ls.length, home.ls.length));
  while (away.ls.length < lab.length) away.ls.push('');
  while (home.ls.length < lab.length) home.ls.push('');
  const t = (hc.status && hc.status.type) || {}, box = normBox(sp, j), lu = normLineups(j, box), plays = normPlays(j);
  const sit = normSit(sp, j.situation || hc.situation, ids) || (plays[0] ? { k: 'g', lp: plays[0].t } : undefined);
  return { id, sp, st: state(t.state), clk: t.shortDetail || t.detail || '', away, home, lab, sit,
    box: [box[ids.a] || [], box[ids.b] || []], lu: [lu[ids.a] || null, lu[ids.b] || null], ts: normTS(j, ids), plays, updated: new Date().toISOString() };
}

exports.handler = async (event) => {
  const id = String(((event && event.queryStringParameters) || {}).id || ''), m = id.match(/^([A-Z0-9]+):(\d{3,})$/);
  if (!m || !LEAGUES[m[1]]) return json(400, { error: 'bad id' });
  try {
    const data = await cached('detail1:' + id, TTL.live, async () => {
      const r = await fetch(BASE + LEAGUES[m[1]] + '/summary?event=' + m[2]);
      if (!r.ok) throw new Error('espn ' + r.status);
      return build(m[1], id, await r.json());
    }, { provider: 'espn' });
    return json(200, data);
  } catch (e) { return json(502, { error: 'upstream unavailable', detail: String(e.message || e) }); }
};
