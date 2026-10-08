/* Team records in the pick sheet: when you open a game to make a pick, each team's record, standing and last-5 form
   show right above the pick buttons (NFL, NBA, MLB, NHL, soccer...). Compact on purpose: no full profile pages.
   Data comes from /.netlify/functions/team (see src/functions/team.js). */
(function () {
  'use strict';
  var API = '/.netlify/functions/team';
  var memo = {}, pending = {};

  var E = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var css = document.createElement('style');
  css.textContent = [
    '.tp-mini{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:10px 0 0}',
    '.tp-t{background:var(--sf2);border-radius:12px;padding:10px 12px;min-width:0}',
    '.tp-t .tn{display:block;font-size:12px;font-weight:700;color:var(--mu);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tp-t .rc{display:block;font-family:var(--fd);font-size:24px;font-weight:900;line-height:1.1;margin:2px 0}',
    '.tp-t .st{display:block;font-size:12px;color:var(--mu);line-height:1.35}',
    '.tp-t .fm{display:flex;gap:3px;margin-top:6px;min-height:18px}',
    '.tp-b{width:18px;height:18px;border-radius:4px;display:grid;place-items:center;font-weight:800;font-size:10px;color:#fff;background:var(--mu)}',
    '.tp-b.W{background:var(--ok)}.tp-b.L{background:var(--bad)}',
    '.tp-t.ld .rc,.tp-t.ld .st{opacity:.4}'
  ].join('');
  document.head.appendChild(css);

  function lookup(name, sp) {
    var list = (typeof TEAMS !== 'undefined' && TEAMS) || [];
    return list.filter(function (t) { return t.sp === sp && (t.n === name || t.full === name); })[0] || null;
  }

  function load(sp, name) {
    var t = lookup(name, sp), id = t && t.id ? t.id : '', key = sp + '|' + (id || name.toLowerCase());
    if (memo[key]) return Promise.resolve(memo[key]);
    if (pending[key]) return pending[key];
    var qs = 'sport=' + encodeURIComponent(sp) + (id ? '&id=' + encodeURIComponent(id) : '&name=' + encodeURIComponent(name));
    pending[key] = fetch(API + '?' + qs).then(function (r) {
      return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'error'); memo[key] = j; return j; });
    }).then(function (j) { delete pending[key]; return j; }, function (e) { delete pending[key]; throw e; });
    return pending[key];
  }
  function cachedFor(sp, name) {
    var t = lookup(name, sp);
    return memo[sp + '|' + ((t && t.id) || name.toLowerCase())] || null;
  }

  function standing(d) {
    if (d.tags && d.tags[0] && /\b(in|of)\b/i.test(d.tags[0])) return d.tags[0]; // e.g. "1st in AFC West"
    var g = d.group;
    if (g && g.rows) { var r = g.rows.filter(function (x) { return x.you; })[0]; if (r) return '#' + r.rank + ' in ' + (g.name || 'division'); }
    return '';
  }
  function streak(d) {
    var t = (d.tags || []).filter(function (x) { return /^[WLT]\d+$/i.test(x); })[0];
    return t ? t.toUpperCase() : '';
  }

  function cell(name, d) {
    if (!d) return '<div class="tp-t ld"><span class="tn">' + E(name) + '</span><span class="rc">\u2013</span><span class="st">Loading record\u2026</span><div class="fm"></div></div>';
    var rec = d.record && d.record.summary ? d.record.summary : '\u2013';
    var meta = [standing(d), streak(d)].filter(Boolean).join(' \u00b7 ');
    var form = (d.last || []).slice(0, 5).reverse().map(function (x) { return '<span class="tp-b ' + E(x.result) + '">' + E(x.result) + '</span>'; }).join('');
    return '<div class="tp-t"><span class="tn">' + E(name) + '</span><span class="rc">' + E(rec) + '</span><span class="st">' + E(meta || ' ') + '</span><div class="fm" aria-label="Last 5 games">' + form + '</div></div>';
  }

  // Team names in the open pick sheet: from the pick buttons (same trick the fighter profiles use), else from the scoreboard in the sheet.
  function sheetNames(m) {
    var out = [];
    m.querySelectorAll('.pk-grid .pick[data-p]').forEach(function (p) { if (p.dataset.p !== 'Draw') out.push(p.dataset.p); });
    if (out.length === 2) return out;
    out = [];
    m.querySelectorAll('.score > div').forEach(function (d) {
      for (var i = 0; i < d.childNodes.length; i++) { var n = d.childNodes[i]; if (n.nodeType === 3 && n.textContent.trim()) { out.push(n.textContent.trim()); break; } }
    });
    return out.length === 2 ? out : null;
  }

  function paint(box, g, names) {
    box.innerHTML = names.map(function (n) { return cell(n, cachedFor(g.sp, n)); }).join('');
  }

  function enhance() {
    if (typeof G === 'undefined' || typeof MMA !== 'function') return;
    document.querySelectorAll('.modal').forEach(function (m) {
      var anchor = m.querySelector('.pk-grid'); if (!anchor) return;
      var names = sheetNames(m); if (!names) return;
      var g = G.find(function (x) { return !MMA(x.sp) && x.a === names[0] && x.b === names[1]; });
      if (!g) return;
      var box = m.querySelector('.tp-mini');
      if (box && box.nextElementSibling === anchor) return;   // already in place
      if (box) box.remove();
      box = document.createElement('div'); box.className = 'tp-mini';
      anchor.before(box);
      paint(box, g, names);
      names.forEach(function (n) {
        if (cachedFor(g.sp, n)) return;
        load(g.sp, n).then(function () { if (box.isConnected) paint(box, g, names); }).catch(function () {
          // no data for this team: drop the loading look instead of leaving it stuck
          if (box.isConnected && !cachedFor(g.sp, n)) { box.querySelectorAll('.tp-t.ld').forEach(function (c) { c.remove(); }); if (!box.children.length) box.remove(); }
        });
      });
    });
  }

  var queued = false;
  function schedule() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; try { enhance(); } catch (e) { console.error('team-records', e); } }); }
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  schedule();
})();
