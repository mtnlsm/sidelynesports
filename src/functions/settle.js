// Server-side settlement. Call after an event is final: POST {event_id, winner} with header x-settle-secret.
const { db } = require('./_cache');
exports.handler = async (e) => {
  if (e.httpMethod !== 'POST' || e.headers['x-settle-secret'] !== process.env.SETTLE_SECRET) return { statusCode: 401, body: 'unauthorized' };
  const { event_id, winner } = JSON.parse(e.body || '{}');
  const { error } = await db().rpc('settle_event', { p_event: event_id, p_winner: winner });
  return { statusCode: error ? 500 : 200, body: JSON.stringify({ ok: !error }) };
};
