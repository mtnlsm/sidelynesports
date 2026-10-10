// Player + team stats (passing yards, tackles, total yards, points per game, etc) for NFL, NBA, MLB, NHL and college football.
// Data comes from ESPN's public stats endpoints (no API key). Results are cached (see _cache.js) so ESPN is only asked a few times an hour.
// Use:  /.netlify/functions/stats?sport=NFL&kind=players&id=pass     (one leaderboard)
//       /.netlify/functions/stats?sport=NFL&kind=teams               (every team, every stat group)
//       /.netlify/functions/stats?sport=NFL&kind=menu                (the leaderboards available for that league)
// Add &debug=1 to see what ESPN sent back (handy if a column ever comes back empty).
const { cached } = require('./_cache');
const { LEAGUES } = require('./sports-data');

const API = 'https://site.web.api.espn.com/apis/common/v3/sports/';
const TTL_PLAYERS = 1800, TTL_TEAMS = 3600; // seconds

// Each leaderboard: id, label, stat group (cat), stat to sort by, direction, and the columns we prefer to show (ESPN stat names, in order).
const L = (id, label, cat, sort, pref, dir) => ({ id, label, cat, sort, pref, dir: dir || 'desc' });
const BOARDS = {
  NFL: [
    L('pass', 'Passing', 'passing', 'passingYards', ['passingYards', 'completions', 'passingAttempts', 'completionPct', 'passingTouchdowns', 'interceptions', 'QBRating']),
    L('rush', 'Rushing', 'rushing', 'rushingYards', ['rushingYards', 'rushingAttempts', 'yardsPerRushAttempt', 'rushingTouchdowns', 'longRushing']),
    L('rec', 'Receiving', 'receiving', 'receivingYards', ['receivingYards', 'receptions', 'receivingTargets', 'yardsPerReception', 'receivingTouchdowns', 'longReception']),
    L('tkl', 'Tackles', 'defensive', 'totalTackles', ['totalTackles', 'soloTackles', 'assistTackles', 'sacks', 'tacklesForLoss', 'passesDefended']),
    L('sck', 'Sacks', 'defensive', 'sacks', ['sacks', 'totalTackles', 'tacklesForLoss', 'QBHits', 'passesDefended']),
    L('int', 'Interceptions', 'defensiveInterceptions', 'interceptions', ['interceptions', 'interceptionYards', 'interceptionTouchdowns', 'longInterception'])
  ],
  CFB: [
    L('pass', 'Passing', 'passing', 'passingYards', ['passingYards', 'completions', 'passingAttempts', 'completionPct', 'passingTouchdowns', 'interceptions']),
    L('rush', 'Rushing', 'rushing', 'rushingYards', ['rushingYards', 'rushingAttempts', 'yardsPerRushAttempt', 'rushingTouchdowns']),
    L('rec', 'Receiving', 'receiving', 'receivingYards', ['receivingYards', 'receptions', 'yardsPerReception', 'receivingTouchdowns']),
    L('tkl', 'Tackles', 'defensive', 'totalTackles', ['totalTackles', 'soloTackles', 'sacks', 'tacklesForLoss']),
    L('sck', 'Sacks', 'defensive', 'sacks', ['sacks', 'totalTackles', 'tacklesForLoss'])
  ],
  NBA: [
    L('pts', 'Points', 'offensive', 'avgPoints', ['avgPoints', 'gamesPlayed', 'avgMinutes', 'fieldGoalPct', 'threePointFieldGoalPct', 'freeThrowPct']),
    L('reb', 'Rebounds', 'general', 'avgRebounds', ['avgRebounds', 'avgOffensiveRebounds', 'avgDefensiveRebounds', 'gamesPlayed', 'avgMinutes']),
    L('ast', 'Assists', 'offensive', 'avgAssists', ['avgAssists', 'avgTurnovers', 'assistTurnoverRatio', 'gamesPlayed', 'avgMinutes']),
    L('stl', 'Steals', 'defensive', 'avgSteals', ['avgSteals', 'avgBlocks', 'gamesPlayed', 'avgMinutes']),
    L('blk', 'Blocks', 'defensive', 'avgBlocks', ['avgBlocks', 'avgSteals', 'gamesPlayed', 'avgMinutes'])
  ],
  MLB: [
    L('hr', 'Home runs', 'batting', 'homeRuns', ['homeRuns', 'RBIs', 'hits', 'avg', 'OPS', 'stolenBases']),
    L('avg', 'Batting avg', 'batting', 'avg', ['avg', 'hits', 'homeRuns', 'RBIs', 'OBP', 'OPS']),
    L('rbi', 'RBIs', 'batting', 'RBIs', ['RBIs', 'homeRuns', 'hits', 'avg', 'OPS']),
    L('k', 'Strikeouts', 'pitching', 'strikeouts', ['strikeouts', 'wins', 'losses', 'ERA', 'inningsPitched', 'WHIP']),
    L('w', 'Pitching wins', 'pitching', 'wins', ['wins', 'losses', 'ERA', 'strikeouts', 'inningsPitched', 'saves'])
  ],
  NHL: [
    L('pts', 'Points', 'offensive', 'points', ['points', 'goals', 'assists', 'plusMinus', 'shotsTotal', 'gamesPlayed']),
    L('g', 'Goals', 'offensive', 'goals', ['goals', 'assists', 'points', 'shotsTotal', 'shootingPct']),
    L('a', 'Assists', 'offensive', 'assists', ['assists', 'goals', 'points', 'plusMinus'])
  ]
};
// Team table: groups we try to show (ESPN category name -> label). Anything ESPN sends that is not in this list is shown last under its own name.
const TEAM_ORDER = ['overview', 'scoring', 'passing', 'rushing', 'receiving', 'defensive', 'defensiveInterceptions', 'general', 'miscellaneous', 'offensive', 'batting', 'pitching', 'fielding', 'goaltending'];

