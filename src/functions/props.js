// Open /api/props in a browser to settle finished games right now and see what it did.
// /api/props?mode=create            posts props for this run's group of leagues (add &group=0..3 to pick a group; all 4 = every league)
// /api/props?mma=UFC:401706833      checks what the job finds for one UFC/PFL fight (changes nothing).
const { run, mmaCheck } = require('./_props');
exports.handler = async (e) => { const q = (e && e.queryStringParameters) || {}; return q.mma ? mmaCheck(String(q.mma)) : run({ mode: q.mode === 'create' ? 'create' : 'settle', group: q.group !== undefined ? Number(q.group) : undefined }); };
