// UFC/MMA data via API-Sports MMA (https://api-sports.io/documentation/mma/v1). Key stays server-side.
// Auth: `x-apisports-key` header. Base: https://v1.mma.api-sports.io (override with API_SPORTS_MMA_BASE). Responses are { get, parameters, errors, results, response }.
// Free plan is 100 calls/day, so TTLs are long and results are cached in Supabase (see _cache.js).
const { cached, TTL } = require('./_cache');
const BASE = (process.env.API_SPORTS_MMA_BASE || 'https://v1.mma.api-sports.io').replace(/\/+$/, '');
const day = (offset = 0) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const ROUTES = {
  events: () => `/fights?date=${day(0)}`,         // today's fights
  recent: () => `/fights?date=${day(-1)}`,        // yesterday's fights
  card: (id) => `/fights?date=${id}`,             // id = date, YYYY-MM-DD
  fight: (id) => `/fights?id=${id}`,              // id = fight id
  fighter: (id) => `/fighters?id=${id}`,          // id = fighter id
  rankings: null                                  // API-Sports MMA has no rankings endpoint
};
const TTLS = { events: 6 * 3600, recent: 6 * 3600, card: 3600, fight: 3600, fighter: TTL.static };
const NEEDS_ID = new Set(['card', 'fight', 'fighter']);
const json = (statusCode, body) => ({ statusCode, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const apiErr = (er) => (Array.isArray(er) ? er.join(' ') : Object.values(er || {}).join(' '));
exports.handler = async (event) => {
  const { type = 'events', id = '' } = event.queryStringParameters || {};
  if (!(type in ROUTES) || !/^[\w.-]*$/.test(id) || (NEEDS_ID.has(type) && !id)) return json(400, { error: 'bad request' });
  if (!ROUTES[type]) return json(501, { error: 'not available from API-Sports MMA' });
  if (!process.env.API_SPORTS_KEY) return json(503, { error: 'API-Sports not configured: set API_SPORTS_KEY' });
  try {
    const data = await cached(`MMA:${type}:${id}`, TTLS[type], async () => {
      const r = await fetch(BASE + ROUTES[type](encodeURIComponent(id)), { headers: { 'x-apisports-key': process.env.API_SPORTS_KEY, accept: 'application/json' } });
      if (!r.ok) { const e = new Error('api-sports ' + r.status); e.status = r.status; throw e; }
      const j = await r.json();
      const m = apiErr(j.errors);
      if (m) { const e = new Error(m); e.status = /token|key|access/i.test(m) ? 401 : /limit|quota|request/i.test(m) ? 429 : 502; throw e; }
      return { items: j.response, meta: { results: j.results } };
    }, { provider: 'api-sports' });
    return json(200, data);
  } catch (e) {
    const s = e.status;
    return json(s === 401 ? 502 : s === 404 ? 404 : s === 429 ? 429 : 502, { error: s === 401 ? 'API-Sports rejected the API key' : s === 429 ? 'API-Sports quota reached' : 'upstream unavailable', detail: String(e.message || e) });
  }
};
