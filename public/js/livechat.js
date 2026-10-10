// Live game FEED (twitter-style): real-time posts, comments and likes, plus the eye view counter.
// Only active on LIVE games. Loads AFTER livebox.js: wraps lvHtml / startLive / sitLine, so app.js needs no changes.
(function () {
  const E = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const live = (g) => g && g.st === 'live';
  const SV = (p, fill) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${fill || 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const EYE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICO_RP = SV('<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>');
  const ICO_FL = SV('<path d="M4 22V4M4 4h13l-2 4 2 4H4"/>');
  const ICO_OV = SV('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>');
  const ICO_LK = (on) => SV('<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4z"/>', on ? 'currentColor' : 'none');
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
  const db = () => (typeof window.FX_DB !== 'undefined' ? window.FX_DB : null);
  const me = () => { try { return typeof ME !== 'undefined' ? ME : null; } catch (e) { return null; } };
  const say = (t) => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const ago = (d) => { const s = Math.max(0, (Date.now() - Date.parse(d)) / 1000); return s < 10 ? 'now' : s < 60 ? Math.floor(s) + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };
  const av = (u, z) => { try { if (typeof avHtml === 'function') return avHtml(u, z); } catch (e) {} return `<div class="lvp-fb" style="width:${z}px;height:${z}px">${E((u.display_name || u.username || '?')[0].toUpperCase())}</div>`; };
  const nameOf = (u) => E(u.display_name || u.username || 'Fan');
  const flair = (u) => { try { if (typeof flr === 'function') return flr(u); } catch (e) {} return ''; };
  const ulink = (u, inner) => (u.username && u.username !== 'fan' ? `<a class="ulk" href="/@${E(u.username)}" data-u="${E(u.username)}">${inner}</a>` : inner);
  const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

  const st = document.createElement('style');
  st.textContent = `
.vw{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--mu)}
.vw svg{flex:none}
.card .vw{margin-top:4px}
.vw-live i{width:7px;height:7px;border-radius:50%;background:#ff3b30;flex:none;animation:lvpulse 1.8s infinite}
.lvw-tot{margin:8px 0 2px}
.lvo-btn{display:flex;align-items:center;justify-content:center;gap:8px;margin:10px 0 0;padding:10px 14px;border:1px solid var(--bd);border-radius:12px;background:var(--sf2);color:var(--tx);font-size:14px;font-weight:700;text-decoration:none}
.lvo-btn:hover{border-color:var(--ab)}
.lvp-act .lvp-rep{margin-left:auto}
.lvr-t{width:100%;margin-top:10px;padding:10px 12px;border-radius:10px;border:1px solid var(--bd);background:var(--sf);color:var(--tx);font:inherit;font-size:16px;resize:none}
.lvf{margin:10px 0 14px;border:1px solid var(--bd);border-radius:14px;background:var(--sf2);overflow:hidden;position:relative}
.lvf-h{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--bd);font-size:14px}
.lvf-h .t{display:inline-flex;align-items:center;gap:8px}
.lvf-dot{width:8px;height:8px;border-radius:50%;background:var(--mu);opacity:.5}
.lvf-dot.on{background:#ff3b30;opacity:1;animation:lvpulse 1.8s infinite}
@keyframes lvpulse{0%{box-shadow:0 0 0 0 rgba(255,59,48,.6)}70%{box-shadow:0 0 0 7px rgba(255,59,48,0)}100%{box-shadow:0 0 0 0 rgba(255,59,48,0)}}
.lvf-c{padding:10px 12px;border-bottom:1px solid var(--bd)}
.lvf-c .r{display:flex;gap:10px;align-items:flex-start}
.lvf-c textarea{flex:1;min-width:0;resize:none;border:0;outline:0;background:none;color:var(--tx);font:inherit;font-size:16px;line-height:1.35;min-height:44px;padding:4px 0}
.lvf-c .b{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:6px;font-size:12px;color:var(--mu)}
.lvf-c .b .bad{color:var(--bad)}
.lvf-btn{padding:7px 16px;border-radius:999px;font-weight:800;font-size:14px;background:var(--ab);color:var(--abx)}
.lvf-btn:disabled{opacity:.45}
.lvf-in{padding:12px;font-size:13px;color:var(--mu);text-align:center}
.lvf-l{max-height:520px;overflow-y:auto;-webkit-overflow-scrolling:touch}
.lvf-e{padding:26px 14px;color:var(--mu);font-size:13px;text-align:center}
.lvf-pill{position:absolute;left:50%;top:92px;transform:translateX(-50%);z-index:2;padding:7px 14px;border-radius:999px;font-weight:800;font-size:13px;background:var(--ab);color:var(--abx);box-shadow:0 4px 14px rgba(0,0,0,.25)}
.lvp{display:flex;gap:10px;padding:12px;border-bottom:1px solid var(--bd)}
.lvp:last-child{border-bottom:0}
.lvp-new{animation:lvin .4s ease}
@keyframes lvin{from{opacity:0;transform:translateY(-8px);background:rgba(23,147,79,.14)}to{opacity:1;transform:none}}
.lvp-a{flex:none}
.lvp-b{min-width:0;flex:1}
.lvp-t{display:flex;align-items:center;gap:5px;font-size:14px;flex-wrap:wrap}
.lvp-t b{font-weight:800}
.lvp-t .mu{font-size:13px}
.lvp-t a{color:inherit;text-decoration:none}
.lvp-x{font-size:15px;line-height:1.35;margin-top:2px;white-space:pre-wrap;word-break:break-word}
.lvp-act{display:flex;gap:22px;margin-top:6px}
.lvp-act button{display:inline-flex;align-items:center;gap:5px;background:none;color:var(--mu);font-size:13px;font-weight:600;padding:3px 0}
.lvp-act button.on{color:var(--bad)}
.lvp-del{margin-left:auto;background:none;color:var(--mu);font-size:15px;padding:0 4px}
.lvp-cm{margin-top:8px;padding-top:4px;border-top:1px solid var(--bd)}
.lvp-more{background:none;color:var(--ab);font-size:13px;font-weight:700;padding:6px 0}
.lvk{display:flex;gap:8px;padding:7px 0}
.lvk .lvp-x{font-size:14px}
.lvk .lvp-act{margin-top:3px}
.lvk .lvp-act button{font-size:12px}
.lvk .lvp-act svg{width:14px;height:14px}
.lvp-rc{display:flex;gap:8px;align-items:center;margin-top:6px}
.lvp-rc input{flex:1;min-width:0;font-size:16px;padding:8px 12px;border-radius:999px;border:1px solid var(--bd);background:var(--sf);color:var(--tx)}
.lvp-rc button{padding:7px 14px;border-radius:999px;font-weight:700;background:var(--ab);color:var(--abx);font-size:13px}
.lvp-fb{border-radius:50%;background:var(--ab);color:var(--abx);display:flex;align-items:center;justify-content:center;font-weight:800}`;
  document.head.appendChild(st);

  // ---------- view counts ----------
  // LIVE games show how many people are watching right now (realtime presence: counts people who have that game open).
  // When the game ends, every viewer who watched during it has been added up into one TOTAL that stays on the game.
  const V = {};   // game id -> total views (counted once per viewer while the game was live)
  const L = {};   // game id -> watching right now
  const gameOf = (id) => { try { return (typeof G !== 'undefined' ? G : []).find((x) => String(x.id) === String(id)); } catch (e) { return null; } };
  const vtxt = (id, k) => (k === 'live' ? fmt(L[id] || 0) + ' watching' : fmt(V[id] || 0) + ' views');
  const badge = (g) => {
    const id = String(g.id);
    if (live(g)) return (L[id] || 0) > 0 ? `<div class="vw vw-live" data-vw="${E(id)}" data-k="live" title="Watching now"><i></i><span>${vtxt(id, 'live')}</span></div>` : '';
    if (g.st === 'final') return V[id] > 0 ? `<div class="vw" data-vw="${E(id)}" data-k="total" title="Total views">${EYE}<span>${vtxt(id, 'total')}</span></div>` : '';
    return '';
  };
  function paintBadges() {
    document.querySelectorAll('[data-vw]').forEach((el) => {
      const id = el.dataset.vw, k = el.dataset.k, s = el.querySelector('span');
      if (s) s.textContent = k === 'live' ? vtxt(id, 'live') : (V[id] > 0 ? vtxt(id, 'total') : '\u2013');
    });
    document.querySelectorAll('.card[data-g]').forEach((c) => {
      const id = c.dataset.g;
      if (c.querySelector('[data-vw]')) return;
      const g = gameOf(id), h = g && badge(g);
      if (h) { const last = c.lastElementChild; if (last) last.insertAdjacentHTML('beforebegin', h); }
    });
  }
  // totals only matter once a game is over
  async function pullCounts(force) {
    const d = db(); if (!d || (document.hidden && !force)) return;
    let ids = [];
    try { ids = (typeof G !== 'undefined' ? G : []).filter((g) => g.st === 'final').map((g) => String(g.id)).filter((i) => /^[A-Z0-9]+:[0-9]{3,}$/.test(i)).slice(0, 150); } catch (e) {}
    if (!ids.length) return;
    try { const r = await d.rpc('game_view_counts', { ids }); if (!r.error && Array.isArray(r.data)) { r.data.forEach((x) => { V[x.game_id] = Number(x.views); }); paintBadges(); } } catch (e) {}
  }
  setTimeout(pullCounts, 2500); setInterval(pullCounts, 30000);

  // one shared presence channel: each open game sheet announces which game it is watching
  const RID = Math.random().toString(36).slice(2) + Date.now().toString(36);
  let vch = null, vready = 0, watching = null;
  function presence() {
    const d = db(); if (!d || vch) return;
    try {
      vch = d.channel('lvv:all', { config: { presence: { key: RID } } });
      vch.on('presence', { event: 'sync' }, () => {
        const c = {};
        Object.values(vch.presenceState()).forEach((arr) => arr.forEach((p) => { if (p && p.g) c[p.g] = (c[p.g] || 0) + 1; }));
        Object.keys(L).forEach((k) => { if (!c[k]) L[k] = 0; });
        Object.assign(L, c); paintBadges();
      }).subscribe((status) => { vready = status === 'SUBSCRIBED' ? 1 : 0; if (vready && watching) { try { vch.track({ g: watching }); } catch (e) {} } });
    } catch (e) { console.error('presence', e); }
  }
  setTimeout(presence, 1500);
  function watch(g, m) {
    const id = String(g.id); watching = id; presence();
    if (vready) { try { vch.track({ g: id }); } catch (e) {} }
    L[id] = Math.max(L[id] || 0, 1); paintBadges();      // you count yourself right away
    const t = setInterval(() => {
      if (m.isConnected) return;
      clearInterval(t);
      if (watching === id) { watching = null; if (vch && vready) { try { vch.untrack(); } catch (e) {} } }
    }, 1500);
  }
  // each viewer is added to the game's running total once per session, while it is live
  async function track(g) {
    const d = db(); if (!d) return;
    const k = 'lvw:' + g.id;
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1'); } catch (e) {}
    try { await d.rpc('track_game_view', { gid: String(g.id) }); } catch (e) {}
  }

  // ---------- feed ----------
  const N = {}, TOKEN = {}; // per-game persistent feed (node + state), session token

  function build(g) {
    const s = { rows: [], cnt: {}, mine: new Set(), open: new Set(), seen: new Set(), rendered: new Set(), pending: new Map(), prof: {}, first: 1, drawn: 0, pend: 0, rd: {}, uid: null, force: 0, sig: '', live: 0 };
    const n = document.createElement('div');
    n.className = 'lvf';
    n.innerHTML = `<div class="lvf-h"><span class="t"><b>Live feed</b><i class="lvf-dot" title="Real-time"></i></span><span class="vw vw-live" data-vw="${E(g.id)}" data-k="live" title="Watching now"><i></i><span>${vtxt(g.id, 'live')}</span></span></div><div class="lvf-c"></div><button type="button" class="lvf-pill" hidden data-pill></button><div class="lvf-l"><div class="lvf-e">Loading feed\u2026</div></div>`;
    return { n, s, ch: null };
  }

  function initFeed(g, m) {
    const tok = (TOKEN[g.id] = (TOKEN[g.id] || 0) + 1);
    const F = N[g.id] || (N[g.id] = build(g)), n = F.n, s = F.s;
    const list = n.querySelector('.lvf-l'), comp = n.querySelector('.lvf-c'), pill = n.querySelector('[data-pill]'), dot = n.querySelector('.lvf-dot');
    let tm = 0, busy = 0, again = 0;
    const alive = () => m.isConnected && TOKEN[g.id] === tok;

    const attach = () => { const sl = m.querySelector('.lvc-slot'); if (sl && !sl.contains(n)) sl.appendChild(n); };
    attach();
    const mo = new MutationObserver(() => { if (!alive()) { mo.disconnect(); return; } attach(); });
    mo.observe(m, { childList: true, subtree: true });

    const user = (r) => { const c = me(); return s.prof[r.user_id] || (c && c.id === r.user_id ? c : { username: 'fan' }); };
    const repBtn = (r) => { const c = me(); return c && r.user_id !== c.id && !String(r.id).startsWith('tmp') ? `<button type="button" class="lvp-rep" data-rep="${r.id}" aria-label="Report" title="Report">${ICO_FL}</button>` : ''; };
    const isNew = (id) => (s.drawn && !s.rendered.has(id) ? ' lvp-new' : '');

    const comment = (r) => {
      const u = user(r), c = me(), mine = c && r.user_id === c.id, canDel = mine || (c && c.role === 'admin'), liked = s.mine.has(r.id), lc = s.cnt[r.id] || 0;
      return `<div class="lvk${isNew(r.id)}"><div class="lvp-a">${ulink(u, av(u, 28))}</div><div class="lvp-b"><div class="lvp-t">${ulink(u, `<b>${nameOf(u)}</b>`)}${flair(u)}<span class="mu">@${E(u.username || 'fan')} \u00b7 ${ago(r.created_at)}</span>${canDel ? `<button type="button" class="lvp-del" data-del="${r.id}" aria-label="Delete">\u00d7</button>` : ''}</div><div class="lvp-x">${E(r.body)}</div><div class="lvp-act"><button type="button" class="${liked ? 'on' : ''}" data-lk="${r.id}" aria-label="Like">${ICO_LK(liked)}<span>${lc || ''}</span></button>${repBtn(r)}</div></div></div>`;
    };

    const post = (r) => {
      const u = user(r), c = me(), mine = c && r.user_id === c.id, canDel = mine || (c && c.role === 'admin');
      const kids = s.rows.filter((x) => x.parent_id === r.id).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const liked = s.mine.has(r.id), lc = s.cnt[r.id] || 0, expanded = s.open.has(r.id), hide = !expanded && kids.length > 3 ? kids.length - 3 : 0;
      const shown = hide ? kids.slice(-3) : kids;
      const cm = kids.length || c ? `<div class="lvp-cm">${hide ? `<button type="button" class="lvp-more" data-ex="${r.id}">View all ${kids.length} comments</button>` : ''}${shown.map(comment).join('')}${c ? `<div class="lvp-rc">${av(c, 26)}<input type="text" maxlength="280" placeholder="Write a comment\u2026" data-ri="${r.id}" value="${E(s.rd[r.id] || '')}" enterkeyhint="send"><button type="button" data-rs="${r.id}">Post</button></div>` : ''}</div>` : '';
      return `<article class="lvp${isNew(r.id)}"><div class="lvp-a">${ulink(u, av(u, 38))}</div><div class="lvp-b"><div class="lvp-t">${ulink(u, `<b>${nameOf(u)}</b>`)}${flair(u)}<span class="mu">@${E(u.username || 'fan')} \u00b7 ${ago(r.created_at)}</span>${canDel ? `<button type="button" class="lvp-del" data-del="${r.id}" aria-label="Delete">\u00d7</button>` : ''}</div><div class="lvp-x">${E(r.body)}</div><div class="lvp-act"><button type="button" data-cm="${r.id}" aria-label="Comment">${ICO_RP}<span>${kids.length || ''}</span></button><button type="button" class="${liked ? 'on' : ''}" data-lk="${r.id}" aria-label="Like">${ICO_LK(liked)}<span>${lc || ''}</span></button>${repBtn(r)}</div>${cm}</div></article>`;
    };

    const render = (force) => {
      const tops = s.rows.filter((r) => !r.parent_id && s.seen.has(r.id)), c = me();
      const sig = [s.rows.map((r) => r.id + ':' + (s.cnt[r.id] || 0)).join(','), tops.length, [...s.mine].join('.'), [...s.open].join('.'), Math.floor(Date.now() / 6e4), c ? c.id : '', s.pend, Object.keys(s.prof).length].join('|');
      if (!force && sig === s.sig) return; s.sig = sig;
      const a = document.activeElement, ri = a && list.contains(a) && a.dataset && a.dataset.ri, pos = ri && a.selectionStart;
      const top = list.scrollTop;
      list.innerHTML = tops.length ? tops.map(post).join('') : '<div class="lvf-e">No posts yet. Be the first to post about this game!</div>';
      list.scrollTop = top;
      if (ri) { const i = list.querySelector(`[data-ri="${ri}"]`); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} } }
      s.rows.forEach((r) => s.rendered.add(r.id)); s.drawn = 1;
      pill.hidden = !s.pend; pill.textContent = s.pend + (s.pend === 1 ? ' new post' : ' new posts');
    };

    const composer = () => {
      const c = me(), id = c ? c.id : '';
      if (s.uid === id && comp.firstChild) return; s.uid = id;
      if (!c) { comp.innerHTML = '<div class="lvf-in" style="padding:2px 0">Sign in to post, comment and like.</div>'; return; }
      comp.innerHTML = `<div class="r">${av(c, 38)}<textarea maxlength="280" rows="2" placeholder="What\u2019s happening in the game?" aria-label="Post"></textarea></div><div class="b"><span data-cc>280</span><button type="button" class="lvf-btn" disabled>Post</button></div>`;
      const t = comp.querySelector('textarea'), b = comp.querySelector('.lvf-btn'), cc = comp.querySelector('[data-cc]');
      t.oninput = () => { const left = 280 - t.value.length; cc.textContent = left; cc.className = left < 20 ? 'bad' : ''; b.disabled = !t.value.trim(); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
      const go = async () => { const v = t.value.trim(); if (!v || b.disabled) return; b.disabled = true; t.value = ''; t.oninput(); list.scrollTop = 0; if (!(await send(v, null))) { t.value = v; t.oninput(); } };
      b.onclick = go; t.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); } };
    };

    async function profiles(uids) {
      const d = db(), need = [...new Set(uids)].filter((i) => !s.prof[i]);
      for (const part of chunk(need, 40)) {
        let r = await d.from('profiles').select('id,username,display_name,avatar_url,flair,border').in('id', part);
        if (r.error) r = await d.from('profiles').select('id,username,display_name,avatar_url').in('id', part);
        if (!r.error && r.data) r.data.forEach((p) => { s.prof[p.id] = p; });
      }
    }

    async function load() {
      const d = db(); if (!d || !alive()) return;
      if (busy) { again = 1; return; } busy = 1;
      try {
        const since = new Date(Date.now() - 864e5).toISOString(), c = me();
        const r = await d.from('live_posts').select('id,user_id,parent_id,body,created_at').eq('game_id', String(g.id)).gt('created_at', since).order('created_at', { ascending: false }).limit(200);
        if (r.error) {
          console.error('Live feed error:', r.error);
          if (s.first) { const msg = String(r.error.message || r.error.code || ''), missing = /does not exist|schema cache|relation|42P01|PGRST20/i.test(msg + ' ' + (r.error.code || '')); list.innerHTML = '<div class="lvf-e">The feed isn\u2019t available right now.<br><small>' + E(missing ? 'Database tables not found. Run supabase/live_chat.sql in the Supabase SQL Editor.' : msg.slice(0, 160)) + '</small></div>'; }
        } else if (r.data) {
          const rows = r.data.slice();
          s.pending.forEach((p) => { if (!rows.some((x) => x.id === p.id)) rows.unshift(p); });
          const ids = rows.map((x) => x.id).filter((i) => !String(i).startsWith('tmp'));
          // who wrote them + like counts (separate queries: no fragile joins)
          const [, lk] = await Promise.all([profiles(rows.map((x) => x.user_id)), Promise.all(chunk(ids, 50).map((part) => d.from('live_post_likes').select('post_id,user_id').in('post_id', part)))]);
          const cnt = {}, mine = new Set();
          lk.forEach((q) => { if (!q.error && q.data) q.data.forEach((x) => { cnt[x.post_id] = (cnt[x.post_id] || 0) + 1; if (c && x.user_id === c.id) mine.add(x.post_id); }); });
          s.rows = rows; s.cnt = cnt; s.mine = mine;
          const fresh = rows.filter((x) => !x.parent_id && !s.seen.has(x.id)), atTop = list.scrollTop < 40;
          if (s.first || atTop || s.force) { fresh.forEach((x) => s.seen.add(x.id)); s.pend = 0; }
          else { const mineNew = fresh.filter((x) => c && x.user_id === c.id); mineNew.forEach((x) => s.seen.add(x.id)); s.pend = fresh.length - mineNew.length; }
          s.first = 0; s.force = 0; render();
        }
      } catch (e) { console.error('Live feed error:', e); }
      busy = 0; composer();
      if (again) { again = 0; load(); }
    }
    const kick = () => { clearTimeout(tm); tm = setTimeout(load, 120); };
    const ping = () => { if (F.ch && s.live) { try { F.ch.send({ type: 'broadcast', event: 'ping', payload: {} }); } catch (e) {} } };

    async function send(text, parent) {
      const d = db(), c = me(); if (!d || !c) return false;
      const tid = 'tmp' + Date.now() + Math.random().toString(36).slice(2, 6);
      const row = { id: tid, user_id: c.id, parent_id: parent, body: text.slice(0, 280), created_at: new Date().toISOString() };
      s.prof[c.id] = s.prof[c.id] || { id: c.id, username: c.username, display_name: c.display_name, avatar_url: c.avatar_url, flair: c.flair, border: c.border };
      s.pending.set(tid, row); s.rows.unshift(row); if (!parent) s.seen.add(tid); render(1);   // shows instantly
      const r = await d.from('live_posts').insert({ game_id: String(g.id), user_id: c.id, parent_id: parent, body: row.body }).select('id').single();
      s.pending.delete(tid);
      if (r.error || !r.data) {
        s.rows = s.rows.filter((x) => x.id !== tid); s.seen.delete(tid); render(1);
        say(/slow down/i.test((r.error && r.error.message) || '') ? 'Slow down a little' : 'Couldn\u2019t post that'); return false;
      }
      row.id = r.data.id; s.seen.delete(tid); s.seen.add(row.id); s.rendered.add(row.id); s.sig = '';
      ping(); load(); return true;
    }

    async function like(pid) {
      const d = db(), c = me(); if (!c) return say('Sign in to like posts');
      if (!d || String(pid).startsWith('tmp')) return; const had = s.mine.has(pid);
      const set = (on) => { if (on) { s.mine.add(pid); s.cnt[pid] = (s.cnt[pid] || 0) + 1; } else { s.mine.delete(pid); s.cnt[pid] = Math.max(0, (s.cnt[pid] || 1) - 1); } };
      set(!had); render(1);
      const r = had ? await d.from('live_post_likes').delete().eq('post_id', pid).eq('user_id', c.id) : await d.from('live_post_likes').insert({ post_id: pid, user_id: c.id });
      if (r.error) { set(had); render(1); say('Couldn\u2019t update like'); } else ping();
    }

    function report(pid) {
      const c = me(), d = db(), row = s.rows.find((x) => x.id === pid);
      if (!c) return say('Sign in to report');
      if (!d || !row || typeof modal !== 'function') return;
      const m2 = modal(`<h3>Report this ${row.parent_id ? 'comment' : 'post'}</h3><p class="mu" style="margin:6px 0 0">${E(row.body.slice(0, 120))}</p><textarea class="lvr-t" rows="3" maxlength="200" placeholder="What's wrong with it?"></textarea><button class="pri" style="margin-top:10px" data-go>Send report</button>`);
      m2.querySelector('[data-go]').onclick = async () => {
        const why = m2.querySelector('textarea').value.trim();
        const reason = ('[Live feed ' + g.id + '] "' + row.body.slice(0, 120) + '"' + (why ? ' - ' + why : '')).slice(0, 400);
        const r = await d.from('reports').insert({ reporter: c.id, target_type: 'user', target_id: row.user_id, reason });
        if (r.error) return say('Could not report: ' + r.error.message);
        m2.remove(); say('Report sent. Thanks!');
      };
    }

    n.onclick = async (e) => {
      const t = e.target, q = (x) => t.closest(x); let b;
      if ((b = q('[data-pill]'))) { s.rows.forEach((x) => { if (!x.parent_id) s.seen.add(x.id); }); s.pend = 0; render(1); list.scrollTop = 0; }
      else if ((b = q('[data-rep]'))) report(b.dataset.rep);
      else if ((b = q('[data-lk]'))) like(b.dataset.lk);
      else if ((b = q('[data-ex]'))) { s.open.add(b.dataset.ex); render(1); }
      else if ((b = q('[data-cm]'))) { const id = b.dataset.cm; s.open.add(id); render(1); const i = list.querySelector(`[data-ri="${id}"]`); if (i) i.focus(); else if (!me()) say('Sign in to comment'); }
      else if ((b = q('[data-rs]'))) { const id = b.dataset.rs, i = list.querySelector(`[data-ri="${id}"]`), v = i && i.value.trim(); if (v) { s.rd[id] = ''; i.value = ''; if (!(await send(v, id))) { s.rd[id] = v; render(1); } } }
      else if ((b = q('[data-del]'))) { const d = db(); if (!d) return; const id = b.dataset.del; s.rows = s.rows.filter((x) => x.id !== id && x.parent_id !== id); render(1); const r = await d.from('live_posts').delete().eq('id', id); if (r.error) say('Couldn\u2019t delete that'); else ping(); load(); }
    };
    n.oninput = (e) => { const i = e.target; if (i && i.dataset && i.dataset.ri) s.rd[i.dataset.ri] = i.value; };
    n.onkeydown = (e) => { const i = e.target; if (e.key === 'Enter' && i && i.dataset && i.dataset.ri) { e.preventDefault(); const b = n.querySelector(`[data-rs="${i.dataset.ri}"]`); if (b) b.click(); } };

    // ----- real time: instant pings from other viewers + database change events (+ a slow safety poll) -----
    const d = db();
    if (d) {
      if (F.ch) { try { d.removeChannel(F.ch); } catch (e) {} F.ch = null; }
      try {
        F.ch = d.channel('lvf:' + g.id, { config: { broadcast: { self: false } } })
          .on('broadcast', { event: 'ping' }, kick)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_posts', filter: 'game_id=eq.' + g.id }, kick)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'live_post_likes' }, (p) => { const id = (p.new && p.new.post_id) || (p.old && p.old.post_id); if (!id || s.rows.some((x) => x.id === id)) kick(); })
          .subscribe((status) => { s.live = status === 'SUBSCRIBED' ? 1 : 0; dot.classList.toggle('on', !!s.live); });
      } catch (e) { console.error('realtime', e); }
    }
    const stop = () => { mo.disconnect(); if (F.ch && d) { try { d.removeChannel(F.ch); } catch (e) {} F.ch = null; } s.live = 0; dot.classList.remove('on'); };
    const poll = async () => { if (!alive()) { stop(); return; } if (!document.hidden) await load(); setTimeout(poll, 6000); };
    composer(); poll();
  }

  // ---------- hooks into livebox.js / app.js ----------
  const oHtml = window.lvHtml, oStart = window.startLive, oSit = window.sitLine;
  const canOverlay = (g) => g && (g.st === 'live' || g.st === 'up') && g.sp !== 'UFC' && g.sp !== 'PFL' && /^[A-Z0-9]+:\d{3,}$/.test(String(g.id));
  const ovBtn = (g) => (canOverlay(g) ? `<a class="lvo-btn" href="/overlay.html?setup=${encodeURIComponent(g.id)}" target="_blank" rel="noopener">${ICO_OV}<span>Get stream overlay</span></a>` : '');
  window.lvHtml = (g) => (oHtml ? oHtml(g) : '')
    + (live(g) ? `<div class="lvc-slot" data-lvc="${E(g.id)}"></div>` : '')
    + (g && g.st === 'final' ? `<div class="lvw-tot">${V[g.id] > 0 ? badge(g) : `<div class="vw" data-vw="${E(g.id)}" data-k="total" title="Total views">${EYE}<span>\u2013</span></div>`}</div>` : '')
    + ovBtn(g);
  window.startLive = (g, m) => {
    if (oStart) oStart(g, m);
    if (live(g)) { track(g); watch(g, m); initFeed(g, m); }
    else if (g && g.st === 'final') pullCounts(true);
  };
  window.sitLine = (g) => (oSit ? oSit(g) : '') + badge(g);
})();
