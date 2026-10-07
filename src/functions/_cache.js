// Shared cache: API -> Cloudflare Worker -> Supabase cache -> users.
// If Supabase env vars are missing/broken, falls back to a tiny in-memory cache so live data still works.
const mem = new Map();
const TTL = { live: 15, upcoming: 900, standings: 3600, static: 86400, history: 604800 }; // seconds
let sbClient = null;
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim(); // pasted keys often carry stray spaces/quotes/newlines
function db() {
  if (sbClient) return sbClient;
  let url = require('./_url').supabaseUrl(), key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) return null;
  sbClient = require('./_sb').create(url, key); db.mode = 'built-in (fetch)';
  return sbClient;
}
// Plain-English reason db() returned nothing (shown on /status.html).
db.why = () => {
  const miss = ['SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !clean(process.env[k]));
  const seen = Object.keys(process.env).filter((k) => /supa/i.test(k));
  return 'Missing from what the server can see: ' + (miss.join(', ') || 'nothing') + '. Variables whose name contains "supa" that the server DOES see: ' + (seen.join(', ') || 'none') + '. Names must match exactly (capitals, underscores, no spaces), and the deploy must be a new one made AFTER adding them.';
};
async function cached(key, ttl, fetcher, meta = {}) {
  const sb = db();
  let row = null;
  if (sb) { try { row = (await sb.from('cached_sports_data').select('payload,expires_at').eq('cache_key', key).maybeSingle()).data; } catch (e) {} }
  const m = mem.get(key);
  if (row && new Date(row.expires_at) > new Date()) return { ...row.payload, _cache: 'hit' };
  if (m && m.exp > Date.now()) return { ...m.payload, _cache: 'mem' };
  try {
    const payload = await fetcher();
    const now = new Date();
    mem.set(key, { payload, exp: Date.now() + ttl * 1000 });
    if (sb) { try { await sb.from('cached_sports_data').upsert({ cache_key: key, provider: meta.provider || null, payload,
      fetched_at: now.toISOString(), updated_at: now.toISOString(), expires_at: new Date(now.getTime() + ttl * 1000).toISOString() }); } catch (e) {} }
    return { ...payload, _cache: 'miss' };
  } catch (e) {
    if (row) return { ...row.payload, _cache: 'stale' };
    if (m) return { ...m.payload, _cache: 'stale' };
    throw e;
  }
}
module.exports = { cached, TTL, db };
