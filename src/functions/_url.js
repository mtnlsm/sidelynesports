// Finds the Supabase API URL (https://<ref>.supabase.co) from whichever variable you set:
// SUPABASE_URL, or SUPABASE_DATABASE_URL (either the https URL or the postgres:// connection string).
// Last resort: the project URL already in js/supabase.js, so the site works even with no URL variable.
const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
const FALLBACK = 'https://xxmqyaxnchygtmfhcpim.supabase.co';
function fromAny(raw) {
  const v = clean(raw);
  if (!v) return '';
  if (/^https?:\/\//i.test(v)) { const m = v.match(/^https?:\/\/[^\/?#]+/i); return m ? m[0] : ''; }
  // postgres://postgres:pw@db.<ref>.supabase.co:5432/postgres   or   postgres://postgres.<ref>:pw@...pooler.supabase.com:6543/postgres
  let m = v.match(/@db\.([a-z0-9]+)\.supabase\.co/i); if (m) return 'https://' + m[1] + '.supabase.co';
  m = v.match(/\/\/postgres\.([a-z0-9]+):/i); if (m) return 'https://' + m[1] + '.supabase.co';
  m = v.match(/([a-z0-9]{20})\.supabase\.co/i); if (m) return 'https://' + m[1] + '.supabase.co';
  return '';
}
exports.supabaseUrl = () => fromAny(process.env.SUPABASE_URL) || fromAny(process.env.SUPABASE_DATABASE_URL) || FALLBACK;
