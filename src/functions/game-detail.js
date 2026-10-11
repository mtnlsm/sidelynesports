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
  const min = l.startsWith('baseball') ? 9 : l.startsWith('hockey') ? 3 : l.includes('college') && l.startsWith('basketball') ? 2 : 4;
  const len = Math.max(n, min), out = [];
  for (let i = 0; i < len; i++) {
    if (l.startsWith('baseball')) out.push(String(i + 1));
    else if (l.startsWith('hockey')) out.push(i < 3 ? 'P' + (i + 1) : i === 3 ? 'OT' : 'SO');
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

// Lineups: rosters if ESPN sends them, otherwise built from the box score (MLB batting order, NBA/NHL starters).
function normLineups(sp, j, box) {
  const out = {};
  if (Array.isArray(j.rosters) && j.rosters.length) {
    for (const r of j.rosters) {
      const id = String((r.team || {}).id);
      const list = (r.roster || []).map((p) => ({ n: nm(p.athlete), i: pic(sp, p.athlete), jn: String(p.jersey || (p.athlete && p.athlete.jersey) || ''), pos: posOf(p), st: !!p.starter }));
      out[id] = { f: r.formation || '', s: list.filter((p) => p.st), b: list.filter((p) => !p.st) };
    }
    return out;
  }
  const slim = (r) => ({ n: r.n, i: r.i, jn: r.jn, pos: r.pos, bo: r.bo, st: r.st });
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
  const t = (hc.status && hc.status.type) || {}, box = normBox(sp, j), lu = normLineups(sp, j, box), plays = normPlays(j);
  const sit = normSit(sp, j.situation || hc.situation, ids) || (plays[0] ? { k: 'g', lp: plays[0].t } : undefined);
  return { id, sp, st: state(t.state), clk: t.shortDetail || t.detail || '', away, home, lab, sit,
    box: [box[ids.a] || [], box[ids.b] || []], lu: [lu[ids.a] || null, lu[ids.b] || null], ts: normTS(j, ids), plays, updated: new Date().toISOString() };
}


// ---------------------------------------------------------------------------------------------------------------------
// UFC / PFL fights: per-fighter strike + grappling stats and round/clock.
// Call: /game-detail?id=UFC:401234567&evi=600012345   (id = fight id, evi = event id; both are on every UFC game in the feed)
// Source: ESPN core API  /events/{evi}/competitions/{fight}/competitors/{fighter}/statistics  (falls back to the site summary).
// Add &debug=1 to see the raw stat names ESPN sent, if a row ever shows up empty.
// ---------------------------------------------------------------------------------------------------------------------
const MMA = new Set(['UFC', 'PFL']);
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma/leagues/';
const jget = async (u) => { const r = await fetch(String(u).replace(/^http:/, 'https:')); if (!r.ok) throw new Error('espn ' + r.status); return r.json(); };
const key = (n) => String(n || '').toLowerCase().replace(/[^a-z]/g, '');

// Walk any ESPN stats payload and collect { normalizedName: {v, t} } (works for splits.categories[].stats[] and flat lists alike).
function flatStats(j) {
  const m = {};
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    if (typeof o.name === 'string' && (o.value !== undefined || o.displayValue !== undefined) && !o.stats && !o.categories) {
      const k = key(o.name); if (k && !(k in m)) m[k] = { v: Number(o.value), t: o.displayValue != null ? String(o.displayValue) : '' };
    }
    for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') walk(o[k]);
  };
  walk(j); return m;
}
const pick = (m, re) => { const k = Object.keys(m).find((x) => re.test(x)); return k ? m[k] : null; };
const num = (x) => (x && Number.isFinite(x.v) ? x.v : x && /^\d+(\.\d+)?$/.test(x.t) ? Number(x.t) : null);
// "34 of 61" / "34/61" -> [34, 61]
const ofPair = (x) => { const t = x && x.t ? x.t.match(/(\d+)\s*(?:of|\/)\s*(\d+)/i) : null; return t ? [Number(t[1]), Number(t[2])] : null; };
const mmss = (sec) => Math.floor(sec / 60) + ':' + String(Math.round(sec % 60)).padStart(2, '0');

