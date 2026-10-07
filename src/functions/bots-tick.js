// Scheduled (see netlify.toml). Creates the seeded accounts by itself on first run, then keeps them active.
// On by default; set BOTS_ENABLED=false in Netlify to pause. Optional manual run: ?secret=SETTLE_SECRET[&action=seed&count=8]
const { seed, tick, db } = require('./_bots');
exports.handler = async (e) => {
  const sb = db(); if (!sb) return { statusCode: 500, body: 'database not configured' };
  const q = (e && e.queryStringParameters) || {};
  const manual = !!(e && e.httpMethod && process.env.SETTLE_SECRET && q.secret === process.env.SETTLE_SECRET);
  if (e && e.httpMethod && !manual) return { statusCode: 401, body: 'unauthorized' };
  if (!manual && process.env.BOTS_ENABLED === 'false') return { statusCode: 200, body: 'bots disabled' };
  if (manual && q.action === 'seed') { const created = await seed(sb, Math.min(+q.count || 8, 16)); return { statusCode: 200, body: JSON.stringify({ created, errors: seed.errors }) }; }
  const { count, error: cerr } = await sb.from('bot_accounts').select('*', { count: 'exact', head: true });
  if (cerr) { console.error('bots-tick: bot_accounts missing?', cerr.message); return { statusCode: 500, body: JSON.stringify({ error: cerr.message, hint: 'Run supabase/bots.sql in the Supabase SQL Editor' }) }; }
  const made = !count || (count < 16 && Math.random() < 0.2) ? await seed(sb, 1) : []; // one new member at a time, on average about one every 1.5 hours
  return { statusCode: 200, body: JSON.stringify({ created: made, errors: seed.errors, ...(await tick(sb)) }) };
};
