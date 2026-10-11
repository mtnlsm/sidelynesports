/* ===== PICK PAGE (needs nothing new in the database) =====
   Tapping a game on mobile opens its own full-screen page at  /pick/NFL-401234/kansas-city-chiefs-vs-buffalo-bills
   instead of a bottom sheet. It has a back button, a share button, a big matchup header, and the normal pick / stake / bet /
   refund / live-score screen underneath. The link can be shared: opening it later (or from a text message) lands straight on
   the same game once you are signed in. The browser/phone back button (and the iOS edge swipe) closes it.
   On desktop the usual centered sheet is kept when you click a game; only a shared /pick link opens the full page.
   Loaded after app.js. It wraps game() and reuses all of its betting logic, so nothing about SP or picks changes. */
(() => {
  const mq = window.matchMedia('(max-width: 899.98px)');
  const origGame = window.game;
  if (typeof origGame !== 'function') return;
  let cur = null;           // the open pick page element
  let routing = false;

  const st = document.createElement('style');
  st.textContent = `
.modal.pk-page{flex-direction:column;align-items:stretch;justify-content:flex-start;background:var(--bg);backdrop-filter:none;-webkit-backdrop-filter:none;animation:pkin .22s ease}
@keyframes pkin{from{transform:translateX(26px);opacity:0}to{transform:none;opacity:1}}
.pk-page>.glass{order:0;flex:1 1 auto;min-height:0;width:100%;max-width:560px;margin:0 auto;max-height:none;border-radius:0;border:0!important;background:transparent;box-shadow:none;animation:none;padding:4px 16px calc(28px + env(safe-area-inset-bottom,0px));overflow:auto;-webkit-overflow-scrolling:touch}
.pk-page>.glass::before{display:none}
.pk-page>.glass>.chip[data-x],.pk-page .sheet-close{display:none!important}
.pk-bar{order:-2;flex:none;display:flex;align-items:center;gap:8px;padding:calc(8px + env(safe-area-inset-top,0px)) 10px 8px;background:var(--sf);border-bottom:1px solid var(--bd)}
.pk-ib{flex:none;width:42px;height:42px;border-radius:12px;border:0;background:var(--sf2);color:var(--tx);display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0}
.pk-ib:active{transform:scale(.95)}
.pk-bt{flex:1;min-width:0;text-align:center;display:flex;flex-direction:column;line-height:1.25}
.pk-bt b{font-size:16px}
.pk-bt span{font-size:12px}
.pk-hero{order:-1;flex:none;width:100%;max-width:560px;margin:0 auto;box-sizing:border-box;padding:18px 16px 8px;text-align:center}
.pk-tag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 10px;border-radius:99px;background:var(--ab);color:#fff;margin-bottom:10px}
.pk-vs{display:flex;align-items:flex-start;justify-content:center;gap:8px}
.pk-side{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:6px}
.pk-side b{font-size:16px;line-height:1.2;max-width:100%;overflow-wrap:anywhere}
.pk-side small{color:var(--mu);font-weight:600;font-size:12px}
.pk-mid{flex:none;align-self:center;color:var(--mu);font-weight:800;font-size:13px;letter-spacing:.06em}
.pk-meta{color:var(--mu);font-size:13px;margin-top:12px;line-height:1.5}
.pk-meta b{color:var(--tx)}
.pk-msg{padding:28px 6px;text-align:center}
.pk-msg h3{margin:0 0 6px}
html.pk-open{overflow:hidden}
`;
  document.head.append(st);

  /* ---------- URLs ---------- */
  const slug = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  // "NFL:401234"  ->  /pick/NFL-401234/kansas-city-chiefs-vs-buffalo-bills   (only the 2nd part is read back, the slug is for looks)
  const pickUrl = (g) => '/pick/' + encodeURIComponent(String(g.id).replace(':', '-')) + '/' + slug(g.a + ' vs ' + g.b);
  const pathPickId = () => {
    const m = location.pathname.match(/^\/pick\/([^/]+)(?:\/.*)?$/);
    if (!m) return null;
    let raw = m[1]; try { raw = decodeURIComponent(raw); } catch (e) { return null; }
    const i = raw.indexOf('-');
    return i > 0 ? raw.slice(0, i) + ':' + raw.slice(i + 1) : null;
  };
  const find = (id) => G.find((x) => String(x.id) === String(id));

  /* ---------- share ---------- */
  async function share(g) {
    const url = location.origin + pickUrl(g), title = g.a + ' vs ' + g.b;
    try { if (navigator.share) { await navigator.share({ title, text: 'Who wins? Make your pick on Sidelyne Sports.', url }); return; } }
    catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(url); toast('Link copied'); } catch (e) { toast(url); }
  }

  /* ---------- the page shell ---------- */
  const IC_BACK = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const IC_SHARE = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M8 8l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>';

  function heroHtml(g) {
    const mma = MMA(g.sp), tag = mma ? (g.pos === 0 ? 'MAIN EVENT' : g.pos === 1 ? 'CO-MAIN' : '') : '';
    const side = (n, rec) => `<div class="pk-side">${crest(n, g.sp, 76)}<b>${esc(n)}</b>${rec ? `<small>${esc(String(rec))}</small>` : ''}</div>`;
    const bits = [];
    bits.push('<b>' + esc(spl(g.sp)) + '</b>');
    if (mma) { if (g.ev) bits.push(esc(g.ev)); if (g.wc) bits.push(esc(g.wc) + ' · ' + (g.rd || 3) + ' rounds'); }
    if (g.vn) bits.push(esc(g.vn));
    if (g.st === 'up') bits.push(esc(new Date(g.date).toLocaleString([], { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })));
    return `${tag ? `<span class="pk-tag">${tag}</span>` : ''}<div class="pk-vs">${side(g.a, mma ? g.ra : '')}<span class="pk-mid">VS</span>${side(g.b, mma ? g.rb : '')}</div><div class="pk-meta">${bits.join('<br>')}</div>`;
  }

  // Turns a modal element into the full page. `pushed` = we added a history entry for it (so closing goes back).
  function decorate(m, g, pushed, title) {
    const oldTitle = document.title;
    m.classList.add('pk-page');
    document.documentElement.classList.add('pk-open');
    if (g) document.title = g.a + ' vs ' + g.b + ' · Pick · Sidelyne Sports';
    const bar = document.createElement('div');
    bar.className = 'pk-bar';
    bar.innerHTML = `<button class="pk-ib" data-pkx aria-label="Back">${IC_BACK}</button><div class="pk-bt"><b>${esc(title || 'Make your pick')}</b>${g ? `<span class="mu">${esc(spl(g.sp))}</span>` : ''}</div>${g ? `<button class="pk-ib" data-pks aria-label="Share this pick">${IC_SHARE}</button>` : '<span class="pk-ib" style="visibility:hidden"></span>'}`;
    m.append(bar);
    if (g) { const hero = document.createElement('div'); hero.className = 'pk-hero'; hero.innerHTML = heroHtml(g); m.append(hero); }
    bar.onclick = (e) => {
      if (e.target.closest('[data-pkx]')) m.remove();
      else if (g && e.target.closest('[data-pks]')) share(g);
    };
    const rm = m.remove.bind(m);
    let closed = false;
    m._silent = () => { if (closed) return; closed = true; rm(); document.documentElement.classList.remove('pk-open'); document.title = oldTitle; if (cur === m) cur = null; };
    m.remove = () => {
      if (closed) return;
      m._silent();
      if (pathPickId()) {                 // still on /pick/...: put the URL back (a real back press has already moved it)
        try { if (pushed) history.back(); else history.replaceState({}, '', '/'); } catch (e) {}
      }
    };
    cur = m;
    return m;
  }

  function openPage(id, o) {
    o = o || {};
    if (cur && cur.isConnected) return;
    const g = find(id);
    if (!g) return origGame(id);
    const before = document.querySelectorAll('body > .modal').length;
    origGame(g.id);                                   // builds the normal pick screen (stakes, bet, refund, live score)
    const mods = document.querySelectorAll('body > .modal');
    const m = mods[mods.length - 1];
    if (!m || mods.length <= before) return;
    if (o.push) { try { history.pushState({ pk: String(g.id) }, '', pickUrl(g)); } catch (e) {} }
    decorate(m, g, !!o.push);
  }

  // Tapping a game: full page on mobile, the usual sheet on desktop.
  window.game = function (id) {
    if (mq.matches && find(id)) return openPage(id, { push: true });
    return origGame.apply(this, arguments);
  };

  /* ---------- opening a shared /pick/... link ---------- */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  window.__pkRoute = async function () {
    const id = pathPickId();
    if (!id || routing || (cur && cur.isConnected)) return;
    routing = true;
    try {
      let g = find(id), hold = null;
      if (!g) {
        // games are still loading: show the page frame right away, then fill it in
        hold = modal('<div class="pk-msg"><div class="sk"></div><div class="sk"></div><div class="sk"></div></div>');
        decorate(hold, null, false, 'Loading pick…');
        for (let i = 0; i < 40 && !(g = find(id)); i++) {
          if (!hold.isConnected) return;               // user backed out while waiting
          if (typeof GSTAT !== 'undefined' && GSTAT === 'error' && i > 8) break;
          await sleep(400);
        }
        if (!hold.isConnected) return;
        if (g) { hold._silent(); }
      }
      if (g) { openPage(g.id, { push: false }); return; }
      // the game is gone (finished a while ago, or a bad link)
      const dlg = hold.firstChild;
      dlg.innerHTML = `<div class="pk-msg"><h3>This game isn't available</h3><p class="mu">It may have finished already, or the link is out of date.</p><button class="pri" data-pkgo style="margin-top:14px;width:100%">See today's picks</button></div>`;
      dlg.querySelector('[data-pkgo]').onclick = () => { hold.remove(); go('predict', false, true); };
    } finally { routing = false; }
  };
  // already signed in and games loaded before this file ran? (e.g. the user opened a /pick link and we are late)
  if (typeof ME !== 'undefined' && ME && pathPickId()) setTimeout(() => window.__pkRoute && window.__pkRoute(), 0);
})();
