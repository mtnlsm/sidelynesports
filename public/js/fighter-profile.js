/* Fighter profiles: tap a fighter to see their record and last 5 fights.
   Adds a "Profile" button to fighter rows in Discover and to UFC/PFL fight pop-ups.
   Data comes from /.netlify/functions/fighter (see src/functions/fighter.js). */
(function () {
  'use strict';
  var API = '/.netlify/functions/fighter';
  var memo = {};

  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var idFromImg = function (u) { var m = /players\/full\/(\d+)\./.exec(u || ''); return m ? m[1] : ''; };

  var css = document.createElement('style');
  css.textContent = [
    '.fp-head{display:flex;gap:14px;align-items:center}',
    '.fp-ph{width:76px;height:76px;border-radius:50%;overflow:hidden;flex:none;background:var(--sf2);display:grid;place-items:center}',
    '.fp-ph img{width:100%;height:100%;object-fit:cover;object-position:top}',
    '.fp-nm{font-family:var(--fd);font-size:28px;font-weight:800;text-transform:uppercase;line-height:1.05;margin:0;overflow-wrap:anywhere}',
    '.fp-nk{color:var(--mu);font-style:italic;margin-top:2px}',
    '.fp-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '.fp-tags .chip,.fp-brk .chip{padding:4px 10px;min-height:0;font-size:13px}',
    '.fp-rec{display:flex;align-items:baseline;gap:12px;margin:18px 0 8px;flex-wrap:wrap}',
    '.fp-rec b{font-family:var(--fd);font-size:48px;font-weight:900;font-style:italic;line-height:1}',
    '.fp-rec span{color:var(--mu)}',
    '.fp-brk{display:flex;gap:8px;flex-wrap:wrap}',
    '.fp-bio{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:16px 0 4px}',
    '.fp-bio div{background:var(--sf2);border-radius:10px;padding:8px 10px}',
    '.fp-bio small{display:block;color:var(--mu);font-size:12px}',
    '.fp-bio span{font-weight:700}',
    '.fp-h{font-family:var(--fd);font-style:italic;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:17px;margin:20px 0 6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
    '.fp-form{display:flex;gap:6px;align-items:center}',
    '.fp-b{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff;flex:none;background:var(--mu)}',
    '.fp-b.W{background:var(--ok)}.fp-b.L{background:var(--bad)}',
    '.fp-f{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--bd)}',
    '.fp-f:first-of-type{border-top:0}',
    '.fp-fm{flex:1;min-width:0}',
    '.fp-fm b{display:block;overflow-wrap:anywhere}',
    '.fp-fd{text-align:right;font-size:13px;color:var(--mu);flex:none}',
    '.fp-links{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
    '.fp-links .chip{flex:1;min-width:140px;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.fp-act{display:flex;gap:8px;align-items:center;flex:none}',
    '[data-fprof]{cursor:pointer}',
    '.fp-note{color:var(--mu);font-size:12px;margin-top:14px}'
  ].join('');
  document.head.appendChild(css);

  function load(name, id) {
    var key = (id || '') + '|' + name.toLowerCase();
    if (memo[key]) return Promise.resolve(memo[key]);
    var qs = 'name=' + encodeURIComponent(name) + (id ? '&id=' + encodeURIComponent(id) : '');
    return fetch(API + '?' + qs).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'error'); e.status = r.status; throw e; }
        memo[key] = j; return j;
      });
    });
  }

  var CLOSE = '<button class="chip" style="margin-top:12px" data-x>Close</button>';

  function fmtDate(d) { var t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }); }

  function photo(d, name) {
    if (d.headshot) return '<img src="' + E(d.headshot) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">';
    try { return crest(name, 'UFC', 56); } catch (e) { return ''; }
  }

  function render(d, name) {
    var r = d.record, nm = d.name || name, tags = [];
    if (d.weightClass) tags.push(d.weightClass);
    if (d.streak) tags.push((d.streak[0] === 'W' ? 'Won ' : 'Lost ') + d.streak.slice(1) + ' in a row');
    var h = '<div class="fp-head"><div class="fp-ph">' + photo(d, nm) + '</div><div style="min-width:0"><h3 class="fp-nm">' + E(nm) + '</h3>' +
      (d.nickname ? '<div class="fp-nk">\u201c' + E(d.nickname) + '\u201d</div>' : '') +
      (tags.length ? '<div class="fp-tags">' + tags.map(function (t) { return '<span class="chip glass">' + E(t) + '</span>'; }).join('') + '</div>' : '') + '</div></div>';

    if (r) {
      h += '<div class="fp-rec"><b>' + E(r.summary) + '</b><span>W-L-D</span></div>';
      var brk = [['KO/TKO', r.ko], ['Submission', r.sub], ['Decision', r.dec]].filter(function (x) { return x[1] != null; });
      if (brk.length) h += '<div class="fp-brk">' + brk.map(function (x) { return '<span class="chip glass">' + x[0] + ' wins \u00b7 ' + x[1] + '</span>'; }).join('') + '</div>';
    }

    var bio = [['Height', d.height], ['Weight', d.weight], ['Reach', d.reach], ['Age', d.age], ['Stance', d.stance]].filter(function (x) { return x[1]; });
    if (bio.length) h += '<div class="fp-bio">' + bio.map(function (x) { return '<div><small>' + x[0] + '</small><span>' + E(x[1]) + '</span></div>'; }).join('') + '</div>';

    var f = d.fights || [];
    h += '<div class="fp-h">Last ' + (f.length || 5) + ' fights' + (f.length ? '<span class="fp-form" aria-label="Recent form">' + f.map(function (x) { return '<span class="fp-b ' + E(x.result) + '">' + E(x.result) + '</span>'; }).join('') + '</span>' : '') + '</div>';
    if (!f.length) h += '<p class="mu">No recent fights on record.</p>';
    f.forEach(function (x) {
      var how = [x.method, x.detail ? '(' + x.detail + ')' : ''].filter(Boolean).join(' ');
      var when = [x.round ? 'R' + x.round : '', x.time].filter(Boolean).join(' ');
      h += '<div class="fp-f"><span class="fp-b ' + E(x.result) + '">' + E(x.result) + '</span><div class="fp-fm"><b>vs ' + E(x.opponent) + '</b><div class="mu">' + E([how, when].filter(Boolean).join(' \u00b7 ') || 'Result unavailable') + '</div></div><div class="fp-fd">' + E(fmtDate(x.date)) + (x.promo ? '<br>' + E(x.promo) : '') + '</div></div>';
    });
    h += '<p class="fp-note">Fight data from ESPN, refreshed every few hours.</p>' + CLOSE;
    return h;
  }

  function open(name, id) {
    var m = modal('');
    var box = m.firstChild;
    var shell = function (inner) { box.innerHTML = '<h3 class="fp-nm" style="margin-bottom:12px">' + E(name) + '</h3>' + inner + CLOSE; };
    var go = function () {
      shell('<div class="sk"></div><div class="sk"></div><div class="sk"></div>');
      load(name, id).then(function (d) { if (m.isConnected) box.innerHTML = render(d, name); }).catch(function (e) {
        if (!m.isConnected) return;
        shell('<p class="mu" style="margin:6px 0 12px">' + (e.status === 404 ? 'We couldn\u2019t find a profile for ' + E(name) + '.' : 'Fighter data is unavailable right now. Try again in a minute.') + '</p>' + (e.status === 404 ? '' : '<button class="chip" data-fp-retry>Try again</button>'));
      });
    };
    box.addEventListener('click', function (e) { if (e.target.closest('[data-fp-retry]')) go(); });
    go();
  }

  // Capture phase, so the app's own click handler never also reacts to a Profile tap.
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-fprof]');
    if (!c) return;
    e.preventDefault(); e.stopPropagation();
    open(c.dataset.fprof, c.dataset.fid || '');
  }, true);

  // ---- add Profile buttons wherever fighters appear ----
  function modalNames(m) {
    var picks = m.querySelectorAll('.pk-grid .pick[data-p]'), out = [];
    picks.forEach(function (p) { if (p.dataset.p !== 'Draw') out.push(p.dataset.p); });
    if (out.length === 2) return out;
    out = [];
    m.querySelectorAll('.score > div').forEach(function (d) {
      for (var i = 0; i < d.childNodes.length; i++) { var n = d.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) { out.push(n.textContent.trim()); break; } }
    });
    return out.length === 2 ? out : null;
  }

  function enhance() {
    // 1) Fighter rows (Discover, search results)
    document.querySelectorAll('.card.row.sp > button[data-fav^="F:"]:not([data-fp])').forEach(function (b) {
      b.dataset.fp = '1';
      var name = b.dataset.fav.slice(2), left = b.previousElementSibling;
      var wrap = document.createElement('div'); wrap.className = 'fp-act';
      var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'chip'; pb.dataset.fprof = name; pb.textContent = 'Profile'; pb.setAttribute('aria-label', 'View ' + name + ' profile');
      b.before(wrap); wrap.append(pb, b);
      if (left) left.dataset.fprof = name;
    });
    // 2) UFC / PFL fight pop-ups
    if (typeof G === 'undefined' || typeof MMA !== 'function') return;
    document.querySelectorAll('.modal').forEach(function (m) {
      if (m.querySelector('.fp-links')) return;
      var names = modalNames(m); if (!names) return;
      var g = G.find(function (x) { return MMA(x.sp) && x.a === names[0] && x.b === names[1]; });
      if (!g) return;
      var anchor = m.querySelector('.pk-grid') || m.querySelector('.score'); if (!anchor) return;
      var row = document.createElement('div'); row.className = 'fp-links';
      [[g.a, g.ia], [g.b, g.ib]].forEach(function (f) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
        b.dataset.fprof = f[0]; if (idFromImg(f[1])) b.dataset.fid = idFromImg(f[1]);
        b.textContent = f[0] + ' \u00b7 profile';
        row.appendChild(b);
      });
      anchor.after(row);
    });
  }

  var queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; try { enhance(); } catch (e) { console.error('fighter-profile', e); } }); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
})();
