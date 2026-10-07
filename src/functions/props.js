// Open /.netlify/functions/props in a browser to run the props job right now and see what it did.
// Open /.netlify/functions/props?mma=UFC:401706833 to check what the job finds for one UFC/PFL fight (changes nothing).
const { run, mmaCheck } = require('./_props');
exports.handler = async (e) => { const q = (e && e.queryStringParameters) || {}; return q.mma ? mmaCheck(String(q.mma)) : run(); };