// One landed/attempted stat: { n: landed, d: attempted|undefined }
function pair(m, landRe, attRe) {
  const L = pick(m, landRe), A = attRe ? pick(m, attRe) : null;
  const p = ofPair(L) || ofPair(A);
  const n = p ? p[0] : num(L), d = p ? p[1] : num(A);
  return n == null ? null : d != null && d >= n ? { n, d } : { n };
}
function fighterRows(m) {
  const ctl = pick(m, /^(timeincontrol|controltime|control|ctrl|timecontrol)/);
  let ct = null; if (ctl) { const sec = Number.isFinite(ctl.v) ? ctl.v : null; ct = /:/.test(ctl.t) ? { n: sec != null ? sec : 0, t: ctl.t } : sec != null ? { n: sec, t: mmss(sec) } : null; }
  return {
    sig: pair(m, /^sig(nificant)?strikes?(landed|made|thrown)?$/, /^sig(nificant)?strikes?(attempted|attempts)$/),
    tot: pair(m, /^(total)?strikes?(landed|made)$/, /^(total)?strikes?(attempted|attempts)$/),
    td: pair(m, /^takedowns?(landed|completed|made)?$/, /^takedowns?(attempted|attempts)$/),
    kd: pair(m, /^knock?downs?$/),
    sub: pair(m, /^submissions?(attempted|attempts)?$|^subattempts?$/),
    rev: pair(m, /^reversals?$/),
    ctl: ct,
    head: pair(m, /^(sig)?headstrikes?(landed)?$|^head$/), body: pair(m, /^(sig)?bodystrikes?(landed)?$|^body$/), leg: pair(m, /^(sig)?legstrikes?(landed)?$|^leg$/),
    dist: pair(m, /^(sig)?distancestrikes?(landed)?$|^distance$/), clinch: pair(m, /^(sig)?clinchstrikes?(landed)?$|^clinch$/), grd: pair(m, /^(sig)?groundstrikes?(landed)?$|^ground$/)
  };
}
const ROWS = [['sig', 'Significant strikes', 'main'], ['tot', 'Total strikes', 'main'], ['td', 'Takedowns', 'main'], ['kd', 'Knockdowns', 'main'], ['sub', 'Submission attempts', 'main'], ['rev', 'Reversals', 'main'], ['ctl', 'Control time', 'main'],
  ['head', 'Head', 'tgt'], ['body', 'Body', 'tgt'], ['leg', 'Leg', 'tgt'], ['dist', 'Distance', 'pos'], ['clinch', 'Clinch', 'pos'], ['grd', 'Ground', 'pos']];

async function buildMma(sp, id, evi, debug) {
  const m = id.match(/:(\d+)$/), cid = m && m[1], base = CORE + sp.toLowerCase() + '/events/' + evi + '/competitions/' + cid;
  const [comp, status] = await Promise.all([jget(base), jget(base + '/status').catch(() => null)]);
  const fs = (comp.competitors || []).slice().sort((x, y) => (x.order || 0) - (y.order || 0));
  if (fs.length < 2) throw new Error('no fighters');
  let sts = await Promise.all(fs.slice(0, 2).map((f) => jget(base + '/competitors/' + f.id + '/statistics').then(flatStats).catch(() => ({}))));
  if (!sts.some((x) => Object.keys(x).length)) { // fallback: site summary
    try {
      const sm = await jget('https://site.api.espn.com/apis/site/v2/sports/mma/' + sp.toLowerCase() + '/summary?event=' + evi);
      const hc = ((sm.header && sm.header.competitions) || []).find((c) => String(c.id) === cid) || ((sm.competitions || []).find((c) => String(c.id) === cid));
      if (hc) sts = fs.slice(0, 2).map((f) => flatStats((hc.competitors || []).find((c) => String(c.id) === String(f.id)) || {}));
    } catch (e) {}
  }
  const A = fighterRows(sts[0]), B = fighterRows(sts[1]);
  const stats = ROWS.map(([k, l, grp]) => ({ k, l, g: grp, a: A[k], b: B[k] })).filter((r) => r.a || r.b)
    .map((r) => ({ ...r, a: r.a || { n: 0 }, b: r.b || { n: 0 } }));
  const t = (status && status.type) || {}, res = status && status.result;
  const out = { id, sp, mma: 1, st: state(t.state || 'pre'), clk: t.shortDetail || t.detail || '',
    rd: status && status.period ? Number(status.period) : 0, ck: (status && status.displayClock) || '',
    res: res ? String(res.displayName || res.shortDisplayName || res.description || res.name || '').slice(0, 60) : '',
    win: fs[0].winner ? 0 : fs[1].winner ? 1 : -1, stats, updated: new Date().toISOString() };
  if (debug) out.debug = { statNames: sts.map((x) => Object.keys(x)), sample: sts.map((x) => Object.fromEntries(Object.entries(x).slice(0, 8))) };
  return out;
}

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const id = String(q.id || ''), m = id.match(/^([A-Z0-9]+):(\d{3,})$/);
  if (m && MMA.has(m[1])) { // UFC / PFL fight stats
    const evi = String(q.evi || '');
    if (!/^\d{3,}$/.test(evi)) return json(400, { error: 'missing event id (evi)' });
    try {
      if (q.debug) return json(200, await buildMma(m[1], id, evi, true));
      return json(200, await cached('detail1:' + id, TTL.live, () => buildMma(m[1], id, evi), { provider: 'espn' }));
    } catch (e) { return json(502, { error: 'upstream unavailable', detail: String(e.message || e) }); }
  }
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
