// Team profiles (record, standing, last 5 results, next game, division/conference table) for NFL, NBA, MLB, NHL, WNBA and more.
// Data comes from ESPN's public endpoints (no API key needed). Results are cached in Supabase (see _cache.js).
// Use:  /.netlify/functions/team?sport=NFL&id=12        (ESPN team id, exact)
//       /.netlify/functions/team?sport=NFL&name=Chiefs  (looks the team up by name)
// Add &debug=1 to see exactly what ESPN returned (handy if a field comes back empty).
const { cached, TTL } = require('./_cache');
const { LEAGUES } = require('./sports-data');

const SITE = 'https://site.api.espn.com/apis/site/v2/sports/';
const STAND = 'https://site.api.espn.com/apis/v2/sports/';
const PROFILE_TTL = 900; // seconds: records change after every game, so keep it fresh
const TEAM_Q = { CFB: 'groups=80&limit=500', CBB: 'groups=50&limit=500', CBASE: 'limit=500' };

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=120' },
  body: JSON.stringify(body)
});
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const https = (u) => String(u || '').replace(/^http:/, 'https:');
const clip = (o, n = 2500) => { try { return JSON.stringify(o).slice(0, n); } catch (e) { return ''; } };

async function get(url, ctx) {
  const u = https(url);
  if (!/^https:\/\/[a-z0-9.-]*\.espn\.com\//i.test(u)) throw new Error('blocked host');
  const t0 = Date.now();
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  if (ctx.trace) ctx.trace.push({ url: u, status: r.status, ms: Date.now() - t0 });
  if (!r.ok) { const e = new Error('espn ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
const tryGet = (url, ctx, label) => get(url, ctx).catch((e) => { ctx.warn.push(label + ': ' + e.message); return null; });

// ---- name -> ESPN team id ----
async function findId(sp, name, ctx) {
  const want = norm(name);
  const list = await cached('TEAMIDS:' + sp, TTL.static, async () => {
    const j = await get(SITE + LEAGUES[sp] + '/teams?' + (TEAM_Q[sp] || 'limit=500'), ctx);
    const lg = (((j.sports || [])[0] || {}).leagues || [])[0];
    const items = ((lg && lg.teams) || []).map((x) => x.team).filter(Boolean)
      .map((t) => ({ id: String(t.id), k: [t.shortDisplayName, t.displayName, t.name, t.abbreviation, t.location].map(norm) }));
    if (!items.length) throw new Error('no teams');
    return { items };
  }, { provider: 'espn' });
  const items = list.items || [];
  const hit = items.find((t) => t.k[0] === want) || items.find((t) => t.k[1] === want) || items.find((t) => t.k.includes(want));
  return hit ? hit.id : '';
}

// ---- helpers for ESPN's stat arrays ----
const statMap = (stats) => {
  const m = {};
  (stats || []).forEach((s) => { if (s && s.name) m[String(s.name).toLowerCase()] = s; });
  return m;
};
const dv = (m, ...names) => { for (const n of names) { const s = m[n.toLowerCase()]; if (s && (s.displayValue != null || s.value != null)) return String(s.displayValue != null ? s.displayValue : s.value); } return ''; };
const nv = (m, ...names) => { for (const n of names) { const s = m[n.toLowerCase()]; if (s && s.value != null && !isNaN(+s.value)) return +s.value; } return null; };

// Columns for the standings table, by league family. Only columns ESPN actually sent are shown.
function colsFor(sp) {
  if (sp === 'CFB') return [['CONF', ['vsconf', 'vsconference', 'conf', 'conference', 'conferencerecord']], ['OVR', ['overall', 'total']], ['PCT', ['winpercent']]];
  if (sp === 'NHL') return [['GP', ['gamesplayed']], ['W', ['wins']], ['L', ['losses']], ['OTL', ['otlosses']], ['PTS', ['points']]];
  if (sp === 'NFL' || sp === 'CFL') return [['W', ['wins']], ['L', ['losses']], ['T', ['ties']], ['PCT', ['winpercent']]];
  return [['W', ['wins']], ['L', ['losses']], ['PCT', ['winpercent']], ['GB', ['gamesbehind']], ['STRK', ['streak']]];
}
const confPct = (s) => { const m = String(s || '').match(/(\d+)-(\d+)/); if (!m) return null; const w = +m[1], l = +m[2]; return w + l ? w / (w + l) : 0; };
const sortVal = (sp, m) => (sp === 'NHL' ? nv(m, 'points') : nv(m, 'winpercent'));

function flattenGroups(node, out = [], path = '') {
  if (!node) return out;
  const name = node.name || node.abbreviation || '';
  if (node.standings && Array.isArray(node.standings.entries) && node.standings.entries.length) out.push({ name: name || node.standings.name || '', entries: node.standings.entries, parent: path });
  (node.children || []).forEach((c) => flattenGroups(c, out, node.abbreviation || name));
  return out;
}

function buildGroup(sp, j, id) {
  const groups = flattenGroups(j);
  const mine = groups.filter((g) => g.entries.some((e) => e.team && String(e.team.id) === id));
  if (!mine.length) return null;
  mine.sort((a, b) => a.entries.length - b.entries.length); // smallest group = division
  const g = mine[0];
  const spec = colsFor(sp);
  const rows = g.entries.map((e) => {
    const m = statMap(e.stats), t = e.team || {};
    return { id: String(t.id), n: t.shortDisplayName || t.displayName || t.name || '', ab: t.abbreviation || '', logo: https((t.logos && t.logos[0] && t.logos[0].href) || t.logo || ''),
      sv: sortVal(sp, m), seed: nv(m, 'playoffseed', 'rank'), v: spec.map(([, keys]) => dv(m, ...keys)), you: String(t.id) === id, _m: m };
  });
  rows.sort((a, b) => (a.seed != null && b.seed != null && a.seed !== b.seed ? a.sv === b.sv ? a.seed - b.seed : b.sv - a.sv : (b.sv || 0) - (a.sv || 0)));
  const keep = spec.map((c, i) => rows.some((r) => r.v[i] !== '')); // drop columns ESPN left empty
  const me = rows.find((r) => r.you);
  const extra = me ? me._m : {};
  const group = { name: g.name || g.parent || '', labels: spec.map((c) => c[0]).filter((_, i) => keep[i]),
    rows: rows.map((r, i) => ({ rank: i + 1, id: r.id, n: r.n, ab: r.ab, logo: r.logo, you: r.you, v: r.v.filter((_, k) => keep[k]) })) };
  const stats = [];
  const pf = dv(extra, 'pointsfor', 'avgpointsfor'), pa = dv(extra, 'pointsagainst', 'avgpointsagainst'), diff = dv(extra, 'pointdifferential', 'differential');
  if (pf) stats.push(['Points for', pf]); if (pa) stats.push(['Points against', pa]); if (diff) stats.push(['Differential', diff]);
  return { group, streak: dv(extra, 'streak'), stats };
}

const scoreOf = (c) => { const s = c && c.score; if (s == null) return null; const v = typeof s === 'object' ? (s.displayValue != null ? s.displayValue : s.value) : s; return v == null || v === '' ? null : String(v); };

function buildSchedule(j, id) {
  const done = [], up = [];
  (j && j.events || []).forEach((ev) => {
    const c = (ev.competitions || [])[0]; if (!c) return;
    const me = (c.competitors || []).find((x) => x.team && String(x.team.id) === id), opp = (c.competitors || []).find((x) => x !== me);
    if (!me || !opp) return;
    const type = (c.status && c.status.type) || (ev.status && ev.status.type) || {};
    const o = { date: ev.date || c.date || '', home: me.homeAway === 'home', opp: (opp.team && (opp.team.shortDisplayName || opp.team.displayName)) || '', oppLogo: https(opp.team && ((opp.team.logos && opp.team.logos[0] && opp.team.logos[0].href) || opp.team.logo) || '') };
    if (type.completed) {
      const a = scoreOf(me), b = scoreOf(opp);
      o.result = me.winner ? 'W' : opp.winner ? 'L' : 'T';
      o.score = a != null && b != null ? a + '-' + b : '';
      done.push(o);
    } else if (type.state !== 'in') up.push(o);
  });
  done.sort((a, b) => Date.parse(b.date) - Date.parse(a.date)); up.sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  return { last: done.slice(0, 5), next: up[0] || null };
}

// ---- whole-league standings (the Teams tab): every division/conference as its own table ----
const rowSort = (sp, rows) => rows.sort((a, b) => (a.seed != null && b.seed != null && a.seed !== b.seed ? a.sv === b.sv ? a.seed - b.seed : b.sv - a.sv : (b.sv || 0) - (a.sv || 0)));
function tableOf(sp, g) {
  let spec = colsFor(sp);
  const mk = (sp2, spec2) => g.entries.map((e) => {
    const m = statMap(e.stats), t = e.team || {};
    const v = spec2.map(([, keys]) => dv(m, ...keys));
    return { id: String(t.id), n: t.shortDisplayName || t.displayName || t.name || '', ab: t.abbreviation || '', logo: https((t.logos && t.logos[0] && t.logos[0].href) || t.logo || ''),
      sv: sortVal(sp2, m), cp: sp2 === 'CFB' ? confPct(v[0]) : null, seed: nv(m, 'playoffseed', 'rank'), v };
  });
  let rows = mk(sp, spec);
  if (sp === 'CFB' && !rows.some((r) => r.v[0] !== '' || r.v[1] !== '')) { spec = [['W', ['wins']], ['L', ['losses']], ['PCT', ['winpercent']]]; rows = mk(sp, spec); } // ESPN sent no conference/overall text: plain W-L
  rows = sp === 'CFB' ? rows.sort((a, b) => ((b.cp == null ? -1 : b.cp) - (a.cp == null ? -1 : a.cp)) || ((b.sv || 0) - (a.sv || 0))) : rowSort(sp, rows);
  const keep = spec.map((c, i) => rows.some((r) => r.v[i] !== ''));
  return { name: g.name || '', parent: g.parent || '', labels: spec.map((c) => c[0]).filter((_, i) => keep[i]),
    rows: rows.map((r, i) => ({ rank: i + 1, id: r.id, n: r.n, ab: r.ab, logo: r.logo, v: r.v.filter((_, k) => keep[k]) })) };
}
async function buildStandings(sp, ctx) {
  const path = LEAGUES[sp];
  const q = sp === 'CFB' ? 'group=80&level=3' : 'level=3'; // 80 = FBS
  const j = await get(STAND + path + '/standings?' + q, ctx).catch(() => get(STAND + path + '/standings' + (sp === 'CFB' ? '?group=80' : ''), ctx));
  const rootKey = j.abbreviation || j.name || '';
  const groups = flattenGroups(j).map((g) => { const t = tableOf(sp, g);
    if (sp === 'CFB') { const top = !g.parent || g.parent === rootKey; t.conf = top ? (g.name || '') : g.parent; t.div = top ? '' : (g.name || ''); } // conference + (optional) division
    return t; }).filter((g) => g.rows.length);
  if (!groups.length) throw new Error('standings unavailable'); // do not cache an empty table
  return { sport: sp, groups, updated: new Date().toISOString() };
}

// ---- polls (AP Top 25, Coaches, CFP...) for college sports ----
async function buildRankings(sp, ctx) {
  const j = await get(SITE + LEAGUES[sp] + '/rankings', ctx);
  const polls = (j.rankings || []).map((p) => ({
    name: String(p.name || p.shortName || p.headline || 'Top 25'), short: String(p.shortName || ''),
    ranks: (p.ranks || []).map((r) => { const t = r.team || {}, cur = Number(r.current);
      const prev = r.previous != null && r.previous !== '' && Number(r.previous) > 0 ? Number(r.previous) : null;
      return { rank: cur, prev, id: String(t.id || ''), n: t.shortDisplayName || t.location || t.displayName || t.name || '', ab: t.abbreviation || '',
        rec: String(r.recordSummary || ''), pts: r.points != null && r.points !== '' ? Number(r.points) : null, fp: r.firstPlaceVotes ? Number(r.firstPlaceVotes) : 0 };
    }).filter((r) => r.rank > 0 && r.n).sort((a, b) => a.rank - b.rank).slice(0, 25)
  })).filter((p) => p.ranks.length);
  if (!polls.length) throw new Error('rankings unavailable'); // do not cache an empty poll
  if (ctx.debug) ctx.raw.rankings = clip(j, 3500);
  return { sport: sp, polls, updated: new Date().toISOString() };
}

async function buildProfile(sp, id, ctx) {
  const path = LEAGUES[sp];
  const [td, sc, st] = await Promise.all([
    get(SITE + path + '/teams/' + id, ctx),
    tryGet(SITE + path + '/teams/' + id + '/schedule', ctx, 'schedule'),
    tryGet(STAND + path + '/standings?level=3', ctx, 'standings').then((r) => r || tryGet(STAND + path + '/standings', ctx, 'standings2'))
  ]);
  if (ctx.debug) { ctx.raw.team = clip(td && td.team, 3000); ctx.raw.standings = clip(st, 3000); ctx.raw.schedule = clip(sc, 1500); }
  const t = (td && td.team) || {};
  if (!t.id) throw Object.assign(new Error('team not found'), { status: 404 });
  const items = (t.record && t.record.items) || [];
  const byType = (ty) => items.find((x) => x.type === ty);
  const total = byType('total') || items[0] || {};
  const rec = { summary: total.summary || '', home: (byType('home') || {}).summary || '', road: (byType('road') || {}).summary || '' };
  const sd = st ? buildGroup(sp, st, id) : null;
  const sch = sc ? buildSchedule(sc, id) : { last: [], next: null };
  const tags = [];
  if (t.standingSummary) tags.push(t.standingSummary);
  if (sd && sd.streak) tags.push(sd.streak);
  const stats = [];
  if (rec.home) stats.push(['Home', rec.home]); if (rec.road) stats.push(['Away', rec.road]);
  (sd ? sd.stats : []).forEach((x) => stats.push(x));
  if (!rec.summary && !sd && !sch.last.length) throw new Error('team data unavailable'); // do not cache a half-empty profile
  return { id: String(t.id), sport: sp, name: t.displayName || t.name || '', short: t.shortDisplayName || '', abbr: t.abbreviation || '',
    logo: https((t.logos && t.logos[0] && t.logos[0].href) || ''), color: /^[0-9a-f]{6}$/i.test(t.color || '') ? t.color : '',
    record: rec, tags, stats, group: sd ? sd.group : null, last: sch.last, next: sch.next, updated: new Date().toISOString() };
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const sp = String(q.sport || '').toUpperCase();
  const name = String(q.name || '').trim().slice(0, 80);
  let id = String(q.id || '').trim();
  const debug = q.debug === '1';
  if (!LEAGUES[sp]) return json(400, { error: 'bad sport' });
  if (q.type === 'rankings') {
    const c3 = { debug, trace: debug ? [] : null, warn: [], raw: {} };
    try {
      const data = debug ? await buildRankings(sp, c3) : await cached('RANKINGS:' + sp, 1800, () => buildRankings(sp, c3), { provider: 'espn' });
      return json(200, debug ? { ...data, _trace: c3.trace, _raw: c3.raw } : data);
    } catch (e) { return json(502, { error: 'upstream unavailable', detail: String(e.message || e) }); }
  }
  if (q.type === 'standings') {
    const c2 = { debug, trace: debug ? [] : null, warn: [], raw: {} };
    try {
      const data = debug ? await buildStandings(sp, c2) : await cached('STANDINGS:' + sp, 600, () => buildStandings(sp, c2), { provider: 'espn' });
      return json(200, debug ? { ...data, _trace: c2.trace } : data);
    } catch (e) { return json(502, { error: 'upstream unavailable', detail: String(e.message || e) }); }
  }
  if (id && !/^\d{1,12}$/.test(id)) return json(400, { error: 'bad id' });
  if (!id && !name) return json(400, { error: 'name or id required' });
  const ctx = { debug, trace: debug ? [] : null, warn: [], raw: {} };
  try {
    if (!id) id = await findId(sp, name, ctx);
    if (!id) return json(404, { error: 'team not found', name });
    const data = debug ? await buildProfile(sp, id, ctx) : await cached('TEAM:' + sp + ':' + id, PROFILE_TTL, () => buildProfile(sp, id, { ...ctx, warn: [] }), { provider: 'espn' });
    return json(200, debug ? { ...data, _trace: ctx.trace, _warn: ctx.warn, _raw: ctx.raw } : data);
  } catch (e) {
    const s = e.status;
    return json(s === 404 ? 404 : s === 429 ? 429 : 502, { error: s === 404 ? 'team not found' : s === 429 ? 'ESPN rate limit reached' : 'upstream unavailable', detail: String(e.message || e) });
  }
};

exports._test = { buildStandings, tableOf, buildRankings };
