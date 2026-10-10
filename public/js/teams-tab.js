/* Teams tab: pick a league, then a conference, and see each division's standings as its own table (W-L, PCT, etc).
   Tap a team for a small sheet with its record, last 5 games and next game.
   Data comes from /.netlify/functions/team (see src/functions/team.js). Loaded after app.js, which owns R, S, NAV and modal(). */
(function () {
  'use strict';
  var API = '/.netlify/functions/team';
  var SPORTS = ['NFL', 'NBA', 'MLB', 'NHL'];
  var st = { sp: 'NFL', conf: 0 }, ST = {}, busy = {}, err = {};

  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var label = function (c) { try { return spl(c); } catch (e) { return c; } };

  var css = document.createElement('style');
  css.textContent = [
    '.tt-h{font-family:var(--fd);font-style:italic;font-weight:800;text-transform:uppercase;letter-spacing:.06em;font-size:16px;margin:18px 0 6px}',
    '.tt-sc{overflow-x:auto;-webkit-overflow-scrolling:touch}',
    '.tt-tb{width:100%;border-collapse:collapse;font-size:14px;font-variant-numeric:tabular-nums}',
    '.tt-tb th{color:var(--mu);font-weight:600;font-size:11px;padding:4px 6px;text-align:center}',
    '.tt-tb td{padding:9px 6px;text-align:center;border-top:1px solid var(--bd)}',
    '.tt-tb .n{text-align:left;white-space:nowrap}',
    '.tt-tb .r{color:var(--mu);width:22px;text-align:left}',
    '.tt-tb .n span{display:inline-flex;align-items:center;gap:8px;font-weight:700}',
    '.tt-tb .n img,.tt-tb .n svg{width:24px;height:24px;object-fit:contain;flex:none}',
    '.tt-tb tr[data-ttm]{cursor:pointer}',
    '.tt-tb tr[data-ttm]:active td{background:var(--sf2)}',
    '.tt-note{color:var(--mu);font-size:12px;margin-top:14px}',
    '.tt-rec{display:flex;align-items:baseline;gap:12px;margin:14px 0 6px;flex-wrap:wrap}',
    '.tt-rec b{font-family:var(--fd);font-size:44px;font-weight:900;font-style:italic;line-height:1}',
    '.tt-rec span{color:var(--mu)}',
    '.tt-bio{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:8px;margin:10px 0 4px}',
    '.tt-bio div{background:var(--sf2);border-radius:10px;padding:8px 10px}',
    '.tt-bio small{display:block;color:var(--mu);font-size:12px}',
    '.tt-bio span{font-weight:700}',
    '.tt-b{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;font-weight:800;font-size:12px;color:#fff;flex:none;background:var(--mu)}',
    '.tt-b.W{background:var(--ok)}.tt-b.L{background:var(--bad)}',
    '.tt-g{display:flex;gap:12px;align-items:center;padding:9px 0;border-top:1px solid var(--bd)}',
    '.tt-gm{flex:1;min-width:0}.tt-gm b{display:block;overflow-wrap:anywhere}',
    '.tt-gd{text-align:right;font-size:13px;color:var(--mu);flex:none}',
    '.tt-hd{display:flex;gap:12px;align-items:center}',
    '.tt-lg{width:60px;height:60px;flex:none}.tt-lg img,.tt-lg svg{width:100%;height:100%;object-fit:contain;display:block}',
    '.tt-nm{font-family:var(--fd);font-size:26px;font-weight:800;text-transform:uppercase;line-height:1.05;margin:0;overflow-wrap:anywhere}'
  ].join('');
  document.head.appendChild(css);

  function fetchJson(qs) {
    return fetch(API + '?' + qs).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'error'); return j; }); });
  }

  function jr(n, z, ab) { try { return jerseySvg(n, z, st.sp, ab); } catch (e) { return ''; } }
  function load(sp) {
    var c = ST[sp];
    if ((c && Date.now() - c.at < 300000) || busy[sp]) return;
    busy[sp] = 1; delete err[sp];
    fetchJson('sport=' + sp + '&type=standings').then(function (d) { ST[sp] = { d: d, at: Date.now() }; })
      .catch(function () { err[sp] = 1; })
      .then(function () { busy[sp] = 0; paint(); });
  }

  function groupsFor(sp) { var c = ST[sp]; return c ? c.d.groups || [] : null; }
  function parents(gs) { var out = []; gs.forEach(function (g) { if (g.parent && out.indexOf(g.parent) < 0) out.push(g.parent); }); return out; }

  function body() {
    var sp = st.sp, gs = groupsFor(sp);
    if (!gs) {
      if (err[sp]) return '<p class="mu" style="margin:10px 0">Standings aren\u2019t available right now.</p><button class="chip" data-ttretry>Retry</button>';
      return '<div class="sk"></div><div class="sk"></div>';
    }
    var ps = parents(gs), conf = ps.length > 1 ? ps[Math.min(st.conf, ps.length - 1)] : '';
    var cf = ps.length > 1 ? '<div class="cat-row" role="tablist" style="margin-top:12px">' + ps.map(function (p, i) { return '<button class="chip ' + (p === conf ? 'on' : '') + '" role="tab" data-ttcf="' + i + '">' + E(p) + '</button>'; }).join('') + '</div>' : '';
    var show = ps.length > 1 ? gs.filter(function (g) { return g.parent === conf; }) : gs;
    var h = cf;
    show.forEach(function (g) {
      h += '<h3 class="tt-h">' + E(g.name || label(sp)) + '</h3><div class="glass card" style="padding:4px 12px"><div class="tt-sc"><table class="tt-tb"><thead><tr><th class="r"></th><th class="n"></th>' +
        g.labels.map(function (l) { return '<th>' + E(l) + '</th>'; }).join('') + '</tr></thead><tbody>';
      g.rows.forEach(function (r) {
        h += '<tr data-ttm="' + E(r.id) + '" data-ttn="' + E(r.n) + '"><td class="r">' + r.rank + '</td><td class="n"><span>' +
          jr(r.n, 24, r.ab) + E(r.n) + '</span></td>' +
          r.v.map(function (v) { return '<td>' + E(v) + '</td>'; }).join('') + '</tr>';
      });
      h += '</tbody></table></div></div>';
    });
    return h + '<p class="tt-note">Tap a team for its record and recent games. Standings from ESPN, refreshed every few minutes.</p>';
  }

  function paint() {
    if (typeof S === 'undefined' || S.tab !== 'teams') return;
    var b = document.getElementById('tmx'); if (b) b.innerHTML = body();
  }

  R.teams = function () {
    load(st.sp);
    return '<h2>Teams</h2><div class="cat-row" role="tablist">' + SPORTS.map(function (c) {
      return '<button class="chip ' + (c === st.sp ? 'on' : '') + '" role="tab" data-tts="' + c + '">' + E(label(c)) + '</button>';
    }).join('') + '</div><div id="tmx">' + body() + '</div>';
  };

  // ---- small team sheet ----
  function fmtDate(d) { var t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { month: 'short', day: 'numeric' }); }
  function fmtWhen(d) { var t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' \u00b7 ' + t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }

  function sheet(d, name) {
    var r = d.record || {}, f = d.last || [];
    var h = '<div class="tt-hd"><div class="tt-lg">' + jr(d.name || name, 60, d.ab) + '</div><div style="min-width:0"><h3 class="tt-nm">' + E(d.name || name) + '</h3>' +
      (d.tags && d.tags.length ? '<div class="mu" style="margin-top:4px">' + E(d.tags.join(' \u00b7 ')) + '</div>' : '') + '</div></div>';
    if (r.summary) h += '<div class="tt-rec"><b>' + E(r.summary) + '</b><span>Record</span></div>';
    if (d.stats && d.stats.length) h += '<div class="tt-bio">' + d.stats.map(function (x) { return '<div><small>' + E(x[0]) + '</small><span>' + E(x[1]) + '</span></div>'; }).join('') + '</div>';
    h += '<h3 class="tt-h">Last ' + (f.length || 5) + ' games</h3>';
    if (!f.length) h += '<p class="mu">No recent games on record.</p>';
    f.forEach(function (x) {
      h += '<div class="tt-g"><span class="tt-b ' + E(x.result) + '">' + E(x.result) + '</span><div class="tt-gm"><b>' + (x.home ? 'vs ' : '@ ') + E(x.opp) + '</b><div class="mu">' + E(x.score || 'Score unavailable') + '</div></div><div class="tt-gd">' + E(fmtDate(x.date)) + '</div></div>';
    });
    if (d.next) h += '<h3 class="tt-h">Next game</h3><div class="tt-g"><div class="tt-gm"><b>' + (d.next.home ? 'vs ' : '@ ') + E(d.next.opp) + '</b><div class="mu">' + E(fmtWhen(d.next.date)) + '</div></div></div>';
    return h;
  }

  function openTeam(id, name) {
    var m = modal(''), box = m.firstChild, sp = st.sp;
    var shell = function (inner) { box.innerHTML = '<h3 class="tt-nm" style="margin-bottom:12px">' + E(name) + '</h3>' + inner + '<button class="chip" style="margin-top:12px" data-x>Close</button>'; };
    var go = function () {
      shell('<div class="sk"></div><div class="sk"></div>');
      fetchJson('sport=' + sp + '&id=' + encodeURIComponent(id)).then(function (d) {
        if (m.isConnected) box.innerHTML = sheet(d, name) + '<button class="chip" style="margin-top:12px" data-x>Close</button>';
      }).catch(function () {
        if (m.isConnected) shell('<p class="mu" style="margin:6px 0 12px">Team data is unavailable right now.</p><button class="chip" data-ttretry2>Retry</button>');
      });
    };
    box.addEventListener('click', function (e) { if (e.target.closest('[data-ttretry2]')) go(); });
    go();
  }

  document.addEventListener('click', function (e) {
    var c;
    if ((c = e.target.closest('[data-tts]'))) { st.sp = c.dataset.tts; st.conf = 0; go('teams'); return; }
    if ((c = e.target.closest('[data-ttcf]'))) { st.conf = +c.dataset.ttcf; paint(); document.querySelectorAll('#tmx .cat-row .chip').forEach(function (b, i) { b.classList.toggle('on', i === st.conf); }); return; }
    if (e.target.closest('[data-ttretry]')) { delete err[st.sp]; load(st.sp); paint(); return; }
    if ((c = e.target.closest('[data-ttm]'))) { openTeam(c.dataset.ttm, c.dataset.ttn); }
  });
})();
