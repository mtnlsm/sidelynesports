// Shared payout logic. Used by settle-games (URL, called by the app / you in a browser) and settle-games-cron (runs every 5 min).
// Finds finished games, remembers them in finished_games (so they stay visible ~36h), and pays open picks via settle_game().
const { db } = require('./_cache');
const sports = require('./sports-data');
const KEEP_MS = 48 * 36e5; // rows are deleted after 48h (the app shows them for 36h)
function winner(g) {
  if (g.sp === 'UFC' || g.sp === 'PFL') return g.sa === 'W' ? g.a : g.sb === 'W' ? g.b : g.sa === 'D' && g.sb === 'D' ? 'Draw' : null; // no winner flag yet: leave pending
  const a = Number(g.sa), b = Number(g.sb);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a > b ? g.a : b > a ? g.b : 'Draw'; // a tie pays everyone the +50
}
exports.run = async () => {
  const errors = [], checks = []; // checks = plain-English health report shown on /status.html
  const out = (code, o) => ({ statusCode: code, body: JSON.stringify({ ...o, errors, checks }) });
  const c = db();
  if (!c) { checks.push({ ok: false, name: 'Server can reach your database', fix: db.why() }); return out(500, { paid: 0 }); }
  checks.push({ ok: true, name: 'Server can reach your database (' + (db.mode || '?') + ')' });
  const res = await sports.handler({ queryStringParameters: { sport: 'ALL', type: 'games' } });
  let body = {}; try { body = JSON.parse(res.body); } catch (e) {}
  checks.push(res.statusCode === 200 && (body.items || []).length ? { ok: true, name: 'Live scores feed works (' + body.items.length + ' games found)' } : { ok: false, name: 'Live scores feed works', fix: 'ESPN did not answer: ' + (body.detail || body.error || res.statusCode) + '. This usually fixes itself; refresh in a minute.' });
  const feed = ((body.items) || []).filter((g) => g.st === 'final');
  const games = new Map(); // game_id -> { w, date }
  for (const g of feed) { const w = winner(g); if (w) games.set(String(g.id), { w, date: g.date, row: { game_id: String(g.id), sport: g.sp, a: g.a, b: g.b, sa: String(g.sa), sb: String(g.sb), game_date: g.date, winner: w } }); }
  // 1) remember finals (finished_at = first time we saw it final)
  if (games.size) { const r = await c.from('finished_games').upsert([...games.values()].map((x) => x.row), { onConflict: 'game_id', ignoreDuplicates: true }); if (r.error) errors.push('finished_games: ' + r.error.message); }
  // 2) also settle anything remembered earlier that dropped out of the feed
  const mem = await c.from('finished_games').select('game_id,winner,game_date').gt('finished_at', new Date(Date.now() - KEEP_MS).toISOString());
  if (mem.error) errors.push('finished_games read: ' + mem.error.message);
  for (const x of mem.data || []) if (!games.has(x.game_id)) games.set(x.game_id, { w: x.winner, date: x.game_date });
  // 3) pay open picks
  const { data, error } = await c.from('user_picks').select('game_id,matchup').is('settled_at', null).limit(5000);
  if (error) { checks.push({ ok: false, name: 'Picks table is ready for payouts', fix: 'Run supabase/results.sql in the Supabase SQL Editor. Database says: ' + error.message }); return out(500, { paid: 0 }); }
  checks.push({ ok: true, name: 'Picks table is ready for payouts (' + (data || []).length + ' unpaid picks waiting)' });
  checks.push(mem.error ? { ok: false, name: 'Finished-games memory table exists', fix: 'Run supabase/results.sql in the Supabase SQL Editor. Database says: ' + mem.error.message } : { ok: true, name: 'Finished-games memory table exists' });
  const dg = await c.rpc('settle_game', { p_game: '__diag__', p_winner: 'x', p_start: null }); // harmless: matches no picks
  checks.push(dg.error ? { ok: false, name: 'Payout function exists in the database', fix: 'Run supabase/results.sql in the Supabase SQL Editor, wait one minute, then reload this page. Database says: ' + dg.error.message } : { ok: true, name: 'Payout function exists in the database' });
  const open = new Set((data || []).map((x) => x.game_id));
  // 3b) Recovery: a pick whose game already dropped out of ESPN's scoreboard window (e.g. this function was not running for a few days)
  // would stay unpaid forever. Look those games up by id and settle them. The winner is taken from the saved "away vs home" matchup so names always match the pick.
  const mu = new Map(); for (const x of data || []) if (x.matchup && !mu.has(x.game_id)) mu.set(x.game_id, x.matchup);
  const cand = [...open].filter((id) => !games.has(id)).slice(0, 8); // keep each run short (Cloudflare free: max 50 outgoing requests per run)
  await Promise.all(cand.map(async (id) => {
    const m = /^([A-Z0-9]+):(\d+)$/.exec(id), path = m && sports.LEAGUES && sports.LEAGUES[m[1]], teams = (mu.get(id) || '').split(' vs ');
    if (!path || teams.length !== 2) return; // UFC/PFL cards can't be looked up this way
    try {
      const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + path + '/summary?event=' + m[2]);
      if (!r.ok) return;
      const comp = (((await r.json()).header || {}).competitions || [])[0], t = comp && comp.status && comp.status.type;
      if (!comp || !t || !(t.completed === true || (t.completed === undefined && t.state === 'post'))) return;
      const aw = comp.competitors.find((x) => x.homeAway === 'away'), hm = comp.competitors.find((x) => x.homeAway === 'home');
      const sa = Number(aw && aw.score), sb = Number(hm && hm.score);
      if (!Number.isFinite(sa) || !Number.isFinite(sb)) return;
      games.set(id, { w: sa > sb ? teams[0] : sb > sa ? teams[1] : 'Draw', date: comp.date || null });
    } catch (e) { errors.push('lookup ' + id + ': ' + String(e.message || e)); }
  }));
  let paid = 0;
  const due = [...games].filter(([id]) => open.has(id));
  for (let k = 0; k < due.length; k += 8) {
    await Promise.all(due.slice(k, k + 8).map(async ([id, x]) => {
      const r = await c.rpc('settle_game', { p_game: id, p_winner: x.w, p_start: x.date });
      if (r.error) errors.push('settle_game ' + id + ': ' + r.error.message); else paid += r.data || 0;
    }));
  }
  // 4) cleanup
  await c.from('finished_games').delete().lt('finished_at', new Date(Date.now() - KEEP_MS).toISOString());
  if (errors.length) console.error('settle-games errors', errors);
  return out(200, { finals: games.size, openPickGames: open.size, paid });
};
