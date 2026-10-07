// Open /.netlify/functions/props in a browser to run the props job right now and see what it did.
const { run } = require('./_props');
exports.handler = async () => run();
