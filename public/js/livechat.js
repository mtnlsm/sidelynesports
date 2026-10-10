// Live game chat + "eye" view counter. Only active on LIVE games.
// Loads AFTER livebox.js: it wraps lvHtml / startLive / sitLine, so app.js needs no changes.
(function () {
  const E = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const live = (g) => g && g.st === 'live';
  const EYE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
  const db = () => (typeof window.FX_DB !== 'undefined' ? window.FX_DB : null);
  const me = () => { try { return typeof ME !== 'undefined' ? ME : null; } catch (e) { return null; } };
  const say = (t) => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };

  const st = document.createElement('style');
  st.textContent = `
.vw{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--mu)}
.vw svg{flex:none}
.lvc{margin:10px 0 14px;border:1px solid var(--bd);border-radius:14px;background:var(--sf2);overflow:hidden}
.lvc-h{display:flex;align-items:center;justify-content:space-between;padding:9px 12px;border-bottom:1px solid var(--bd);font-size:13px}
.lvc-l{height:220px;overflow-y:auto;padding:8px 12px;display:flex;flex-direction:column;gap:7px;-webkit-overflow-scrolling:touch}
.lvc-m{font-size:13px;line-height:1.35;word-break:break-word}
.lvc-m b{font-weight:700;margin-right:5px}
.lvc-m.me b{color:var(--ab)}
.lvc-m button{background:none;color:var(--mu);font-size:12px;margin-left:6px;padding:0 4px}
.lvc-e{margin:auto;color:var(--mu);font-size:13px;text-align:center}
.lvc-f{display:flex;gap:6px;padding:8px;border-top:1px solid var(--bd)}
.lvc-f input{flex:1;min-width:0;font-size:16px;padding:8px 10px;border-radius:10px;border:1px solid var(--bd);background:var(--sf);color:var(--tx)}
.lvc-f button{padding:8px 14px;border-radius:10px;font-weight:700;background:var(--ab);color:var(--abx)}
.lvc-f button:disabled{opacity:.5}
.lvc-in{padding:10px 12px;border-top:1px solid var(--bd);font-size:13px;color:var(--mu);text-align:center}
.card .vw{margin-top:4px}`;
  document.head.appendChild(st);

  // ---------- view counts ----------
  const V = {}; // game id -> views
  const badge = (g) => (V[g.id] > 0 ? `<div class="vw" data-vw="${E(g.id)}" title="Views">${EYE}<span>${fmt(V[g.id])}</span></div>` : '');

  function paintBadges() {
    document.querySelectorAll('[data-vw]').forEach((el) => { const n = V[el.dataset.vw]; if (n > 0) { const s = el.querySelector('span'); if (s) s.textContent = fmt(n); } });
    document.querySelectorAll('.card.lv[data-g]').forEach((c) => {
      const id = c.dataset.g;
      if (V[id] > 0 && !c.querySelector('[data-vw]')) { const last = c.lastElementChild; if (last) last.insertAdjacentHTML('beforebegin', badge({ id })); }
    });
  }

  async function pullCounts() {
    const d = db(); if (!d || document.hidden) return;
    let ids = [];
    try { ids = (typeof G !== 'undefined' ? G : []).filter(live).map((g) => String(g.id)); } catch (e) {}
    if (!ids.length) return;
    try { const r = await d.rpc('game_view_counts', { ids }); if (!r.error && Array.isArray(r.data)) { r.data.forEach((x) => { V[x.game_id] = Number(x.views); }); paintBadges(); } } catch (e) {}
  }
  setTimeout(pullCounts, 2500); setInterval(pullCounts, 20000);

  async function track(g) {
    const d = db(); if (!d) return;
    const k = 'lvw:' + g.id;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) {}
    try { const r = await d.rpc('track_game_view', { gid: String(g.id) }); if (!r.error && r.data != null) { V[g.id] = Number(r.data); paintBadges(); } } catch (e) {}
  }

  // ---------- chat ----------
  const N = {}, TOKEN = {}; // per-game persistent chat node + session token

  function build(g) {
    const n = document.createElement('div');
    n.className = 'lvc';
    n.innerHTML = `<div class="lvc-h"><b>Live chat</b><span class="vw" data-vw="${E(g.id)}" title="Views">${EYE}<span>${V[g.id] > 0 ? fmt(V[g.id]) : '–'}</span></span></div><div class="lvc-l"><div class="lvc-e">Loading chat\u2026</div></div><div class="lvc-foot"></div>`;
    return n;
  }

  function foot(n, g, send) {
    const f = n.querySelector('.lvc-foot'), u = me();
    if (!u) { f.innerHTML = '<div class="lvc-in">Sign in to join the chat.</div>'; return; }
    if (f.querySelector('input')) return;
    f.innerHTML = '<div class="lvc-f"><input type="text" maxlength="300" placeholder="Say something\u2026" aria-label="Chat message" enterkeyhint="send"><button type="button">Send</button></div>';
    const i = f.querySelector('input'), b = f.querySelector('button');
    const go = async () => { const t = i.value.trim(); if (!t || b.disabled) return; b.disabled = true; const ok = await send(t); if (ok) i.value = ''; setTimeout(() => { b.disabled = false; }, 1500); };
    b.onclick = go; i.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
  }

  function initChat(g, m) {
    const tok = (TOKEN[g.id] = (TOKEN[g.id] || 0) + 1);
    const n = N[g.id] || (N[g.id] = build(g));
    const list = n.querySelector('.lvc-l');
    let sig = '', ch = null, tm = 0, busy = 0;
    const alive = () => m.isConnected && TOKEN[g.id] === tok;

    const attach = () => { const s = m.querySelector('.lvc-slot'); if (s && !s.contains(n)) s.appendChild(n); };
    attach();
    const mo = new MutationObserver(() => { if (!alive()) { mo.disconnect(); return; } attach(); });
    mo.observe(m, { childList: true, subtree: true });

    const render = (rows) => {
      const s = rows.map((r) => r.id).join(',') + '|' + (me() ? 1 : 0);
      if (s === sig) return; sig = s;
      const near = list.scrollHeight - list.scrollTop - list.clientHeight < 60, u = me();
      list.innerHTML = rows.length ? rows.map((r) => {
        const p = r.profiles || {}, mine = u && r.user_id === u.id, canDel = mine || (u && u.role === 'admin');
        return `<div class="lvc-m${mine ? ' me' : ''}"><b>@${E(p.username || 'fan')}</b>${E(r.body)}${canDel ? `<button type="button" data-del="${r.id}" aria-label="Delete message">\u00d7</button>` : ''}</div>`;
      }).join('') : '<div class="lvc-e">No messages yet. Start the conversation!</div>';
      if (near || rows.length <= 1) list.scrollTop = list.scrollHeight;
    };

    const load = async () => {
      const d = db(); if (!d || !alive() || busy) return; busy = 1;
      try {
        const since = new Date(Date.now() - 864e5).toISOString();
        const r = await d.from('live_chat').select('id,user_id,body,created_at,profiles(username)').eq('game_id', String(g.id)).gt('created_at', since).order('id', { ascending: false }).limit(60);
        if (!r.error && r.data) render(r.data.slice().reverse());
        else if (r.error && !sig) list.innerHTML = '<div class="lvc-e">Chat isn\u2019t available right now.</div>';
      } catch (e) {}
      busy = 0; foot(n, g, send);
    };

    const send = async (t) => {
      const d = db(), u = me(); if (!d || !u) return false;
      const r = await d.from('live_chat').insert({ game_id: String(g.id), user_id: u.id, body: t.slice(0, 300) });
      if (r.error) { say(/slow down/i.test(r.error.message || '') ? 'Slow down a little' : 'Couldn\u2019t send that message'); return false; }
      await load(); list.scrollTop = list.scrollHeight; return true;
    };

    n.onclick = async (e) => {
      const b = e.target.closest('[data-del]'); if (!b) return;
      const d = db(); if (!d) return;
      const r = await d.from('live_chat').delete().eq('id', b.dataset.del);
      if (r.error) say('Couldn\u2019t delete that message'); else load();
    };

    const d = db();
    if (d) { try { ch = d.channel('lvc:' + g.id).on('postgres_changes', { event: '*', schema: 'public', table: 'live_chat', filter: 'game_id=eq.' + g.id }, () => { clearTimeout(tm); tm = setTimeout(load, 250); }).subscribe(); } catch (e) {} }
    const stop = () => { mo.disconnect(); if (ch && d) { try { d.removeChannel(ch); } catch (e) {} ch = null; } };
    const poll = async () => { if (!alive()) { stop(); return; } if (!document.hidden) await load(); setTimeout(poll, 10000); };
    poll();
  }

  // ---------- hooks into livebox.js / app.js ----------
  const oHtml = window.lvHtml, oStart = window.startLive, oSit = window.sitLine;
  window.lvHtml = (g) => (oHtml ? oHtml(g) : '') + (live(g) ? `<div class="lvc-slot" data-lvc="${E(g.id)}"></div>` : '');
  window.startLive = (g, m) => { if (oStart) oStart(g, m); if (live(g)) { track(g); initChat(g, m); } };
  window.sitLine = (g) => (oSit ? oSit(g) : '') + (live(g) ? badge(g) : '');
})();
