// Every 10 minutes: pays out finished games (6 team games + 2 UFC/PFL fights per run).
const { run } = require('./_props');
exports.handler = async () => { const r = await run({ mode: 'settle' }); console.log('props-settle-cron', r.statusCode, r.body); return { statusCode: 200 }; };
