// Runs every 5 minutes (schedule in netlify.toml; only runs on the published production deploy).
const { run } = require('./_settle');
exports.handler = async () => { const r = await run(); console.log('settle-games-cron', r.statusCode, r.body); return { statusCode: 200 }; };
