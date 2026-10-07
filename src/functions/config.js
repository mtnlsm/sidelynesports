// Public config only. Anon key is safe to expose; service-role key never is.
exports.handler = async () => ({ statusCode: 200, headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ url: require('./_url').supabaseUrl(), anonKey: process.env.SUPABASE_ANON_KEY || '' }) });
