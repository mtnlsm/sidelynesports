// Username login. Looks up the email for a username server-side (the email is never sent to the browser),
// signs in with it, and returns the session tokens. Needs SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
//
// Fixes vs. the old version:
//  - Server/config problems (bad service key, wrong anon key, Supabase down) are no longer disguised as
//    "Incorrect username or password". They return a 500 with a specific message and are logged.
//  - New-style Supabase keys (sb_secret_... / sb_publishable_...) are not JWTs, so they must only be sent
//    in the `apikey` header, not as a Bearer token.
//  - Username is URL-encoded in the query.
//  - Every upstream response is checked for r.ok before it is trusted.
const out = (c, b) => ({ statusCode: c, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });

const hdr = (key) => {
  const h = { apikey: key };
  if (String(key).startsWith('eyJ')) h.Authorization = 'Bearer ' + key; // legacy JWT keys only
  return h;
};

const readJson = async (r) => { const t = await r.text(); try { return t ? JSON.parse(t) : null; } catch (e) { return t; } };

exports.handler = async (ev) => {
  if (ev.httpMethod !== 'POST') return out(405, { error: 'Method not allowed' });

  const clean = (v) => String(v || '').trim().replace(/^["']|["']$/g, '').trim();
  const URL = require('./_url').supabaseUrl();
  const SR = clean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const ANON = clean(process.env.SUPABASE_ANON_KEY);
  if (!URL || !SR || !ANON) {
    console.error('login: missing env', { url: !!URL, service_role: !!SR, anon: !!ANON });
    return out(500, { error: 'Login is not configured on the server (missing ' + [!SR && 'SUPABASE_SERVICE_ROLE_KEY', !ANON && 'SUPABASE_ANON_KEY'].filter(Boolean).join(', ') + ').' });
  }

  let b; try { b = JSON.parse(ev.body || '{}'); } catch (e) { return out(400, { error: 'Bad request' }); }
  const u = String(b.username || '').trim().toLowerCase().replace(/^@/, ''), pw = String(b.password || '');
  const bad = () => out(401, { error: 'Incorrect username or password.' });
  if (!/^[a-z0-9_]{3,20}$/.test(u) || !pw) return bad();

  try {
    // 1) username -> profile id (service role bypasses RLS)
    const pr = await fetch(`${URL}/rest/v1/profiles?select=id&username=eq.${encodeURIComponent(u)}&limit=1`, { headers: hdr(SR) });
    const p = await readJson(pr);
    if (!pr.ok) {
      console.error('login: profiles lookup failed', pr.status, p);
      return out(500, { error: 'Login lookup failed (' + pr.status + '). Check SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL on the Worker.' });
    }
    if (!Array.isArray(p) || !p[0]) return bad(); // genuinely no such username

    // 2) profile id -> email (admin API)
    const ur = await fetch(`${URL}/auth/v1/admin/users/${p[0].id}`, { headers: hdr(SR) });
    const usr = await readJson(ur);
    if (!ur.ok) {
      console.error('login: admin user lookup failed', ur.status, usr);
      return out(500, { error: 'Login lookup failed (auth ' + ur.status + '). The service role key may be wrong or for a different project.' });
    }
    if (!usr || !usr.email) return bad();

    // 3) email + password -> session
    const r = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { ...hdr(ANON), 'content-type': 'application/json' },
      body: JSON.stringify({ email: usr.email, password: pw }),
    });
    const j = (await readJson(r)) || {};
    if (!r.ok) {
      const msg = String(j.error_code || j.msg || j.error_description || j.error || '');
      if (/confirm/i.test(msg)) return out(401, { error: 'Please confirm your email first, then log in.' });
      if (r.status === 400 || r.status === 401 || /invalid_credentials|invalid login/i.test(msg)) return bad();
      console.error('login: token request failed', r.status, j);
      return out(500, { error: 'Login failed (' + r.status + '). Check SUPABASE_ANON_KEY on the Worker.' });
    }
    if (!j.access_token || !j.refresh_token) {
      console.error('login: token response had no tokens', j);
      return out(500, { error: 'Login failed. Try again.' });
    }
    return out(200, { access_token: j.access_token, refresh_token: j.refresh_token });
  } catch (e) {
    console.error('login: exception', e && e.message);
    return out(500, { error: 'Login failed. Try again.' });
  }
};
