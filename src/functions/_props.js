// Higher/Lower props. 1) creates props for upcoming games (linked by game_id), 2) settles them from ESPN box scores, 3) voids stale ones.
// Stat ids are ESPN box-score keys, so the same id is used to create and to settle. Lines are Sidelyne estimates, not sportsbook lines.
const { db } = require('./_cache');
const sports = require('./sports-data');
const nm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');
const BB = new Set(['NBA', 'WNBA', 'CBB']);
// ESPN team-leader category -> the stats we offer for that player: [key, label, default line]
const FAM = {
  passingYards: [['passingYards', 'Passing yards', 229.5], ['passingTouchdowns', 'Passing TDs', 1.5], ['interceptions', 'Interceptions thrown', 0.5]],
  rushingYards: [['rushingYards', 'Rushing yards', 49.5], ['rushingAttempts', 'Rushing attempts', 12.5], ['rushingTouchdowns', 'Rushing TDs', 0.5]],
  receivingYards: [['receivingYards', 'Receiving yards', 49.5], ['receptions', 'Receptions', 4.5], ['receivingTouchdowns', 'Receiving TDs', 0.5]],
  points: [['points', 'Points', 19.5], ['rebounds', 'Rebounds', 5.5], ['assists', 'Assists', 4.5]],
  rebounds: [['rebounds', 'Rebounds', 6.5], ['points', 'Points', 12.5]],
  assists: [['assists', 'Assists', 4.5], ['points', 'Points', 14.5]],
};
const MMA = [['sigStrikes', 'Significant strikes', 44.5], ['takedowns', 'Takedowns', 1.5], ['knockdowns', 'Knockdowns', 0.5], ['submissionAttempts', 'Submission attempts', 0.5]];

