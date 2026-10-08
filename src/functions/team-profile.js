/* Team profiles: tap a team to see their record, standing, last 5 results, next game and their division/conference table.
   Adds a "Profile" button to team rows in Discover and to team game pop-ups (NFL, NBA, MLB, NHL, soccer...).
   Data comes from /.netlify/functions/team (see src/functions/team.js). */
(function () {
  'use strict';
  var API = '/.netlify/functions/team';
  var memo = {};
  var PRIORITY = ['NFL', 'NBA', 'MLB', 'NHL', 'WNBA', 'EPL', 'LALIGA', 'BUND', 'SERIEA', 'LIGUE1', 'MLS', 'LIGAMX', 'ERED', 'PORT', 'CFL', 'CFB', 'CBB', 'CBASE', 'UCL', 'UEL', 'WC'];

  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var css = document.createElement('style');
  css.textContent = [
    '.tp-head{display:flex;gap:14px;align-items:center}',
    '.tp-lg{width:76px;height:76px;flex:none;display:grid;place-items:center}',
    '.tp-lg img{width:100%;height:100%;object-fit:contain;display:block}',
    '.tp-nm{font-family:var(--fd);font-size:28px;font-weight:800;text-transform:uppercase;line-height:1.05;margin:0;overflow-wrap:anywhere}',
    '.tp-tags{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}',
    '.tp-rec{display:flex;align-items:baseline;gap:12px;margin:18px 0 8px;flex-wrap:wrap}',
    '.tp-rec b{font-family:var(--fd);font-size:48px;font-weight:900;font-style:italic;line-height:1}',
    '.tp-rec span{color:var(--mu)}',
    '.tp-bio{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:12px 0 4px}',
    '.tp-bio div{background:var(--sf2);border-radius:10px;padding:8px 10px}',
    '.tp-bio small{display:block;color:var(--mu);font-size:12px}',
    '.tp-bio span{font-weight:700}',
    '.tp-h{font-family:var(--fd);font-style:italic;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:17px;margin:20px 0 6px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
    '.tp-form{display:flex;gap:6px;align-items:center}',
    '.tp-b{width:28px;height:28px;border-radius:6px;display:grid;place-items:center;font-weight:800;font-size:13px;color:#fff;flex:none;background:var(--mu)}',
    '.tp-b.W{background:var(--ok)}.tp-b.L{background:var(--bad)}',
    '.tp-g{display:flex;gap:12px;align-items:center;padding:10px 0;border-top:1px solid var(--bd)}',
    '.tp-g:first-of-type{border-top:0}',
    '.tp-gm{flex:1;min-width:0}',
    '.tp-gm b{display:block;overflow-wrap:anywhere}',
    '.tp-gd{text-align:right;font-size:13px;color:var(--mu);flex:none}',
    '.tp-sc{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.tp-tb{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}',
    '.tp-tb th{color:var(--mu);font-weight:600;font-size:11px;padding:4px 6px;text-align:center}',
    '.tp-tb td{padding:7px 6px;text-align:center;border-top:1px solid var(--bd)}',
    '.tp-tb .n{text-align:left;white-space:nowrap}',
    '.tp-tb .r{color:var(--mu);width:22px;text-align:left}',
    '.tp-tb .n span{display:inline-flex;align-items:center;gap:8px}',
    '.tp-tb .n img{width:22px;height:22px;object-fit:contain}',
    '.tp-tb tr.you td{background:var(--sf2);font-weight:800}',
    '.tp-tb tr[data-tprof]{cursor:pointer}',
    '.tp-links{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}',
    '.tp-links .chip{flex:1;min-width:140px;justify-content:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.tp-act{display:flex;gap:8px;align-items:center;flex:none}',
    '[data-tprof]{cursor:pointer}',
    '.tp-note{color:var(--mu);font-size:12px;margin-top:14px}'
  ].join('');
  document.head.appendChild(css);

  // Find a team's sport + ESPN id from the app's own team list (TEAMS), by name.
  function lookup(name, sp) {
    var list = (typeof TEAMS !== 'undefined' && TEAMS) || [], hits = list.filter(function (t) { return t.n === name || t.full === name; });
    if (sp) { var s = hits.filter(function (t) { return t.sp === sp; }); if (s.length) hits = s; }
    hits.sort(function (a, b) { var i = PRIORITY.indexOf(a.sp), j = PRIORITY.indexOf(b.sp); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    return hits[0] || null;
  }

  function load(sp, name, id) {
    var key = sp + '|' + (id || name.toLowerCase());
    if (memo[key]) return Promise.resolve(memo[key]);
    var qs = 'sport=' + encodeURIComponent(sp) + (id ? '&id=' + encodeURIComponent(id) : '&name=' + encodeURIComponent(name));
    return fetch(API + '?' + qs).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'error'); e.status = r.status; throw e; }
        memo[key] = j; return j;
      });
    });
  }

  var CLOSE = '<button class="chip" style="margin-top:12px" data-x>Close</button>';

  function fmtDate(d) { var t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { month: 'short', day: 'numeric' }); }
  function fmtWhen(d) { var t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' \u00b7 ' + t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

  function logo(d, name, sp) {
    if (d.logo) return '<img src="' + E(d.logo) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">';
    try { return crest(name, sp, 56); } catch (e) { return ''; }
  }

  function table(d) {
    var g = d.group; if (!g || !g.rows || !g.rows.length) return '';
    var h = '<div class="tp-h">' + E(g.name || 'Standings') + '</div><div class="tp-sc"><table class="tp-tb"><thead><tr><th class="r"></th><th class="n"></th>' +
      g.labels.map(function (l) { return '<th>' + E(l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    g.rows.forEach(function (r) {
      h += '<tr class="' + (r.you ? 'you' : '') + '"' + (r.you ? '' : ' data-tprof="' + E(r.n) + '" data-tsp="' + E(d.sport) + '" data-tid="' + E(r.id) + '"') + '><td class="r">' + r.rank + '</td><td class="n"><span>' +
        (r.logo ? '<img src="' + E(r.logo) + '" alt="" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + E(r.ab || r.n) + '</span></td>' +
        r.v.map(function (v) { return '<td>' + E(v) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div>';
  }

  function render(d, name) {
    var nm = d.name || name, r = d.record || {};
    var h = '<div class="tp-head"><div class="tp-lg">' + logo(d, nm, d.sport) + '</div><div style="min-width:0"><h3 class="tp-nm">' + E(nm) + '</h3>' +
      (d.tags && d.tags.length ? '<div class="tp-tags">' + d.tags.map(function (t) { return '<span class="chip glass">' + E(t) + '</span>'; }).join('') + '</div>' : '') + '</div></div>';

    if (r.summary) h += '<div class="tp-rec"><b>' + E(r.summary) + '</b><span>Record</span></div>';
    if (d.stats && d.stats.length) h += '<div class="tp-bio">' + d.stats.map(function (x) { return '<div><small>' + E(x[0]) + '</small><span>' + E(x[1]) + '</span></div>'; }).join('') + '</div>';

    h += table(d);

    var f = d.last || [];
    h += '<div class="tp-h">Last ' + (f.length || 5) + ' games' + (f.length ? '<span class="tp-form" aria-label="Recent form">' + f.slice().reverse().map(function (x) { return '<span class="tp-b ' + E(x.result) + '">' + E(x.result) + '</span>'; }).join('') + '</span>' : '') + '</div>';
    if (!f.length) h += '<p class="mu">No recent games on record.</p>';
    f.forEach(function (x) {
      h += '<div class="tp-g"><span class="tp-b ' + E(x.result) + '">' + E(x.result) + '</span><div class="tp-gm"><b>' + (x.home ? 'vs ' : '@ ') + E(x.opp) + '</b><div class="mu">' + E(x.score || 'Score unavailable') + '</div></div><div class="tp-gd">' + E(fmtDate(x.date)) + '</div></div>';
    });

    if (d.next) h += '<div class="tp-h">Next game</div><div class="tp-g"><div class="tp-gm"><b>' + (d.next.home ? 'vs ' : '@ ') + E(d.next.opp) + '</b><div class="mu">' + E(fmtWhen(d.next.date)) + '</div></div></div>';

    h += '<p class="tp-note">Team data from ESPN, refreshed every few minutes.</p>' + CLOSE;
    return h;
  }

  function open(name, sp, id) {
    var m = modal('');
    var box = m.firstChild;
    var shell = function (inner) { box.innerHTML = '<h3 class="tp-nm" style="margin-bottom:12px">' + E(name) + '</h3>' + inner + CLOSE; };
    var go = function () {
      shell('<div class="sk"></div><div class="sk"></div><div class="sk"></div>');
      var t = lookup(name, sp), useSp = sp || (t && t.sp), useId = id || (t && t.sp === useSp && t.id) || '';
      if (!useSp) { shell('<p class="mu" style="margin:6px 0 12px">We couldn\u2019t find a profile for ' + E(name) + '.</p>'); return; }
      load(useSp, name, useId).then(function (d) { if (m.isConnected) box.innerHTML = render(d, name); }).catch(function (e) {
        if (!m.isConnected) return;
        shell('<p class="mu" style="margin:6px 0 12px">' + (e.status === 404 ? 'We couldn\u2019t find a profile for ' + E(name) + '.' : 'Team data is unavailable right now. Try again in a minute.') + '</p>' + (e.status === 404 ? '' : '<button class="chip" data-tp-retry>Retry</button>'));
      });
    };
    box.addEventListener('click', function (e) { if (e.target.closest('[data-tp-retry]')) go(); });
    go();
  }

  // Capture phase, so the app's own click handler never also reacts to a Profile tap.
  document.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-tprof]');
    if (!c) return;
    e.preventDefault(); e.stopPropagation();
    // tapping a team inside a standings table swaps the open profile for that team
    var inTable = c.closest('.tp-tb'), old = inTable && c.closest('.modal');
    open(c.dataset.tprof, c.dataset.tsp || '', c.dataset.tid || '');
    if (old) old.remove();
  }, true);

  // ---- add Profile buttons wherever teams appear ----
  function modalNames(m) {
    var out = [];
    m.querySelectorAll('.score > div').forEach(function (d) {
      for (var i = 0; i < d.childNodes.length; i++) { var n = d.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) { out.push(n.textContent.trim()); break; } }
    });
    return out.length === 2 ? out : null;
  }

  function enhance() {
    // 1) Team rows (Discover, search results)
    document.querySelectorAll('.card.row.sp > button[data-fav^="T:"]:not([data-tp])').forEach(function (b) {
      b.dataset.tp = '1';
      var name = b.dataset.fav.slice(2), left = b.previousElementSibling;
      var wrap = document.createElement('div'); wrap.className = 'tp-act';
      var pb = document.createElement('button'); pb.type = 'button'; pb.className = 'chip'; pb.dataset.tprof = name; pb.textContent = 'Profile'; pb.setAttribute('aria-label', 'View ' + name + ' profile');
      b.before(wrap); wrap.append(pb, b);
      if (left) left.dataset.tprof = name;
    });
    // 2) Team game pop-ups (NFL, NBA, MLB, NHL, soccer...)
    if (typeof G === 'undefined' || typeof MMA !== 'function') return;
    document.querySelectorAll('.modal').forEach(function (m) {
      if (m.querySelector('.tp-links') || m.querySelector('.fp-links')) return;
      var names = modalNames(m); if (!names) return;
      var g = G.find(function (x) { return !MMA(x.sp) && x.a === names[0] && x.b === names[1]; });
      if (!g) return;
      var anchor = m.querySelector('.pk-grid') || m.querySelector('.score'); if (!anchor) return;
      var row = document.createElement('div'); row.className = 'tp-links';
      [g.a, g.b].forEach(function (n) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'chip';
        b.dataset.tprof = n; b.dataset.tsp = g.sp;
        b.textContent = n + ' \u00b7 record';
        row.appendChild(b);
      });
      anchor.after(row);
    });
  }

  var queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; try { enhance(); } catch (e) { console.error('team-profile', e); } }); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
})();
