// Fighter profiles (record + last 5 fights) for UFC, PFL and other MMA fighters.
// Data comes from ESPN's public MMA endpoints (no API key needed). Results are cached in Supabase (see _cache.js).
// Use:  /.netlify/functions/fighter?name=Jon%20Jones      (looks the fighter up by name)
//       /.netlify/functions/fighter?id=2335639            (ESPN athlete id, faster and exact)
// Add &debug=1 to see exactly what ESPN returned (handy if a field comes back empty).
const { cached, TTL } = require('./_cache');

const CORE = 'https://sports.core.api.espn.com/v2/sports/mma';
const SEARCH = 'https://site.web.api.espn.com/apis/common/v3/search';
const PROFILE_TTL = 6 * 3600; // seconds: a fighter who just fought shows the new result within hours

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=300' },
  body: JSON.stringify(body)
});

const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const ref = (x) => (x && typeof x === 'object' ? x.$ref || '' : typeof x === 'string' ? x : '');
const txt = (v) => (v == null ? '' : typeof v === 'object' ? String(v.text || v.displayName || v.name || v.abbreviation || '') : String(v));
// ESPN sometimes lists a fighter under a new name (e.g. Bobby Green is now King Green). Maps old/other name -> ESPN name, both directions.
const ALIASES = { 'bobby green': 'King Green', 'king green': 'Bobby Green' };
const clip = (o, n = 2500) => { try { return JSON.stringify(o).slice(0, n); } catch (e) { return ''; } };

