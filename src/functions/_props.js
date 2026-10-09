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
const HOCKEY = { // ESPN's hockey leader categories -> skater stats (no rebounds in hockey)
  points: [['points', 'Points', 0.5], ['goals', 'Goals', 0.5], ['assists', 'Assists', 0.5]],
  goals: [['goals', 'Goals', 0.5], ['points', 'Points', 0.5]],
  assists: [['assists', 'Assists', 0.5], ['points', 'Points', 0.5]],
};
// ESPN names leader categories differently per sport/endpoint (passingYards vs passingLeader, points vs pointsPerGame...), so match loosely on name + abbreviation.
const MLBH = [['batting.hits', 'Hits', 0.5], ['batting.RBIs', 'RBIs', 0.5], ['batting.homeRuns', 'Home runs', 0.5]];
const MLBP = [['pitching.strikeouts', 'Strikeouts', 4.5], ['pitching.earnedRuns', 'Earned runs', 2.5]];
function famFor(sp, n, ab) {
  const s = (String(n || '') + ' ' + String(ab || '')).toLowerCase(), key = (re) => re.test(s);
  if (sp === 'NHL') { const k = key(/goal/) ? 'goals' : key(/assist/) ? 'assists' : key(/point|pts/) ? 'points' : ''; return { k, fam: HOCKEY[k] }; }
  if (sp === 'MLB' || sp === 'CBASE') return { k: 'mlb', fam: sp === 'MLB' ? (key(/strikeout|era|win|pitch/) ? MLBP : MLBH) : null };
  const k = key(/pass/) ? 'passingYards' : key(/rush/) ? 'rushingYards' : key(/receiv/) ? 'receivingYards' : key(/reb/) ? 'rebounds' : key(/assist|apg/) ? 'assists' : key(/point|pts|ppg/) ? 'points' : '';
  return { k, fam: FAM[k] };
}
// Game-level Higher/Lower (combined score) works for EVERY league, with no player data needed. Line = sportsbook over/under when ESPN lists one, else a typical default.
const TOTAL = { NFL: [44.5, 'points'], CFB: [52.5, 'points'], CFL: [46.5, 'points'], NBA: [224.5, 'points'], WNBA: [163.5, 'points'], CBB: [140.5, 'points'], MLB: [8.5, 'runs'], CBASE: [11.5, 'runs'], NHL: [5.5, 'goals'] };
const totalFor = (g) => { const d = TOTAL[g.sp] || [2.5, 'goals'], ou = g.od && Number(g.od.ou); return { line: ou > 0 ? Math.floor(ou) + 0.5 : d[0], unit: d[1] }; };
const MMA = [['sigStrikes', 'Significant strikes', 44.5], ['takedowns', 'Takedowns', 1.5], ['knockdowns', 'Knockdowns', 0.5], ['submissionAttempts', 'Submission attempts', 0.5]];

// ---- UFC: find a fight's final stats on ESPN (no key needed) ----
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
// ---- Free-plan friendly: every job stays under Cloudflare's 50 outgoing requests per run. ----
// run({mode:'create'}) : posts props for ~1/4 of the leagues per run (rotates, so every league is covered each hour)
// run({mode:'settle'}) : pays out finished games. 1 ESPN call + 1 batched DB call per game.
const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
// prefer games that started 2h+ ago (likely finished); younger ones only fill leftover slots
const pickGames = (map, n) => { const old = [], young = [];
  for (const [gid, ps] of shuffle([...map])) (Date.now() - Date.parse(ps[0].starts_at) > 2 * 36e5 ? old : young).push([gid, ps]);
  return [...old, ...young].slice(0, n); };
const reply = (o) => ({ statusCode: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(o) });

async function create(c, errors, group) {
  const names = ['UFC', 'PFL', ...Object.keys(sports.LEAGUES)];
  const grp = Number.isInteger(group) ? group % 4 : Math.floor(Date.now() / 9e5) % 4;
  const mine = names.filter((_, i) => i % 4 === grp);
  const res = await Promise.allSettled(mine.map((sp) => sports.load(sp)));
  res.forEach((r, i) => { if (r.status === 'rejected') errors.push(mine[i] + ': ' + String((r.reason && r.reason.message) || r.reason)); });
  const items = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const up = items.filter((g) => g.st === 'up' && Date.parse(g.date) - Date.now() < 7 * 864e5), isM = (g) => g.sp === 'UFC' || g.sp === 'PFL';
  // games whose scoreboard had no team leaders: ask the game summary (max 8 per run)
  await Promise.all(up.filter((g) => !isM(g) && !(g.ld && g.ld.length) && sports.LEAGUES[g.sp]).slice(0, 8).map(async (g) => {
    try { const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + sports.LEAGUES[g.sp] + '/summary?event=' + g.id.split(':')[1]); if (!r.ok) return;
      g.ld = ((await r.json()).leaders || []).flatMap((t) => (t.leaders || []).map((l) => { const o = (l.leaders || [])[0]; return o && o.athlete ? { n: l.name, a: l.abbreviation, p: o.athlete.displayName, v: Number(o.value) } : null; }).filter(Boolean));
    } catch (e) { errors.push('leaders ' + g.id + ': ' + String(e.message || e)); } }));
  const rows = new Map();
  for (const g of up) {
    const add = (subject, k, label, line) => { const id = g.id + '|' + k + '|' + nm(subject); rows.set(id, { id, game_id: g.id, sport: g.sp, matchup: g.a + ' vs ' + g.b, subject, stat: k, stat_label: label, line, starts_at: g.date }); };
    if (isM(g)) [g.a, g.b].forEach((f) => MMA.forEach(([k, l, d]) => add(f, k, l, d)));
    else {
      const t = totalFor(g); add('Game total', 'gameTotal', 'Combined ' + t.unit, t.line); // one total-score prop per game, every league
      for (const l of g.ld || []) { const f = famFor(g.sp, l.n, l.a); for (const [k, lab, d] of f.fam || []) add(l.p, k, lab, BB.has(g.sp) && k === f.k && l.v > 0 && l.v < 60 ? Math.floor(l.v) + 0.5 : d); }
    }
  }
  const all = [...rows.values()];
  for (let i = 0; i < all.length; i += 500) { const r = await c.from('props').upsert(all.slice(i, i + 500), { onConflict: 'id', ignoreDuplicates: true }); if (r.error) { errors.push('props: ' + r.error.message); break; } }
  return { mode: 'create', group: grp, leagues: mine, upcoming_games: up.length, created: all.length };
}

