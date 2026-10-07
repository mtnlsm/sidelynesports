// Tiny Supabase client that needs NO npm packages (plain fetch). Used automatically when '@supabase/supabase-js' isn't available in the deployed function.
// Supports exactly what this site uses: from().select/insert/upsert/update/delete + filters, rpc(), auth.admin.createUser/deleteUser.
exports.create = (url, key) => {
  const H = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  const enc = encodeURIComponent, qv = (x) => '"' + String(x).replace(/"/g, '\\"') + '"';
  const call = async (path, o = {}) => {
    try {
      const r = await fetch(url + path, { ...o, headers: { ...H, ...(o.headers || {}) } });
      const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { j = t; }
      if (!r.ok) return { data: null, error: { message: (j && (j.message || j.msg || j.error_description || j.error)) || ('HTTP ' + r.status), code: j && j.code, details: j && j.details }, status: r.status };
      return { data: j, error: null, status: r.status, range: r.headers.get('content-range') };
    } catch (e) { return { data: null, error: { message: String(e.message || e) } }; }
  };
  function from(table) {
    const q = { m: 'GET', f: [], sel: '*', ord: [], lim: null, body: null, prefer: [], count: null, head: false, one: false, oc: null };
    const b = {
      select(c, o) { q.sel = c || '*'; if (o && o.count) q.count = o.count; if (o && o.head) q.head = true; return b; },
      insert(v) { q.m = 'POST'; q.body = v; return b; },
      upsert(v, o) { q.m = 'POST'; q.body = v; q.prefer.push('resolution=' + (o && o.ignoreDuplicates ? 'ignore' : 'merge') + '-duplicates'); if (o && o.onConflict) q.oc = o.onConflict; return b; },
      update(v) { q.m = 'PATCH'; q.body = v; return b; },
      delete() { q.m = 'DELETE'; return b; },
      eq(c, v) { q.f.push(c + '=eq.' + enc(v)); return b; }, neq(c, v) { q.f.push(c + '=neq.' + enc(v)); return b; },
      gt(c, v) { q.f.push(c + '=gt.' + enc(v)); return b; }, lt(c, v) { q.f.push(c + '=lt.' + enc(v)); return b; },
      is(c, v) { q.f.push(c + '=is.' + (v === null ? 'null' : v)); return b; },
      in(c, a) { q.f.push(c + '=in.(' + a.map(qv).join(',') + ')'); return b; },
      order(c, o) { q.ord.push(c + '.' + (o && o.ascending === false ? 'desc' : 'asc')); return b; },
      limit(n) { q.lim = n; return b; }, maybeSingle() { q.one = true; return b; }, single() { q.one = true; return b; },
      then(res, rej) { return run().then(res, rej); },
    };
    async function run() {
      const p = []; q.f.forEach((x) => p.push(x));
      const read = q.m === 'GET';
      if (read) p.push('select=' + enc(q.sel));
      if (q.ord.length) p.push('order=' + q.ord.join(','));
      if (q.lim != null) p.push('limit=' + q.lim);
      if (q.oc) p.push('on_conflict=' + enc(q.oc));
      const pref = [...q.prefer]; if (q.count) pref.push('count=' + q.count); if (!read) pref.push('return=minimal');
      const r = await call('/rest/v1/' + table + (p.length ? '?' + p.join('&') : ''), { method: q.head ? 'HEAD' : q.m, body: q.body == null ? undefined : JSON.stringify(q.body), headers: pref.length ? { Prefer: pref.join(',') } : {} });
      if (r.error) return { data: null, error: r.error, count: null };
      let count = null; if (r.range && r.range.includes('/')) { const n = Number(r.range.split('/')[1]); if (Number.isFinite(n)) count = n; }
      return { data: q.one ? (Array.isArray(r.data) ? r.data[0] || null : r.data) : (read ? r.data : null), error: null, count };
    }
    return b;
  }
  const rpc = async (name, args) => { const r = await call('/rest/v1/rpc/' + name, { method: 'POST', body: JSON.stringify(args || {}) }); return { data: r.data, error: r.error }; };
  const auth = { admin: {
    createUser: async (b) => { const r = await call('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify(b) }); return r.error ? { data: { user: null }, error: r.error } : { data: { user: r.data }, error: null }; },
    deleteUser: async (id) => { const r = await call('/auth/v1/admin/users/' + id, { method: 'DELETE' }); return { data: null, error: r.error }; },
  } };
  return { from, rpc, auth };
};
