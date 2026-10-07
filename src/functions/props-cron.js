// Runs every 15 minutes (schedule in netlify.toml): posts new props for upcoming games and settles finished ones.
const { run } = require('./_props');
exports.handler = async () => { const r = await run(); console.log('props-cron', r.statusCode, r.body); return { statusCode: 200 }; };
