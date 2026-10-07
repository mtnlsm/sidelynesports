// Every 15 minutes: posts new props for a quarter of the leagues (rotating), so each run stays under the free 50-request limit.
const { run } = require('./_props');
exports.handler = async () => { const r = await run({ mode: 'create' }); console.log('props-cron', r.statusCode, r.body); return { statusCode: 200 }; };
