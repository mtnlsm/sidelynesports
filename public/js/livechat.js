// Live game FEED (twitter-style): posts, likes, replies, "new posts" pill, plus the eye view counter.
// Only active on LIVE games. Loads AFTER livebox.js: wraps lvHtml / startLive / sitLine, so app.js needs no changes.
(function () {
  const E = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const live = (g) => g && g.st === 'live';
  const SV = (p, extra) => `<svg width="16" height="16" viewBox="0 0 24 24" fill="${extra || 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const EYE = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const ICO_RP = SV('<path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-5.4A8 8 0 1 1 21 12z"/>');
  const ICO_LK = (on) => SV('<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21.8l8.8-8.8a5.2 5.2 0 0 0 0-7.4z"/>', on ? 'currentColor' : 'none');
  const fmt = (n) => (n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K' : String(n));
  const db = () => (typeof window.FX_DB !== 'undefined' ? window.FX_DB : null);
  const me = () => { try { return typeof ME !== 'undefined' ? ME : null; } catch (e) { return null; } };
  const say = (t) => { try { if (typeof toast === 'function') toast(t); } catch (e) {} };
  const ago = (d) => { const s = Math.max(0, (Date.now() - Date.parse(d)) / 1000); return s < 10 ? 'now' : s < 60 ? Math.floor(s) + 's' : s < 3600 ? Math.floor(s / 60) + 'm' : s < 86400 ? Math.floor(s / 3600) + 'h' : Math.floor(s / 86400) + 'd'; };
  const av = (u, z) => { try { if (typeof avHtml === 'function') return avHtml(u, z); } catch (e) {} return `<div class="lvp-fb" style="width:${z}px;height:${z}px">${E((u.display_name || u.username || '?')[0].toUpperCase())}</div>`; };
  const nameOf = (u) => E(u.display_name || u.username || 'Fan');
  const flair = (u) => { try { if (typeof flr === 'function') return flr(u); } catch (e) {} return ''; };
  const ulink = (u, inner) => (u.username ? `<a class="ulk" href="/@${E(u.username)}" data-u="${E(u.username)}">${inner}</a>` : inner);

  const st = document.createElement('style');
  st.textContent = `
.vw{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;color:var(--mu)}
.vw svg{flex:none}
.card .vw{margin-top:4px}
.lvf{margin:10px 0 14px;border:1px solid var(--bd);border-radius:14px;background:var(--sf2);overflow:hidden;position:relative}
.lvf-h{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--bd);font-size:14px}
.lvf-c{padding:10px 12px;border-bottom:1px solid var(--bd)}
.lvf-c .r{display:flex;gap:10px;align-items:flex-start}
.lvf-c textarea{flex:1;min-width:0;resize:none;border:0;outline:0;background:none;color:var(--tx);font:inherit;font-size:16px;line-height:1.35;min-height:44px;padding:4px 0}
.lvf-c .b{display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:6px;font-size:12px;color:var(--mu)}
.lvf-c .b .bad{color:var(--bad)}
.lvf-btn{padding:7px 16px;border-radius:999px;font-weight:800;font-size:14px;background:var(--ab);color:var(--abx)}
.lvf-btn:disabled{opacity:.45}
.lvf-in{padding:12px;font-size:13px;color:var(--mu);text-align:center}
.lvf-l{max-height:460px;overflow-y:auto;-webkit-overflow-scrolling:touch}
.lvf-e{padding:26px 14px;color:var(--mu);font-size:13px;text-align:center}
.lvf-pill{position:absolute;left:50%;top:92px;transform:translateX(-50%);z-index:2;padding:7px 14px;border-radius:999px;font-weight:800;font-size:13px;background:var(--ab);color:var(--abx);box-shadow:0 4px 14px rgba(0,0,0,.25)}
.lvp{display:flex;gap:10px;padding:11px 12px;border-bottom:1px solid var(--bd)}
.lvp:last-child{border-bottom:0}
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
.lvp-act button.op{color:var(--ab)}
.lvp-del{margin-left:auto;background:none;color:var(--mu);font-size:15px;padding:0 4px}
.lvp-th{margin-top:8px;border-left:2px solid var(--bd);padding-left:10px}
.lvp-th .lvp{padding:8px 0;border-bottom:0}
.lvp-rc{display:flex;gap:6px;margin-top:6px}
.lvp-rc input{flex:1;min-width:0;font-size:16px;padding:7px 10px;border-radius:10px;border:1px solid var(--bd);background:var(--sf);color:var(--tx)}
.lvp-rc button{padding:7px 12px;border-radius:10px;font-weight:700;background:var(--ab);color:var(--abx)}
.lvp-fb{border-radius:50%;background:var(--ab);color:var(--abx);display:flex;align-items:center;justify-content:center;font-weight:800}`;
  document.head.appendChild(st);

  // ---------- view counts ----------
  const V = {};
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

  // ---------- feed ----------
  const N = {}, TOKEN = {}; // per-game persistent feed (node + state), session token

  function build(g) {
    const s = { rows: [], cnt: {}, mine: new Set(), open: new Set(), seen: new Set(), first: 1, pend: 0, rd: {}, uid: null, force: 0, sig: '' };
    const n = document.createElement('div');
    n.className = 'lvf';
    n.innerHTML = `<div class="lvf-h"><b>Live feed</b><span class="vw" data-vw="${E(g.id)}" title="Views">${EYE}<span>${V[g.id] > 0 ? fmt(V[g.id]) : '–'}</span></span></div><div class="lvf-c"></div><button type="button" class="lvf-pill" hidden data-pill></button><div class="lvf-l"><div class="lvf-e">Loading feed\u2026</div></div>`;
    return { n, s };
  }

  function initFeed(g, m) {
    const tok = (TOKEN[g.id] = (TOKEN[g.id] || 0) + 1);
    const F = N[g.id] || (N[g.id] = build(g)), n = F.n, s = F.s;
    const list = n.querySelector('.lvf-l'), comp = n.querySelector('.lvf-c'), pill = n.querySelector('[data-pill]');
    let ch = null, tm = 0, busy = 0;
    const alive = () => m.isConnected && TOKEN[g.id] === tok;

    const attach = () => { const sl = m.querySelector('.lvc-slot'); if (sl && !sl.contains(n)) sl.appendChild(n); };
    attach();
    const mo = new MutationObserver(() => { if (!alive()) { mo.disconnect(); return; } attach(); });
    mo.observe(m, { childList: true, subtree: true });

    const user = (r) => r.profiles || { username: 'fan' };
    const post = (r, reply) => {
      const u = user(r), c = me(), mine = c && r.user_id === c.id, canDel = mine || (c && c.role === 'admin');
      const kids = reply ? [] : s.rows.filter((x) => x.parent_id === r.id).sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
      const open = s.open.has(r.id), liked = s.mine.has(r.id), lc = s.cnt[r.id] || 0;
      const thread = !reply && open ? `<div class="lvp-th">${kids.map((k) => post(k, 1)).join('')}${c ? `<div class="lvp-rc"><input type="text" maxlength="280" placeholder="Post your reply" data-ri="${r.id}" value="${E(s.rd[r.id] || '')}"><button type="button" data-rs="${r.id}">Reply</button></div>` : '<div class="mu" style="font-size:12px;margin-top:6px">Sign in to reply.</div>'}</div>` : '';
      return `<article class="lvp"><div class="lvp-a">${ulink(u, av(u, reply ? 28 : 38))}</div><div class="lvp-b"><div class="lvp-t">${ulink(u, `<b>${nameOf(u)}</b>`)}${flair(u)}<span class="mu">@${E(u.username || 'fan')} \u00b7 ${ago(r.created_at)}</span>${canDel ? `<button type="button" class="lvp-del" data-del="${r.id}" aria-label="Delete">\u00d7</button>` : ''}</div><div class="lvp-x">${E(r.body)}</div><div class="lvp-act">${reply ? '' : `<button type="button" class="${open ? 'op' : ''}" data-rp="${r.id}" aria-label="Replies">${ICO_RP}<span>${kids.length || ''}</span></button>`}<button type="button" class="${liked ? 'on' : ''}" data-lk="${r.id}" aria-label="Like">${ICO_LK(liked)}<span>${lc || ''}</span></button></div>${thread}</div></article>`;
    };

    const render = (force) => {
      const tops = s.rows.filter((r) => !r.parent_id && s.seen.has(r.id));
      const c = me(), sig = [tops.map((r) => r.id + ':' + (s.cnt[r.id] || 0) + ':' + s.rows.filter((x) => x.parent_id === r.id).map((x) => x.id + (s.cnt[x.id] || 0)).join('.')).join(','), [...s.mine].join('.'), [...s.open].join('.'), Math.floor(Date.now() / 6e4), c ? c.id : '', s.pend].join('|');
      if (!force && sig === s.sig) return; s.sig = sig;
      const a = document.activeElement, ri = a && list.contains(a) && a.dataset && a.dataset.ri, pos = ri && a.selectionStart;
      const top = list.scrollTop;
      list.innerHTML = tops.length ? tops.map((r) => post(r)).join('') : '<div class="lvf-e">No posts yet. Be the first to post about this game!</div>';
      list.scrollTop = top;
      if (ri) { const i = list.querySelector(`[data-ri="${ri}"]`); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (e) {} } }
      pill.hidden = !s.pend; pill.textContent = s.pend + (s.pend === 1 ? ' new post' : ' new posts');
    };

    const composer = () => {
      const c = me(), id = c ? c.id : '';
      if (s.uid === id && comp.firstChild) return; s.uid = id;
      if (!c) { comp.innerHTML = '<div class="lvf-in" style="padding:2px 0">Sign in to post and reply.</div>'; return; }
      comp.innerHTML = `<div class="r">${av(c, 38)}<textarea maxlength="280" rows="2" placeholder="What\u2019s happening in the game?" aria-label="Post"></textarea></div><div class="b"><span data-cc>280</span><button type="button" class="lvf-btn" disabled>Post</button></div>`;
      const t = comp.querySelector('textarea'), b = comp.querySelector('.lvf-btn'), cc = comp.querySelector('[data-cc]');
      t.oninput = () => { const left = 280 - t.value.length; cc.textContent = left; cc.className = left < 20 ? 'bad' : ''; b.disabled = !t.value.trim(); t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 140) + 'px'; };
      const go = async () => { const v = t.value.trim(); if (!v || b.disabled) return; b.disabled = true; if (await send(v, null)) { t.value = ''; t.oninput(); list.scrollTop = 0; } else b.disabled = !t.value.trim(); };
      b.onclick = go; t.onkeydown = (e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); go(); } };
    };

    const load = async () => {
      const d = db(); if (!d || !alive() || busy) return; busy = 1;
      try {
        const since = new Date(Date.now() - 864e5).toISOString(), c = me();
        const r = await d.from('live_posts').select('id,user_id,parent_id,body,created_at,profiles(username,display_name,avatar_url,flair,border),live_post_likes(count)').eq('game_id', String(g.id)).gt('created_at', since).order('created_at', { ascending: false }).limit(200);
        if (r.error) { if (s.first) list.innerHTML = '<div class="lvf-e">The feed isn\u2019t available right now.</div>'; }
        else if (r.data) {
          s.rows = r.data; s.cnt = {}; r.data.forEach((x) => { s.cnt[x.id] = (x.live_post_likes && x.live_post_likes[0] && Number(x.live_post_likes[0].count)) || 0; });
          if (c) { const lk = await d.from('live_post_likes').select('post_id,live_posts!inner(game_id)').eq('user_id', c.id).eq('live_posts.game_id', String(g.id)); if (!lk.error && lk.data) s.mine = new Set(lk.data.map((x) => x.post_id)); } else s.mine = new Set();
          const fresh = s.rows.filter((x) => !x.parent_id && !s.seen.has(x.id)), atTop = list.scrollTop < 40;
          if (s.first || atTop || s.force) { fresh.forEach((x) => s.seen.add(x.id)); s.pend = 0; }
          else { const mineNew = fresh.filter((x) => c && x.user_id === c.id); mineNew.forEach((x) => s.seen.add(x.id)); s.pend = fresh.length - mineNew.length; }
          s.first = 0; s.force = 0; render();
        }
      } catch (e) {}
      busy = 0; composer();
    };

    const send = async (text, parent) => {
      const d = db(), c = me(); if (!d || !c) return false;
      const r = await d.from('live_posts').insert({ game_id: String(g.id), user_id: c.id, parent_id: parent, body: text.slice(0, 280) });
      if (r.error) { say(/slow down/i.test(r.error.message || '') ? 'Slow down a little' : 'Couldn\u2019t post that'); return false; }
      s.force = 1; await load(); return true;
    };

    const like = async (pid) => {
      const d = db(), c = me(); if (!c) return say('Sign in to like posts');
      if (!d) return; const had = s.mine.has(pid);
      if (had) { s.mine.delete(pid); s.cnt[pid] = Math.max(0, (s.cnt[pid] || 1) - 1); } else { s.mine.add(pid); s.cnt[pid] = (s.cnt[pid] || 0) + 1; }
      render(1);
      const r = had ? await d.from('live_post_likes').delete().eq('post_id', pid).eq('user_id', c.id) : await d.from('live_post_likes').insert({ post_id: pid, user_id: c.id });
      if (r.error) { if (had) { s.mine.add(pid); s.cnt[pid] = (s.cnt[pid] || 0) + 1; } else { s.mine.delete(pid); s.cnt[pid] = Math.max(0, (s.cnt[pid] || 1) - 1); } render(1); say('Couldn\u2019t update like'); }
    };

    n.onclick = async (e) => {
      const t = e.target, q = (x) => t.closest(x);
      let b;
      if ((b = q('[data-pill]'))) { list.querySelectorAll('.lvp').length; s.rows.forEach((x) => { if (!x.parent_id) s.seen.add(x.id); }); s.pend = 0; render(1); list.scrollTop = 0; }
      else if ((b = q('[data-lk]'))) like(b.dataset.lk);
      else if ((b = q('[data-rp]'))) { const id = b.dataset.rp; if (s.open.has(id)) s.open.delete(id); else s.open.add(id); render(1); const i = list.querySelector(`[data-ri="${id}"]`); if (i && s.open.has(id) && me()) i.focus(); }
      else if ((b = q('[data-rs]'))) { const id = b.dataset.rs, i = list.querySelector(`[data-ri="${id}"]`), v = i && i.value.trim(); if (v) { b.disabled = true; if (await send(v, id)) { s.rd[id] = ''; render(1); } else b.disabled = false; } }
      else if ((b = q('[data-del]'))) { const d = db(); if (!d) return; const r = await d.from('live_posts').delete().eq('id', b.dataset.del); if (r.error) say('Couldn\u2019t delete that'); else load(); }
    };
    n.oninput = (e) => { const i = e.target; if (i && i.dataset && i.dataset.ri) s.rd[i.dataset.ri] = i.value; };
    n.onkeydown = (e) => { const i = e.target; if (e.key === 'Enter' && i && i.dataset && i.dataset.ri) { e.preventDefault(); const b = n.querySelector(`[data-rs="${i.dataset.ri}"]`); if (b) b.click(); } };

    const d = db();
    if (d) { try { ch = d.channel('lvf:' + g.id).on('postgres_changes', { event: '*', schema: 'public', table: 'live_posts', filter: 'game_id=eq.' + g.id }, () => { clearTimeout(tm); tm = setTimeout(load, 250); }).subscribe(); } catch (e) {} }
    const stop = () => { mo.disconnect(); if (ch && d) { try { d.removeChannel(ch); } catch (e) {} ch = null; } };
    const poll = async () => { if (!alive()) { stop(); return; } if (!document.hidden) await load(); setTimeout(poll, 10000); };
    composer(); poll();
  }

  // ---------- hooks into livebox.js / app.js ----------
  const oHtml = window.lvHtml, oStart = window.startLive, oSit = window.sitLine;
  window.lvHtml = (g) => (oHtml ? oHtml(g) : '') + (live(g) ? `<div class="lvc-slot" data-lvc="${E(g.id)}"></div>` : '');
  window.startLive = (g, m) => { if (oStart) oStart(g, m); if (live(g)) { track(g); initFeed(g, m); } };
  window.sitLine = (g) => (oSit ? oSit(g) : '') + (live(g) ? badge(g) : '');
})();
