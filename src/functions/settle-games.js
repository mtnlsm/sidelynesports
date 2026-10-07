// Normal URL endpoint (NOT scheduled: Netlify can't open scheduled functions by URL). The app calls this when a game you picked ends,
// and you can open it in a browser to run payouts right now. It shows what it did and any errors. The 5-minute schedule is settle-games-cron.js.
const { run } = require('./_settle');
let last = 0, lastRes = null;
exports.handler = async (e) => {
  const fresh = e && e.queryStringParameters && e.queryStringParameters.fresh;
  if (!fresh && lastRes && Date.now() - last < 20000) return lastRes; // many players at once -> one run
  lastRes = await run({ diag: !!fresh }); last = Date.now();
  return lastRes;
};
