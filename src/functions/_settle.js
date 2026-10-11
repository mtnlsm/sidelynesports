// Shared payout logic. Used by settle-games (URL, called by the app / you in a browser) and settle-games-cron (runs every 5 min).
// Finds finished games, remembers them in finished_games (so they stay visible ~36h), and pays open picks via settle_game().
//
// Cloudflare free plan allows only 50 outgoing requests (subrequests) per run, and ESPN + Supabase calls all count.
// So this run: (1) reads the open picks first, (2) fetches ESPN only for leagues that have open picks, (3) counts every outgoing
// request and stops before the limit. Anything not finished this run is simply picked up by the next 5-minute run.
const { db } = require('./_cache');
const sports = require('./sports-data');
const KEEP_MS = 48 * 36e5; // rows are deleted after 48h (the app shows them for 36h)
const LIMIT = 44;          // stay under Cloudflare free's 50 (set higher, e.g. 900, if you move to Workers Paid)

// Count every outgoing request made through fetch (installed once per isolate).
let sub = 0;
if (!globalThis.fetch.__counted) {
  const real = globalThis.fetch.bind(globalThis);
  const counted = (...a) => { sub++; return real(...a); };
  counted.__counted = true;
  globalThis.fetch = counted;
}

function winner(g) {
  if (g.sp === 'UFC' || g.sp === 'PFL') return g.sa === 'W' ? g.a : g.sb === 'W' ? g.b : g.sa === 'D' && g.sb === 'D' ? 'Draw' : null; // no winner flag yet: leave pending
  const a = Number(g.sa), b = Number(g.sb);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a > b ? g.a : b > a ? g.b : 'Draw'; // a tie pays everyone the +50
}
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