const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=120' }, body: JSON.stringify(body) });
const https = (u) => String(u || '').replace(/^http:/, 'https:');
const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const cap = (s) => String(s || '').replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()).trim();

async function get(url) {
  const u = https(url);
  if (!/^https:\/\/[a-z0-9.-]*\.espn\.com\//i.test(u)) throw new Error('blocked host');
  const r = await fetch(u, { headers: { accept: 'application/json', 'user-agent': 'Mozilla/5.0 (compatible; SidelineSports/1.0)' }, cf: { cacheTtl: 0, cacheEverything: false } });
  if (!r.ok) throw new Error('espn ' + r.status);
  return r.json();
}
const seg = (sp) => LEAGUES[sp]; // e.g. 'football/nfl'

// ESPN stat group on the top level: { name, names:[], labels:[], displayNames:[] }. The same group on a player/team: { name, values:[], totals:[] }.
function groupInfo(j, cat) {
  const g = (j.categories || []).find((c) => norm(c.name) === norm(cat));
  if (!g) return null;
  const names = (g.names || []).map(String);
  return { names, labels: (g.labels || g.abbreviations || []).map(String), long: (g.displayNames || []).map(String) };
}
const valsOf = (c) => (c && (c.totals || c.values)) || [];

// Pick the columns to show: preferred ones that exist, else the first few ESPN sent.
function pickCols(info, pref) {
  let idx = [];
  for (const p of pref || []) { const i = info.names.findIndex((n) => norm(n) === norm(p)); if (i >= 0 && !idx.includes(i)) idx.push(i); }
  if (idx.length < 3) idx = info.names.map((_, i) => i).slice(0, 8);
  return idx.slice(0, 7).map((i) => ({ i, k: info.names[i], l: info.labels[i] || cap(info.names[i]), t: info.long[i] || cap(info.names[i]) }));
}

async function players(sp, id) {
  const b = (BOARDS[sp] || []).find((x) => x.id === id);
  if (!b) throw new Error('bad leaderboard');
  const q = `region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=25&sort=${encodeURIComponent(b.cat + '.' + b.sort + ':' + b.dir)}`;
  const j = await get(`${API}${seg(sp)}/statistics/byathlete?${q}`);
  const info = groupInfo(j, b.cat);
  if (!info) throw new Error('stat group not found: ' + b.cat);
  const cols = pickCols(info, b.pref), sortCol = Math.max(0, cols.findIndex((c) => norm(c.k) === norm(b.sort)));
  const rows = (j.athletes || []).map((x) => {
    const a = x.athlete || {}, g = (x.categories || []).find((c) => norm(c.name) === norm(b.cat)), v = valsOf(g);
    if (!g || !v.length) return null;
    const h = a.headshot, img = https(typeof h === 'string' ? h : (h && h.href) || '');
    return { id: String(a.id || ''), n: a.displayName || a.shortName || '', t: a.teamShortName || a.teamName || (a.team && (a.team.abbreviation || a.team.displayName)) || '', pos: (a.position && (a.position.abbreviation || a.position.displayName)) || a.positionAbbreviation || '', img,
      v: cols.map((c) => String(v[c.i] != null ? v[c.i] : '')) };
  }).filter((r) => r && r.n);
  if (!rows.length) throw new Error('no players returned');
  return { sp, kind: 'players', id, label: b.label, cols: cols.map((c) => ({ k: c.k, l: c.l, t: c.t })), sortCol, rows, updated: new Date().toISOString() };
}

// Every team, every stat group, in one request (30-ish rows). Sorted client-side when a column header is tapped.
async function teams(sp) {
  const lim = sp === 'CFB' ? 140 : 50;
  const j = await get(`${API}${seg(sp)}/statistics/byteam?region=us&lang=en&contentorigin=espn&limit=${lim}`);
  const tops = j.categories || [];
  const list = (j.teams || []).map((x) => ({ t: x.team || {}, c: x.categories || [] })).filter((x) => x.t.displayName || x.t.name);
  if (!list.length || !tops.length) throw new Error('no team stats returned');
  const groups = tops.map((g) => {
    const names = (g.names || []).map(String), labels = (g.labels || g.abbreviations || []).map(String), long = (g.displayNames || []).map(String);
    return { k: String(g.name), n: String(g.displayName || cap(g.name)), cols: names.map((n, i) => ({ k: n, l: labels[i] || cap(n), t: long[i] || cap(n) })) };
  });
  const rows = list.map((x) => {
    const v = {};
    groups.forEach((g) => { const c = x.c.find((y) => norm(y.name) === norm(g.k)); v[g.k] = g.cols.map((_, i) => { const a = valsOf(c)[i]; return a != null ? String(a) : ''; }); });
    return { id: String(x.t.id || ''), n: x.t.shortDisplayName || x.t.displayName || x.t.name || '', ab: x.t.abbreviation || '', lg: https(x.t.logo || (x.t.logos && x.t.logos[0] && x.t.logos[0].href) || ''), v };
  });
  // Overview group: points per game + total yards (passing + rushing) when ESPN sends those groups.
  const find = (re, cats) => { for (const g of groups) { if (cats && !cats.test(g.k)) continue; const i = g.cols.findIndex((c) => re.test(norm(c.k))); if (i >= 0) return { g: g.k, i }; } return null; };
  const pass = find(/^(net)?passingyards$/, /^passing$/), rush = find(/^rushingyards$/, /^rushing$/), ppg = find(/^totalpointspergame$|^pointspergame$|^avgpoints$/), pts = find(/^totalpoints$|^points$/);
  if (pass && rush) {
    const num = (r, f) => Number(String((r.v[f.g] || [])[f.i] || '').replace(/,/g, ''));
    const ov = { k: 'overview', n: 'Overview', cols: [] };
    ov.cols.push({ k: 'totalYards', l: 'YDS', t: 'Total yards' }, { k: 'pass', l: 'PASS', t: 'Passing yards' }, { k: 'rush', l: 'RUSH', t: 'Rushing yards' });
    if (ppg) ov.cols.push({ k: 'ppg', l: 'PPG', t: 'Points per game' });
    if (pts) ov.cols.push({ k: 'pts', l: 'PTS', t: 'Total points' });
    rows.forEach((r) => {
      const a = num(r, pass), c = num(r, rush), pick = (f) => (f ? String((r.v[f.g] || [])[f.i] || '') : '');
      r.v.overview = [Number.isFinite(a + c) ? Math.round(a + c).toLocaleString('en-US') : '', pick(pass), pick(rush)].concat(ppg ? [pick(ppg)] : [], pts ? [pick(pts)] : []);
    });
    groups.unshift(ov);
  }
  groups.sort((a, b) => { const x = TEAM_ORDER.indexOf(a.k), y = TEAM_ORDER.indexOf(b.k); return (x < 0 ? 99 : x) - (y < 0 ? 99 : y); });
  return { sp, kind: 'teams', groups, rows, updated: new Date().toISOString() };
}

exports.handler = async (event) => {
  const q = (event && event.queryStringParameters) || {};
  const sp = String(q.sport || 'NFL').toUpperCase(), kind = String(q.kind || 'menu'), id = String(q.id || '');
  if (!BOARDS[sp] || !LEAGUES[sp]) return json(400, { error: 'bad sport' });
  if (kind === 'menu') return json(200, { sp, boards: BOARDS[sp].map((b) => ({ id: b.id, l: b.label })) });
  try {
    if (q.debug) { // raw look at what ESPN sends
      const b = BOARDS[sp].find((x) => x.id === id) || BOARDS[sp][0];
      const u = kind === 'teams' ? `${API}${seg(sp)}/statistics/byteam?region=us&lang=en&contentorigin=espn&limit=3` : `${API}${seg(sp)}/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=true&page=1&limit=2&sort=${encodeURIComponent(b.cat + '.' + b.sort + ':' + b.dir)}`;
      const j = await get(u);
      return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }, body: JSON.stringify({ url: u, topCategories: (j.categories || []).map((c) => ({ name: c.name, names: c.names })), first: JSON.stringify(j.athletes ? j.athletes[0] : j.teams ? j.teams[0] : j).slice(0, 4000) }, null, 1) };
    }
    if (kind === 'teams') return json(200, await cached('stats1:' + sp + ':teams', TTL_TEAMS, () => teams(sp), { provider: 'espn' }));
    if (kind === 'players') {
      if (!BOARDS[sp].some((b) => b.id === id)) return json(400, { error: 'bad leaderboard' });
      return json(200, await cached('stats1:' + sp + ':p:' + id, TTL_PLAYERS, () => players(sp, id), { provider: 'espn' }));
    }
    return json(400, { error: 'bad kind' });
  } catch (e) { return json(502, { error: 'stats unavailable', detail: String(e.message || e) }); }
};