async function get(url, ctx) {
  const u = String(url).replace(/^http:/, 'https:');
  if (!/^https:\/\/[a-z0-9.-]*\.espn\.com\//i.test(u)) throw new Error('blocked host');
  const t0 = Date.now();
  const r = await fetch(u, { headers: { accept: 'application/json' } });
  if (ctx.trace) ctx.trace.push({ url: u, status: r.status, ms: Date.now() - t0 });
  if (!r.ok) { const e = new Error('espn ' + r.status); e.status = r.status; throw e; }
  return r.json();
}
const tryGet = (url, ctx, label) => get(url, ctx).catch((e) => { ctx.warn.push(label + ': ' + e.message); return null; });

// ---- name -> ESPN athlete id (remembered for a week) ----
// ESPN's search is picky, so we try a few different versions of the request until one finds the fighter.
function pickFighter(j, want) {
  let list = (j && j.items) || [];
  if (!list.length && j && Array.isArray(j.results)) list = j.results.flatMap((x) => x.contents || x.items || []);
  const cands = list.map((c) => {
    const uid = String(c.uid || '');
    const id = String(c.id || (uid.match(/~a:(\d+)/) || [])[1] || '');
    const mma = /mma/i.test(String(c.sport || '')) || /s:3301/.test(uid) || /\/mma\//i.test(JSON.stringify(c.link || c.links || ''));
    return { id, mma, same: norm(c.displayName || c.name || '') === want, type: String(c.type || '') };
  }).filter((c) => /^\d+$/.test(c.id) && (!c.type || /player|athlete/i.test(c.type)));
  return { n: list.length, hit: cands.find((c) => c.mma && c.same) || cands.find((c) => c.mma) || cands.find((c) => c.same) };
}

async function findId(name, ctx) {
  const id = await findIdExact(name, ctx);
  const alt = ALIASES[norm(name)];
  return id || (alt ? findIdExact(alt, ctx) : '');
}

async function findIdExact(name, ctx) {
  const key = 'FSEARCH:' + norm(name);
  const want = norm(name);
  const last = want.split(' ').pop();
  const q = encodeURIComponent(name), ql = encodeURIComponent(last);
  const tries = [
    `${SEARCH}?region=us&lang=en&limit=10&type=player&query=${q}`,
    `${SEARCH}?region=us&lang=en&limit=20&mode=prefix&type=player&query=${ql}`,
    `${SEARCH}?region=us&lang=en&limit=20&query=${ql}`,
    `https://site.web.api.espn.com/apis/search/v2?region=us&lang=en&limit=20&page=1&type=player&query=${q}`,
    `${SEARCH}?region=us&lang=en&limit=10&mode=prefix&query=${q}`
  ];
  const r = await cached(key, TTL.history, async () => {
    for (let i = 0; i < tries.length; i++) {
      let j = null;
      try { j = await get(tries[i], ctx); } catch (e) { ctx.warn.push('search ' + (i + 1) + ': ' + e.message); continue; }
      const f = pickFighter(j, want);
      ctx.warn.push('search ' + (i + 1) + ': ' + f.n + ' results' + (f.hit ? ', matched' : ''));
      if (f.hit) return { id: f.hit.id };
    }
    throw new Error('no match'); // thrown on purpose so a miss is not cached
  }, { provider: 'espn' }).catch(() => null);
  return r && r.id ? String(r.id) : '';
}

// ---- record: "27-1-0" plus KO / submission / decision wins when ESPN gives them ----
function parseRecord(rj) {
  const items = (rj && (rj.items || rj.records)) || [];
  const row = items.find((i) => /overall|total/i.test(String(i.name || i.type || ''))) || items[0];
  if (!row) return null;
  const sum = String(row.summary || row.displayValue || '');
  const m = sum.match(/(\d+)\s*-\s*(\d+)(?:\s*-\s*(\d+))?/);
  const stats = {};
  (row.stats || []).forEach((s) => { stats[String(s.name || s.abbreviation || '').toLowerCase()] = Number(s.value); });
  const find = (re) => { const k = Object.keys(stats).find((n) => re.test(n) && !/loss|lost/.test(n)); return k !== undefined && Number.isFinite(stats[k]) ? stats[k] : null; };
  const n = (v) => (Number.isFinite(v) ? v : null);
  const wins = m ? Number(m[1]) : n(stats.wins), losses = m ? Number(m[2]) : n(stats.losses), draws = m ? Number(m[3] || 0) : n(stats.draws);
  if (wins == null && losses == null) return null;
  return { summary: m ? m[0].replace(/\s/g, '') : `${wins}-${losses}-${draws || 0}`, wins, losses, draws, ko: find(/^(tko|ko|knockout)/), sub: find(/^sub/), dec: find(/^dec/) };
}

// ---- how a fight ended ----
function method(res) {
  const r = res || {};
  const s = [r.name, r.displayName, r.shortDisplayName, r.description].filter(Boolean).join(' ').toLowerCase();
  let m = '';
  if (/disqual|\bdq\b/.test(s)) m = 'DQ';
  else if (/no.?contest|\bnc\b/.test(s)) m = 'No contest';
  else if (/draw/.test(s)) m = 'Draw';
  else if (/sub/.test(s)) m = 'Submission';
  else if (/tko|\bko\b|knock/.test(s)) m = 'KO/TKO';
  else if (/dec|unanimous|split|majority|points/.test(s)) m = 'Decision';
  else m = String(r.shortDisplayName || r.displayName || r.description || '').trim();
  const detail = /unanimous/.test(s) ? 'Unanimous' : /split/.test(s) ? 'Split' : /majority/.test(s) ? 'Majority'
    : /doctor/.test(s) ? 'Doctor stoppage' : /corner/.test(s) ? 'Corner stoppage' : /retire/.test(s) ? 'Retirement' : '';
  return { m, detail, s };
}

async function lastFights(id, log, ctx) {
  const items = (log && ((log.events && log.events.items) || log.items)) || [];
  if (ctx.debug) { ctx.raw.eventlogCount = items.length; ctx.raw.eventlogFirst = clip(items[0]); }
  const seen = new Set();
  // newest events have the biggest ids, so only look at the top few instead of fetching a whole career
  const cand = items.map((it) => {
    const cref = ref(it.competition), src = cref || ref(it.event), m = src.match(/events\/(\d+)/);
    return cref && m ? { cref, eid: Number(m[1]), promo: ((src.match(/leagues\/([a-z0-9-]+)/i) || [])[1] || '').toUpperCase() } : null;
  }).filter((c) => c && !seen.has(c.cref) && seen.add(c.cref)).sort((a, b) => b.eid - a.eid).slice(0, 8);

  const comps = (await Promise.all(cand.map((c) => tryGet(c.cref, ctx, 'fight').then((j) => (j && j.date ? { ...c, j } : null)))))
    .filter(Boolean)
    .filter((c) => Date.parse(c.j.date) <= Date.now() + 36e5)
    .sort((a, b) => Date.parse(b.j.date) - Date.parse(a.j.date))
    .slice(0, 5);
  if (ctx.debug && comps[0]) ctx.raw.fightFirst = clip(comps[0].j, 3000);

  const out = await Promise.all(comps.map(async (c) => {
    const comp = c.j;
    let st = comp.status;
    if (st && st.result === undefined && ref(st)) st = await tryGet(ref(st), ctx, 'status');
    if (ctx.debug && !ctx.raw.statusFirst) ctx.raw.statusFirst = clip(st);
    if (st && st.type && (st.type.state === 'pre' || st.type.completed === false)) return null; // not finished yet
    const cs = comp.competitors || [];
    const mine = (x) => String(x.id) === String(id) || ref(x.athlete).includes('/athletes/' + id + '?') || ref(x.athlete).endsWith('/athletes/' + id);
    const me = cs.find(mine), opp = cs.find((x) => x !== me);
    if (!me) { ctx.warn.push('fight: could not tell which side the fighter was on'); return null; }
    const how = method(st && st.result);
    let result = me.winner === true ? 'W' : opp && opp.winner === true ? 'L' : '';
    if (!result) result = /draw/.test(how.s) ? 'D' : /no.?contest|\bnc\b/.test(how.s) ? 'NC' : '';
    if (!result) return null;
    let oppName = '';
    if (opp) {
      const inline = opp.athlete && (opp.athlete.displayName || opp.athlete.fullName);
      if (inline) oppName = inline;
      else {
        const u = ref(opp.athlete) || (opp.id ? `${CORE}/athletes/${opp.id}` : '');
        const oj = u ? await tryGet(u, ctx, 'opponent') : null;
        oppName = (oj && (oj.displayName || oj.fullName)) || '';
      }
    }
    return {
      date: comp.date, promo: c.promo, opponent: oppName || 'Unknown opponent', opponentId: opp ? String(opp.id || '') : '',
      result, method: how.m, detail: how.detail,
      round: st && Number(st.period) > 0 ? Number(st.period) : null, time: st && st.displayClock ? String(st.displayClock) : ''
    };
  }));
  return out.filter(Boolean).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

async function buildProfile(id, ctx) {
  const ath = await get(`${CORE}/athletes/${id}`, ctx);
  if (ctx.debug) ctx.raw.athleteKeys = Object.keys(ath);
  const recUrl = ref(ath.records) || `${CORE}/athletes/${id}/records`;
  const logBase = ref(ath.eventLog) || `${CORE}/athletes/${id}/eventlog`;
  const logUrl = logBase + (logBase.includes('?') ? '&' : '?') + 'limit=100';
  const [rec, log] = await Promise.all([tryGet(recUrl, ctx, 'records'), tryGet(logUrl, ctx, 'eventlog')]);
  if (ctx.debug) ctx.raw.records = clip(rec, 3000);
  const fights = await lastFights(id, log, ctx);
  if (!fights.length && ctx.warn.length) throw new Error('fight history unavailable: ' + ctx.warn.join('; ')); // do not cache a half-empty profile
  let streak = '';
  if (fights.length && (fights[0].result === 'W' || fights[0].result === 'L')) {
    let n = 0; while (n < fights.length && fights[n].result === fights[0].result) n++;
    streak = fights[0].result + n;
  }
  return {
    id: String(id),
    name: ath.displayName || ath.fullName || '',
    nickname: txt(ath.nickname),
    headshot: ((ath.headshot && ath.headshot.href) || '').replace(/^http:/, 'https:'),
    weightClass: txt(ath.weightClass),
    height: ath.displayHeight || '',
    weight: ath.displayWeight || '',
    reach: ath.displayReach || (ath.reach ? ath.reach + '"' : ''),
    age: ath.age || null,
    stance: txt(ath.stance),
    record: parseRecord(rec),
    fights,
    streak
  };
}

exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const name = String(q.name || '').trim().slice(0, 80);
  let id = String(q.id || '').trim();
  const debug = q.debug === '1';
  if (id && !/^\d{1,12}$/.test(id)) return json(400, { error: 'bad id' });
  if (!id && !name) return json(400, { error: 'name or id required' });
  const ctx = { debug, trace: debug ? [] : null, warn: [], raw: {} };
  try {
    if (!id) id = await findId(name, ctx);
    if (!id) return json(404, { error: 'fighter not found', name, ...(debug ? { _trace: ctx.trace, _warn: ctx.warn } : {}) });
    // lite=1: just the id + headshot link (no record/fight history), so lists of fighters can show photos fast
    if (q.lite === '1') {
      return { statusCode: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
        body: JSON.stringify({ id, name, headshot: 'https://a.espncdn.com/i/headshots/mma/players/full/' + id + '.png' }) };
    }
    const data = debug ? await buildProfile(id, ctx) : await cached('FIGHTER:' + id, PROFILE_TTL, () => buildProfile(id, { ...ctx, warn: [] }), { provider: 'espn' });
    return json(200, debug ? { ...data, _trace: ctx.trace, _warn: ctx.warn, _raw: ctx.raw } : data);
  } catch (e) {
    const s = e.status;
    return json(s === 404 ? 404 : s === 429 ? 429 : 502, { error: s === 404 ? 'fighter not found' : s === 429 ? 'ESPN rate limit reached' : 'upstream unavailable', detail: String(e.message || e), ...(debug ? { _trace: ctx.trace, _warn: ctx.warn, _raw: ctx.raw } : {}) });
  }
};