// ---- UFC / PFL: find a fight's final stats on ESPN (no key needed) ----
const CORE = 'https://sports.core.api.espn.com/v2/sports/mma';
const SEARCH = 'https://site.web.api.espn.com/apis/common/v3/search';
const getJ = async (url) => {
  const u = String(url).replace(/^http:/, 'https:');
  if (!/^https:\/\/[a-z0-9.-]*\.espn\.com\//i.test(u)) throw new Error('blocked host');
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('espn ' + r.status + ' ' + u.replace(/\?.*/, '').slice(-60));
  return r.json();
};
// walks any ESPN stats JSON and collects every { name, value } pair it can find
const flat = (o, out = {}) => {
  if (Array.isArray(o)) o.forEach((x) => flat(x, out));
  else if (o && typeof o === 'object') {
    if (o.name && o.value !== undefined && o.value !== null && Number.isFinite(Number(o.value))) out[String(o.name).toLowerCase()] = Number(o.value);
    for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') flat(o[k], out);
  }
  return out;
};
const pickStat = (st, re, bad) => Object.keys(st).filter((n) => re.test(n) && !bad.test(n)).sort((a, b) => /land/.test(b) - /land/.test(a)).map((k) => st[k])[0];
function mmaStats(st) {
  const bad = /attempt|acc|pct|percent|absorb|per|def|rate|ratio|against/;
  const sig = pickStat(st, /^(sig|significant).*strike/, bad);
  if (sig === undefined) return null; // not the real fight stats (yet)
  const z = (v) => (v === undefined ? 0 : v);
  return { sigStrikes: sig, takedowns: z(pickStat(st, /take.?down/, bad)), knockdowns: z(pickStat(st, /knock.?down/, bad)), submissionAttempts: z(pickStat(st, /sub.*att/, /against|per|rate|def|acc|pct/)) };
}
// gameId like "UFC:401706833", subjects = the two fighters' names (as stored on the props)
async function mmaActuals(gameId, subjects) {
  if (subjects.length !== 2) throw new Error('expected 2 fighters');
  const comp = gameId.split(':')[1];
  const j = await getJ(`${SEARCH}?region=us&lang=en&limit=10&type=player&query=${encodeURIComponent(subjects[0])}`);
  let list = j.items || []; if (!list.length && Array.isArray(j.results)) list = j.results.flatMap((x) => x.contents || x.items || []);
  const hit = list.find((c) => nm(c.displayName || c.name || '') === nm(subjects[0]));
  const mine = hit && String(hit.id || (String(hit.uid || '').match(/~a:(\d+)/) || [])[1] || '');
  if (!mine || !/^\d+$/.test(mine)) throw new Error('could not find ' + subjects[0] + ' on ESPN');
  const log = await getJ(`${CORE}/athletes/${mine}/eventlog?lang=en&region=us&limit=100`);
  const items = (log && ((log.events && log.events.items) || log.items)) || [];
  const re = new RegExp('/competitions/' + comp + '(\\?|$)');
  const it = items.find((x) => x.competition && re.test(x.competition.$ref || ''));
  if (!it) throw new Error('fight ' + comp + ' not in ' + subjects[0] + "'s fight log");
  const base = it.competition.$ref.replace(/^http:/, 'https:').split('?')[0];
  const [cj, sj] = await Promise.all([getJ(base + '?lang=en&region=us'), getJ(base + '/status?lang=en&region=us')]);
  if (!(sj && sj.type && sj.type.completed === true)) return { done: false };
  const other = (cj.competitors || []).map((x) => String(x.id)).find((i) => i !== mine);
  if (!other) throw new Error('could not find the opponent');
  const raw = await Promise.all([mine, other].map((i) => getJ(`${base}/competitors/${i}/statistics?lang=en&region=us`).then(flat)));
  const a = mmaStats(raw[0]), b = mmaStats(raw[1]);
  if (!a || !b) return { done: true, actual: {}, statNames: raw.map((x) => Object.keys(x)), note: 'fight is over but ESPN has no stats for it yet' };
  return { done: true, actual: { [nm(subjects[0])]: a, [nm(subjects[1])]: b }, statNames: raw.map((x) => Object.keys(x)) };
}
// Open /.netlify/functions/props?mma=UFC:401706833 to see what the job would use for that fight (changes nothing).
exports.mmaCheck = async (gameId) => {
  const c = db(); if (!c) return { statusCode: 500, body: JSON.stringify({ error: db.why() }) };
  try {
    const { data } = await c.from('props').select('subject,status').eq('game_id', gameId);
    const subjects = [...new Set((data || []).map((x) => x.subject))];
    return { statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ gameId, subjects, ...(await mmaActuals(gameId, subjects)) }) };
  } catch (e) { return { statusCode: 502, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ error: String((e && e.message) || e) }) }; }
};
exports.run = async () => {
  const c = db(); if (!c) return { statusCode: 500, body: JSON.stringify({ error: db.why() }) };
  const errors = [], res = await sports.handler({ queryStringParameters: { sport: 'ALL', type: 'games' } });
  let items = []; try { items = JSON.parse(res.body).items || []; } catch (e) {}
  // 1) create. If the scoreboard had no team leaders for a game, ask ESPN's game summary for them.
  const up = items.filter((g) => g.st === 'up' && Date.parse(g.date) - Date.now() < 7 * 864e5), isM = (g) => g.sp === 'UFC' || g.sp === 'PFL';
  await Promise.all(up.filter((g) => !isM(g) && !(g.ld && g.ld.length) && sports.LEAGUES[g.sp]).slice(0, 12).map(async (g) => {
    try { const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + sports.LEAGUES[g.sp] + '/summary?event=' + g.id.split(':')[1]); if (!r.ok) return;
      g.ld = ((await r.json()).leaders || []).flatMap((t) => (t.leaders || []).map((l) => { const o = (l.leaders || [])[0]; return o && o.athlete ? { n: l.name, p: o.athlete.displayName, v: Number(o.value) } : null; }).filter(Boolean));
    } catch (e) { errors.push('leaders ' + g.id + ': ' + String(e.message || e)); } }));
  const diag = { env: { service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY, db: db.mode || '?' }, upcoming_games: up.length, mma_games: up.filter(isM).length, team_games_with_players: up.filter((g) => !isM(g) && g.ld && g.ld.length).length };
  const rows = new Map();
  for (const g of up) {
    const add = (subject, k, label, line) => { const id = g.id + '|' + k + '|' + nm(subject); rows.set(id, { id, game_id: g.id, sport: g.sp, matchup: g.a + ' vs ' + g.b, subject, stat: k, stat_label: label, line, starts_at: g.date }); };
    if (g.sp === 'UFC' || g.sp === 'PFL') [g.a, g.b].forEach((f) => MMA.forEach(([k, l, d]) => add(f, k, l, d)));
    else for (const l of g.ld || []) for (const [k, lab, d] of FAM[l.n] || []) add(l.p, k, lab, BB.has(g.sp) && k === l.n && l.v > 0 && l.v < 60 ? Math.floor(l.v) + 0.5 : d);
  }
  const all = [...rows.values()];
  for (let i = 0; i < all.length; i += 200) { const r = await c.from('props').upsert(all.slice(i, i + 200), { onConflict: 'id', ignoreDuplicates: true }); if (r.error) { errors.push('props: ' + r.error.message); break; } }
  // 2) settle from box scores (team sports; UFC/PFL are settled with settle_prop() in SQL)
  const op = (await c.from('props').select('id,game_id,subject,stat,starts_at').eq('status', 'open').lt('starts_at', new Date().toISOString()).limit(2000)).data || [];
  const by = new Map(); for (const p of op) { if (/^(UFC|PFL):/.test(p.game_id)) continue; if (!by.has(p.game_id)) by.set(p.game_id, []); by.get(p.game_id).push(p); }
  let settled = 0, voided = 0;
  for (const [gid, ps] of [...by].slice(0, 6)) {
    const m = /^([A-Z0-9]+):(\d+)$/.exec(gid), path = m && sports.LEAGUES[m[1]]; if (!path) continue;
    try {
      const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + path + '/summary?event=' + m[2]); if (!r.ok) continue;
      const j = await r.json(); if (!(((j.header || {}).competitions || [])[0] || {}).status?.type?.completed) continue;
      const box = {}, seen = new Set();
      for (const t of (j.boxscore || {}).players || []) for (const s of t.statistics || []) { const ks = s.keys || s.names || [];
        for (const a of s.athletes || []) { const n = nm((a.athlete || {}).displayName || ''); if (a.didNotPlay || !(a.stats || []).length) continue; seen.add(n); ks.forEach((k, i) => { const v = parseFloat((a.stats || [])[i]); if (!isNaN(v)) (box[k] = box[k] || {})[n] = v; }); } }
      for (const p of ps) { const n = nm(p.subject), v = box[p.stat] && box[p.stat][n] !== undefined ? box[p.stat][n] : seen.has(n) ? 0 : null; if (v === null) { const y = await c.rpc('void_prop', { p_prop: p.id }); if (!y.error) voided++; continue; } // player did not play: refund
        const x = await c.rpc('settle_prop', { p_prop: p.id, p_actual: v }); if (x.error) errors.push(p.id + ': ' + x.error.message); else settled++; }
    } catch (e) { errors.push(gid + ': ' + String(e.message || e)); }
  }
  // 2b) UFC/PFL: look up the finished fight's stats on ESPN and settle (2 fights per run keeps each run short)
  let mmaSettled = 0;
  const mg = new Map(); for (const p of op) if (/^(UFC|PFL):\d+$/.test(p.game_id)) { if (!mg.has(p.game_id)) mg.set(p.game_id, []); mg.get(p.game_id).push(p); }
  for (const [gid, ps] of [...mg].sort(() => Math.random() - 0.5).slice(0, 2)) {
    try {
      const r = await mmaActuals(gid, [...new Set(ps.map((p) => p.subject))]);
      if (!r.done) continue;
      for (const p of ps) {
        const v = r.actual[nm(p.subject)] && r.actual[nm(p.subject)][p.stat]; if (v === undefined || v === null) continue;
        const x = await c.rpc('settle_prop', { p_prop: p.id, p_actual: v }); if (x.error) errors.push(p.id + ': ' + x.error.message); else mmaSettled++;
      }
    } catch (e) { errors.push(gid + ': ' + String(e.message || e)); }
  }
  // 3) anything still open 5 days after it started (DNP, cancelled, no data) is voided so picks never get stuck
  for (const p of op.filter((p) => Date.now() - Date.parse(p.starts_at) > 5 * 864e5)) { const x = await c.rpc('void_prop', { p_prop: p.id }); if (!x.error) voided++; }
  if (errors.length) console.error('props errors', errors);
  return { statusCode: 200, body: JSON.stringify({ created: all.length, ...diag, settled: settled + mmaSettled, voided, errors }) };
};
