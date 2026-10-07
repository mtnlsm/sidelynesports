// Runs every 20 minutes (schedule in netlify.toml; only runs on the published production deploy). bots-tick is the URL version (secret protected).
exports.handler = async () => { const r = await require('./bots-tick').handler({}); console.log('bots-cron', r.statusCode, r.body); return { statusCode: 200 }; };