async function settle(c, errors) {
  const op = (await c.from('props').select('id,game_id,subject,stat,starts_at').eq('status', 'open').lt('starts_at', new Date().toISOString()).limit(2000)).data || [];
  const team = new Map(), mma = new Map();
  for (const p of op) { const m = /^(UFC|PFL):\d+$/.test(p.game_id) ? mma : /^[A-Z0-9]+:\d+$/.test(p.game_id) ? team : null; if (!m) continue; if (!m.has(p.game_id)) m.set(p.game_id, []); m.get(p.game_id).push(p); }
  let settled = 0, voided = 0, waiting = 0, paid = 0;
  const doSettle = async (items) => { if (!items.length) return; const x = await c.rpc('settle_props', { p_items: items }); if (x.error) errors.push('settle_props: ' + x.error.message); else { settled += items.length; paid += Number(x.data) || 0; } };
  const doVoid = async (ids) => { if (!ids.length) return; const x = await c.rpc('void_props', { p_ids: ids }); if (x.error) errors.push('void_props: ' + x.error.message); else voided += ids.length; };
  // team sports: 8 games per run (college football has a lot of games)
  for (const [gid, ps] of pickGames(team, 8)) {
    const m = /^([A-Z0-9]+):(\d+)$/.exec(gid), path = m && sports.LEAGUES[m[1]]; if (!path) continue;
    try {
      const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + path + '/summary?event=' + m[2]); if (!r.ok) { waiting++; continue; }
      const j = await r.json(); if (!(((j.header || {}).competitions || [])[0] || {}).status?.type?.completed) { waiting++; continue; }
      const box = {}, seen = new Set();
      for (const t of (j.boxscore || {}).players || []) for (const s of t.statistics || []) { const ks = s.keys || s.names || [];
        for (const a of s.athletes || []) { const n = nm((a.athlete || {}).displayName || ''); if (a.didNotPlay || !(a.stats || []).length) continue; seen.add(n); ks.forEach((k, i) => { const v = parseFloat((a.stats || [])[i]); if (!isNaN(v)) { (box[k] = box[k] || {})[n] = v; if (s.name) (box[s.name + '.' + k] = box[s.name + '.' + k] || {})[n] = v; } }); } }
      if (!box.points && box.goals && box.assists) { box.points = {}; for (const n of new Set([...Object.keys(box.goals), ...Object.keys(box.assists)])) box.points[n] = (box.goals[n] || 0) + (box.assists[n] || 0); } // hockey box scores have no points column
      const pay = [], dnp = [];
      const cs = ((((j.header || {}).competitions || [])[0] || {}).competitors || []), tot = cs.length === 2 && cs.every((x) => x.score !== undefined && x.score !== '') ? cs.reduce((a, x) => a + (Number(x.score) || 0), 0) : null;
      for (const p of ps) { const n = nm(p.subject);
        if (p.stat === 'gameTotal') { if (tot === null) errors.push(gid + ': no final score found (left open)'); else pay.push({ id: p.id, actual: tot }); continue; }
        if (!box[p.stat]) { errors.push(gid + ': ESPN box score has no "' + p.stat + '" stat (left open)'); continue; } // never guess a 0
        const v = box[p.stat][n] !== undefined ? box[p.stat][n] : seen.has(n) ? 0 : null;
        if (v === null) dnp.push(p.id); else pay.push({ id: p.id, actual: v }); }
      await doSettle(pay); await doVoid(dnp);
    } catch (e) { errors.push(gid + ': ' + String(e.message || e)); }
  }
  // UFC: 2 fights per run
  for (const [gid, ps] of pickGames(mma, 2)) {
    try {
      const r = await mmaActuals(gid, [...new Set(ps.map((p) => p.subject))]);
      if (!r.done) { waiting++; continue; }
      const pay = [];
      for (const p of ps) { const v = r.actual[nm(p.subject)] && r.actual[nm(p.subject)][p.stat]; if (v !== undefined && v !== null) pay.push({ id: p.id, actual: v }); }
      await doSettle(pay);
    } catch (e) { errors.push(gid + ': ' + String(e.message || e)); }
  }
  // anything still open 5 days after it started (cancelled, no data) is voided so picks never get stuck
  await doVoid(op.filter((p) => Date.now() - Date.parse(p.starts_at) > 5 * 864e5).map((p) => p.id));
  return { mode: 'settle', open_started: op.length, games_waiting_or_unfinished: waiting, props_settled: settled, picks_paid: paid, voided };
}

exports.run = async (opts = {}) => {
  const c = db(); if (!c) return { statusCode: 500, body: JSON.stringify({ error: db.why() }) };
  const errors = [];
  try {
    const out = opts.mode === 'create' ? await create(c, errors, opts.group) : await settle(c, errors);
    if (errors.length) console.error('props errors', errors);
    return reply({ ...out, errors });
  } catch (e) { return reply({ error: String((e && e.message) || e), errors }); }
};
