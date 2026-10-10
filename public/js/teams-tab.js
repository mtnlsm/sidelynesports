/* Teams tab: pick a league, then a conference, and see each division's standings as its own table (W-L, PCT, etc).
   Tap a team for a small sheet with its record, last 5 games and next game.
   Data comes from /.netlify/functions/team (see src/functions/team.js). Loaded after app.js, which owns R, S, NAV and modal(). */
(function () {
  'use strict';
  var API = '/.netlify/functions/team';
  var SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'CFB'];
  var st = { sp: 'NFL', conf: 0, cf: 'TOP25', poll: 0, view: 'stand', pb: {}, tg: {}, ts: {} }, SD = {}, sbusy = {}, serr = {}, ST = {}, busy = {}, err = {}, RK = {}, rkBusy = {}, rkErr = {};

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
    '.tt-rk{font-size:11px;font-weight:800;color:var(--mu);margin-right:-2px}',
    '.tt-up{color:var(--ok);font-size:12px;font-weight:700}.tt-dn{color:var(--bad);font-size:12px;font-weight:700}.tt-nw{color:var(--mu);font-size:11px;font-weight:700}',
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
    '.st-sw{display:flex;gap:6px;margin:12px 0 0;padding:4px;background:var(--sf2);border-radius:12px}',
    '.st-sw button{flex:1;border:0;background:transparent;color:var(--mu);font:inherit;font-weight:700;font-size:13px;padding:9px 6px;border-radius:9px;cursor:pointer}',
    '.st-sw button.on{background:var(--sf);color:var(--tx);box-shadow:0 1px 4px rgba(0,0,0,.18)}',
    '.st-ph{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:top;background:var(--sf2);flex:none;display:block}',
    '.st-pl{display:flex;align-items:center;gap:9px;min-width:150px}.st-pl b{display:block;line-height:1.15}.st-pl small{display:block;color:var(--mu);font-size:11.5px;font-weight:600}',
    '.st-tb th[data-tgs]{cursor:pointer;white-space:nowrap}.st-tb th.on{color:var(--tx)}.st-tb td.on{font-weight:800;background:color-mix(in srgb,var(--ab,#0e8f4a) 10%,transparent)}',
    '.st-tb tbody tr:nth-child(-n+3) td.r{color:var(--tx);font-weight:800}',
    '.st-lead{display:flex;align-items:center;gap:14px;padding:14px;margin-top:12px;border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--ab,#0e8f4a) 22%,var(--sf2)),var(--sf2))}',
    '.st-lead .st-ph{width:64px;height:64px;border:3px solid var(--ab,#0e8f4a)}.st-lead small{color:var(--mu);font-weight:700;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em}',
    '.st-lead b{display:block;font-size:17px;line-height:1.15}.st-lead .big{font-family:var(--fd);font-style:italic;font-weight:900;font-size:34px;line-height:1;margin-left:auto;text-align:right}.st-lead .big small{display:block;margin-top:3px}',
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


  // ---- college football: Top 25 polls + every FBS conference ----
  function loadRk(sp) {
    var c = RK[sp];
    if ((c && Date.now() - c.at < 600000) || rkBusy[sp]) return;
    rkBusy[sp] = 1; delete rkErr[sp];
    fetchJson('sport=' + sp + '&type=rankings').then(function (d) { RK[sp] = { d: d, at: Date.now() }; })
      .catch(function () { rkErr[sp] = 1; })
      .then(function () { rkBusy[sp] = 0; paint(); });
  }
  var CF_ORD = [/\b(sec|southeastern)\b/i, /big ten/i, /big 12/i, /\b(acc|atlantic coast)\b/i, /mountain west/i, /sun belt/i, /conference usa|\bc-usa\b/i, /mid-american|\bmac\b/i, /american|\baac\b/i, /pac-12|pac 12/i, /independ/i];
  function cfRankOf(n) { for (var i = 0; i < CF_ORD.length; i++) if (CF_ORD[i].test(n)) return i; return 50; }
  function cfList(gs) {
    var seen = {}, out = [];
    gs.forEach(function (g) { var c = g.conf || g.name; if (c && !seen[c]) { seen[c] = 1; out.push(c); } });
    return out.sort(function (a, b) { return cfRankOf(a) - cfRankOf(b) || a.localeCompare(b); });
  }
  var cfShort = function (k) { return k === 'TOP25' ? 'Top 25' : String(k).replace(/ Conference$/i, ''); };
  function rankMap() { var d = RK.CFB && RK.CFB.d, p = d && d.polls && d.polls[0], m = {}; if (p) p.ranks.forEach(function (r) { m[r.id] = r.rank; }); return m; }
  function tbl(g, rm) {
    var h = '<div class="glass card" style="padding:4px 12px"><div class="tt-sc"><table class="tt-tb"><thead><tr><th class="r"></th><th class="n"></th>' +
      g.labels.map(function (l) { return '<th>' + E(l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    g.rows.forEach(function (r) {
      h += '<tr data-ttm="' + E(r.id) + '" data-ttn="' + E(r.n) + '"><td class="r">' + r.rank + '</td><td class="n"><span>' + jr(r.n, 24, r.ab) +
        (rm && rm[r.id] ? '<b class="tt-rk">#' + rm[r.id] + '</b>' : '') + E(r.n) + '</span></td>' +
        r.v.map(function (v) { return '<td>' + E(v) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div></div>';
  }
  function trend(r) {
    if (r.prev == null) return '<span class="tt-nw">NEW</span>';
    var d = r.prev - r.rank;
    return d > 0 ? '<span class="tt-up">\u25B2' + d + '</span>' : d < 0 ? '<span class="tt-dn">\u25BC' + (-d) + '</span>' : '<span class="mu">\u2013</span>';
  }
  function bodyCFB() {
    var gs = groupsFor('CFB'), confs = gs ? cfList(gs) : [], keys = ['TOP25'].concat(confs);
    var sel = st.cf !== 'TOP25' && confs.indexOf(st.cf) >= 0 ? st.cf : 'TOP25';
    var h = '<div class="cat-row" role="tablist" style="margin-top:12px">' + keys.map(function (k, i) {
      return '<button class="chip ' + (k === sel ? 'on' : '') + '" role="tab" data-ttcc="' + i + '">' + E(cfShort(k)) + '</button>';
    }).join('') + '</div>';
    if (sel === 'TOP25') {
      var rk = RK.CFB;
      if (!rk) return h + (rkErr.CFB ? '<p class="mu" style="margin:10px 0">The Top 25 isn\u2019t available right now.</p><button class="chip" data-ttretry>Retry</button>' : '<div class="sk"></div><div class="sk"></div>');
      var polls = rk.d.polls || [], p = polls[Math.min(st.poll, polls.length - 1)];
      if (!p) return h + '<p class="mu" style="margin:10px 0">No poll has been released yet.</p>';
      var hasPts = p.ranks.some(function (r) { return r.pts != null; });
      if (polls.length > 1) h += '<div class="cat-row" role="tablist" style="margin-top:8px">' + polls.map(function (x, i) {
        return '<button class="chip ' + (x === p ? 'on' : '') + '" role="tab" data-ttpl="' + i + '">' + E(x.short || x.name) + '</button>'; }).join('') + '</div>';
      h += '<h3 class="tt-h">' + E(p.name) + '</h3><div class="glass card" style="padding:4px 12px"><div class="tt-sc"><table class="tt-tb"><thead><tr><th class="r"></th><th class="n"></th><th>REC</th>' +
        (hasPts ? '<th>PTS</th>' : '') + '<th></th></tr></thead><tbody>';
      p.ranks.forEach(function (r) {
        h += '<tr data-ttm="' + E(r.id) + '" data-ttn="' + E(r.n) + '"><td class="r">' + r.rank + '</td><td class="n"><span>' + jr(r.n, 24, r.ab) + E(r.n) + '</span></td><td>' + E(r.rec) + '</td>' +
          (hasPts ? '<td>' + (r.pts != null ? E(r.pts.toLocaleString()) : '') + '</td>' : '') + '<td>' + trend(r) + '</td></tr>';
      });
      return h + '</tbody></table></div></div><p class="tt-note">Polls from ESPN, refreshed every few minutes. Tap a team for its record and recent games.</p>';
    }
    if (!gs) return h + (err.CFB ? '<p class="mu" style="margin:10px 0">Standings aren\u2019t available right now.</p><button class="chip" data-ttretry>Retry</button>' : '<div class="sk"></div><div class="sk"></div>');
    var rm = rankMap();
    gs.filter(function (g) { return (g.conf || g.name) === sel; }).forEach(function (g) {
      h += '<h3 class="tt-h">' + E(g.div ? sel + ' \u00B7 ' + g.div : sel) + '</h3>' + tbl(g, rm);
    });
    return h + '<p class="tt-note">Conference standings from ESPN, ordered by conference record. #\u2009numbers are the current AP Top 25. Tap a team for its record and recent games.</p>';
  }

  function body() {
    if (st.view !== 'stand') return statsBody();
    if (st.sp === 'CFB') return bodyCFB();
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


  // ---------------- Player + team stats (data from /.netlify/functions/stats) ----------------
  var SAPI = '/.netlify/functions/stats';
  var BOARDS = {
    NFL: [['pass', 'Passing'], ['rush', 'Rushing'], ['rec', 'Receiving'], ['tkl', 'Tackles'], ['sck', 'Sacks'], ['int', 'Interceptions']],
    CFB: [['pass', 'Passing'], ['rush', 'Rushing'], ['rec', 'Receiving'], ['tkl', 'Tackles'], ['sck', 'Sacks']],
    NBA: [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['stl', 'Steals'], ['blk', 'Blocks']],
    MLB: [['hr', 'Home runs'], ['avg', 'Batting avg'], ['rbi', 'RBIs'], ['k', 'Strikeouts'], ['w', 'Pitching wins']],
    NHL: [['pts', 'Points'], ['g', 'Goals'], ['a', 'Assists']]
  };
  function sload(key, qs) {
    var c = SD[key];
    if ((c && Date.now() - c.at < 600000) || sbusy[key]) return;
    sbusy[key] = 1; delete serr[key];
    fetch(SAPI + '?' + qs).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.error || 'error'); return j; }); })
      .then(function (d) { SD[key] = { d: d, at: Date.now() }; })
      .catch(function () { serr[key] = 1; })
      .then(function () { sbusy[key] = 0; paint(); });
  }
  function sState(key) {
    if (SD[key]) return '';
    return serr[key] ? '<p class="mu" style="margin:10px 0">These stats aren\u2019t available right now.</p><button class="chip" data-ttsretry="' + E(key) + '">Retry</button>' : '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  }
  function playersBody() {
    var sp = st.sp, bs = BOARDS[sp] || [], id = st.pb[sp] && bs.some(function (b) { return b[0] === st.pb[sp]; }) ? st.pb[sp] : (bs[0] || [])[0];
    var key = 'p:' + sp + ':' + id;
    sload(key, 'sport=' + sp + '&kind=players&id=' + id);
    var h = '<div class="cat-row" role="tablist" style="margin-top:12px">' + bs.map(function (b) { return '<button class="chip ' + (b[0] === id ? 'on' : '') + '" role="tab" data-tpb="' + b[0] + '">' + E(b[1]) + '</button>'; }).join('') + '</div>';
    if (!SD[key]) return h + sState(key);
    var d = SD[key].d, top = d.rows[0], sc = d.cols[d.sortCol] || d.cols[0];
    h += '<div class="st-lead">' + (top.img ? '<img class="st-ph" src="' + E(top.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility=\'hidden\'">' : '') +
      '<div style="min-width:0"><small>League leader \u00b7 ' + E(d.label) + '</small><b>' + E(top.n) + '</b><span class="mu">' + E([top.t, top.pos].filter(Boolean).join(' \u00b7 ')) + '</span></div>' +
      '<div class="big">' + E(top.v[d.sortCol] || top.v[0]) + '<small>' + E(sc.t || sc.l) + '</small></div></div>';
    h += '<h3 class="tt-h">' + E(d.label) + ' leaders</h3><div class="glass card" style="padding:4px 12px"><div class="tt-sc"><table class="tt-tb st-tb"><thead><tr><th class="r"></th><th class="n"></th>' +
      d.cols.map(function (c, i) { return '<th class="' + (i === d.sortCol ? 'on' : '') + '" title="' + E(c.t) + '">' + E(c.l) + '</th>'; }).join('') + '</tr></thead><tbody>';
    d.rows.forEach(function (r, i) {
      h += '<tr><td class="r">' + (i + 1) + '</td><td class="n"><div class="st-pl">' + (r.img ? '<img class="st-ph" src="' + E(r.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility=\'hidden\'">' : '<i class="st-ph"></i>') +
        '<span><b>' + E(r.n) + '</b><small>' + E([r.t, r.pos].filter(Boolean).join(' \u00b7 ')) + '</small></span></div></td>' +
        r.v.map(function (v, k) { return '<td class="' + (k === d.sortCol ? 'on' : '') + '">' + E(v) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div></div><p class="tt-note">Top 25 for the current season from ESPN, refreshed every few minutes.</p>';
  }
  function numOf(v) { var n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : -Infinity; }
  function teamsBody() {
    var sp = st.sp, key = 't:' + sp;
    sload(key, 'sport=' + sp + '&kind=teams');
    if (!SD[key]) return sState(key);
    var d = SD[key].d, gs = d.groups, gk = st.tg[sp] && gs.some(function (g) { return g.k === st.tg[sp]; }) ? st.tg[sp] : gs[0].k, g = gs.filter(function (x) { return x.k === gk; })[0];
    var so = st.ts[sp + ':' + gk] || { i: 0, dir: -1 };
    var rows = d.rows.slice().sort(function (a, b) { var x = numOf((a.v[gk] || [])[so.i]), y = numOf((b.v[gk] || [])[so.i]); return (x === y ? 0 : x < y ? -1 : 1) * so.dir || a.n.localeCompare(b.n); });
    var h = '<div class="cat-row" role="tablist" style="margin-top:12px">' + gs.map(function (x) { return '<button class="chip ' + (x.k === gk ? 'on' : '') + '" role="tab" data-tgc="' + E(x.k) + '">' + E(x.n) + '</button>'; }).join('') + '</div>';
    h += '<h3 class="tt-h">Team ' + E(g.n.toLowerCase()) + '</h3><div class="glass card" style="padding:4px 12px"><div class="tt-sc"><table class="tt-tb st-tb"><thead><tr><th class="r"></th><th class="n"></th>' +
      g.cols.map(function (c, i) { return '<th data-tgs="' + i + '" class="' + (i === so.i ? 'on' : '') + '" title="' + E(c.t) + '">' + E(c.l) + (i === so.i ? (so.dir < 0 ? ' \u25BE' : ' \u25B4') : '') + '</th>'; }).join('') + '</tr></thead><tbody>';
    rows.forEach(function (r, i) {
      h += '<tr><td class="r">' + (i + 1) + '</td><td class="n"><span>' + jr(r.n, 24, r.ab) + E(r.n) + '</span></td>' +
        (r.v[gk] || []).map(function (v, k) { return '<td class="' + (k === so.i ? 'on' : '') + '">' + E(v) + '</td>'; }).join('') + '</tr>';
    });
    return h + '</tbody></table></div></div><p class="tt-note">Tap a column heading to sort. Season totals and averages from ESPN.</p>';
  }
  function statsBody() { return st.view === 'players' ? playersBody() : teamsBody(); }

  function paint() {
    if (typeof S === 'undefined' || S.tab !== 'teams') return;
    var b = document.getElementById('tmx'); if (b) b.innerHTML = body();
  }

  R.teams = function () {
    if (st.view === 'stand') { load(st.sp); if (st.sp === 'CFB') loadRk('CFB'); }
    return '<h2>Teams</h2><div class="cat-row" role="tablist">' + SPORTS.map(function (c) {
      return '<button class="chip ' + (c === st.sp ? 'on' : '') + '" role="tab" data-tts="' + c + '">' + E(label(c)) + '</button>';
    }).join('') + '</div><div class="st-sw" role="tablist">' + [['stand', 'Standings'], ['players', 'Player stats'], ['teams', 'Team stats']].map(function (v) {
      return '<button class="' + (v[0] === st.view ? 'on' : '') + '" role="tab" data-tsv="' + v[0] + '">' + v[1] + '</button>';
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
    if ((c = e.target.closest('[data-tsv]'))) { st.view = c.dataset.tsv; go('teams'); return; }
    if ((c = e.target.closest('[data-tpb]'))) { st.pb[st.sp] = c.dataset.tpb; paint(); return; }
    if ((c = e.target.closest('[data-tgc]'))) { st.tg[st.sp] = c.dataset.tgc; paint(); return; }
    if ((c = e.target.closest('[data-tgs]'))) { var gk2 = st.tg[st.sp] || '', k2 = st.sp + ':' + gk2, o = st.ts[k2] || { i: 0, dir: -1 }, ni = +c.dataset.tgs; if (!gk2 && SD['t:' + st.sp]) { gk2 = SD['t:' + st.sp].d.groups[0].k; k2 = st.sp + ':' + gk2; o = st.ts[k2] || o; } st.ts[k2] = o.i === ni ? { i: ni, dir: -o.dir } : { i: ni, dir: -1 }; paint(); return; }
    if ((c = e.target.closest('[data-ttsretry]'))) { delete serr[c.dataset.ttsretry]; paint(); return; }
    if ((c = e.target.closest('[data-tts]'))) { st.sp = c.dataset.tts; st.conf = 0; go('teams'); return; }
    if ((c = e.target.closest('[data-ttcc]'))) { var gs0 = groupsFor('CFB'), ks = ['TOP25'].concat(gs0 ? cfList(gs0) : []); st.cf = ks[+c.dataset.ttcc] || 'TOP25'; paint(); return; }
    if ((c = e.target.closest('[data-ttpl]'))) { st.poll = +c.dataset.ttpl || 0; paint(); return; }
    if ((c = e.target.closest('[data-ttcf]'))) { st.conf = +c.dataset.ttcf; paint(); document.querySelectorAll('#tmx .cat-row .chip').forEach(function (b, i) { b.classList.toggle('on', i === st.conf); }); return; }
    if (e.target.closest('[data-ttretry]')) { delete err[st.sp]; delete rkErr[st.sp]; load(st.sp); if (st.sp === 'CFB') loadRk('CFB'); paint(); return; }
    if ((c = e.target.closest('[data-ttm]'))) { openTeam(c.dataset.ttm, c.dataset.ttn); }
  });
})();
