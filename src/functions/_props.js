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
  const by = new Map(); for (const p of op) { if (!by.has(p.game_id)) by.set(p.game_id, []); by.get(p.game_id).push(p); }
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
  // 3) anything still open 5 days after it started (DNP, cancelled, no data) is voided so picks never get stuck
  for (const p of op.filter((p) => Date.now() - Date.parse(p.starts_at) > 5 * 864e5)) { const x = await c.rpc('void_prop', { p_prop: p.id }); if (!x.error) voided++; }
  if (errors.length) console.error('props errors', errors);
  return { statusCode: 200, body: JSON.stringify({ created: all.length, ...diag, settled, voided, errors }) };
};