exports.run = async (opts = {}) => {
  const base = sub, left = () => LIMIT - (sub - base);
  const errors = [], checks = []; // checks = plain-English health report shown on /status.html
  let deferred = 0;
  const out = (code, o) => ({ statusCode: code, body: JSON.stringify({ ...o, deferred, requestsUsed: sub - base, errors, checks }) });
  const c = db();
  if (!c) { checks.push({ ok: false, name: 'Server can reach your database', fix: db.why() }); return out(500, { paid: 0 }); }
  checks.push({ ok: true, name: 'Server can reach your database (' + (db.mode || '?') + ')' });

  // 1) open picks first: tells us which leagues we actually need from ESPN
  const { data, error } = await c.from('user_picks').select('game_id,matchup').is('settled_at', null).limit(5000);
  if (error) { checks.push({ ok: false, name: 'Picks table is ready for payouts', fix: 'Run supabase/results.sql in the Supabase SQL Editor. Database says: ' + error.message }); return out(500, { paid: 0 }); }
  checks.push({ ok: true, name: 'Picks table is ready for payouts (' + (data || []).length + ' unpaid picks waiting)' });
  const open = new Set((data || []).map((x) => x.game_id));
  const mu = new Map(); for (const x of data || []) if (x.matchup && !mu.has(x.game_id)) mu.set(x.game_id, x.matchup);
  const allNeed = [...new Set([...open].map((id) => (/^([A-Z0-9]+):/.exec(id) || [])[1]).filter(Boolean))];
  const need = shuffle(allNeed).slice(0, 6); // free plan: at most 6 leagues per run (each costs 1-2+ requests); the rest rotate in on the next run

  // 2) live feed, only for leagues with unpaid picks (1 request per league, 2 if ESPN's ranged call comes back empty)
  const games = new Map(); // game_id -> { w, date, row? }
  const res = await Promise.allSettled(need.map((sp) => sports.load(sp)));
  const items = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const failed = res.filter((r) => r.status === 'rejected');
  checks.push(!need.length || failed.length < need.length
    ? { ok: true, name: 'Live scores feed works (' + items.length + ' games found in ' + (need.length - failed.length) + ' leagues with open picks)' }
    : { ok: false, name: 'Live scores feed works', fix: 'ESPN did not answer: ' + String((failed[0].reason && failed[0].reason.message) || failed[0].reason) + '. This usually fixes itself; refresh in a minute.' });
  for (const g of items.filter((x) => x.st === 'final')) { const w = winner(g); if (w) games.set(String(g.id), { w, date: g.date, row: { game_id: String(g.id), sport: g.sp, a: g.a, b: g.b, sa: String(g.sa), sb: String(g.sb), game_date: g.date, winner: w } }); }

  // 3) remember finals (finished_at = first time we saw it final), then also use anything remembered earlier
  const rows = [...games.values()].map((x) => x.row).filter(Boolean);
  if (rows.length) { const r = await c.from('finished_games').upsert(rows, { onConflict: 'game_id', ignoreDuplicates: true }); if (r.error) errors.push('finished_games: ' + r.error.message); }
  const mem = await c.from('finished_games').select('game_id,winner,game_date').gt('finished_at', new Date(Date.now() - KEEP_MS).toISOString());
  if (mem.error) errors.push('finished_games read: ' + mem.error.message);
  for (const x of mem.data || []) if (!games.has(x.game_id)) games.set(x.game_id, { w: x.winner, date: x.game_date });
  checks.push(mem.error ? { ok: false, name: 'Finished-games memory table exists', fix: 'Run supabase/results.sql in the Supabase SQL Editor. Database says: ' + mem.error.message } : { ok: true, name: 'Finished-games memory table exists' });
  if (opts.diag) { // only on /status.html (?fresh=1): costs one request, so the 5-minute cron skips it
    const dg = await c.rpc('settle_game', { p_game: '__diag__', p_winner: 'x', p_start: null }); // harmless: matches no picks
    checks.push(dg.error ? { ok: false, name: 'Payout function exists in the database', fix: 'Run supabase/results.sql in the Supabase SQL Editor, wait one minute, then reload this page. Database says: ' + dg.error.message } : { ok: true, name: 'Payout function exists in the database' });
  }

  let paid = 0;
  const settle = async (id, x) => { const r = await c.rpc('settle_game', { p_game: id, p_winner: x.w, p_start: /^(UFC|PFL):/.test(String(id)) ? null : x.date }); if (r.error) errors.push('settle_game ' + id + ': ' + r.error.message); else paid += r.data || 0; };

  // 4) pay games we already know are final (1 request each)
  const due = [...games].filter(([id]) => open.has(id));
  for (let k = 0; k < due.length;) {
    const n = Math.min(8, left() - 1); // keep 1 request for cleanup
    if (n < 1) { deferred += due.length - k; break; }
    const batch = due.slice(k, k + n); k += n;
    await Promise.all(batch.map(([id, x]) => settle(id, x)));
  }

  // 5) recovery: picks whose game already left ESPN's scoreboard window. Look up by id (1 request) and settle (1 more).
  // Shuffled so one game that is not finished yet can never starve the others; unfinished ones just retry next run.
  const cand = shuffle([...open].filter((id) => !games.has(id)));
  for (let k = 0; k < cand.length;) {
    const n = Math.min(6, Math.floor((left() - 1) / 3)); // 3 requests per recovered game: ESPN lookup, settle_game, league scoring
    if (n < 1) { deferred += cand.length - k; break; }
    const batch = cand.slice(k, k + n); k += n;
    await Promise.all(batch.map(async (id) => {
      const m = /^([A-Z0-9]+):(\d+)$/.exec(id), path = m && sports.LEAGUES && sports.LEAGUES[m[1]], teams = (mu.get(id) || '').split(' vs ');
      if (!path || teams.length !== 2) return; // UFC cards can't be looked up this way
      try {
        const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/' + path + '/summary?event=' + m[2]);
        if (!r.ok) return;
        const comp = (((await r.json()).header || {}).competitions || [])[0], t = comp && comp.status && comp.status.type;
        if (!comp || !t || !(t.completed === true || (t.completed === undefined && t.state === 'post'))) return;
        const aw = comp.competitors.find((x) => x.homeAway === 'away'), hm = comp.competitors.find((x) => x.homeAway === 'home');
        const sa = Number(aw && aw.score), sb = Number(hm && hm.score);
        if (!Number.isFinite(sa) || !Number.isFinite(sb)) return;
        const x = { w: sa > sb ? teams[0] : sb > sa ? teams[1] : 'Draw', date: comp.date || null };
        games.set(id, x); await settle(id, x);
        await c.rpc('settle_league_game', { p_game: id, p_winner: x.w, p_start: x.date }); // league picks for this game (ignored if leagues.sql isn't installed)
      } catch (e) { errors.push('lookup ' + id + ': ' + String(e.message || e)); }
    }));
  }

  // 6) cleanup (skipped if the budget is used up; it will run next time)
  if (left() >= 1) await c.from('finished_games').delete().lt('finished_at', new Date(Date.now() - KEEP_MS).toISOString());
  if (left() >= 1) await c.rpc('league_finalize'); // closes ended leagues and pays the #1 bonus (ignored if leagues.sql isn't installed)
  if (errors.length) console.error('settle-games errors', errors);
  return out(200, { finals: games.size, openPickGames: open.size, paid });
};
