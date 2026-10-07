// Live game panel: line score, outs/runners/count (MLB), down & distance (NFL), box score, lineups, team stats, recent plays.
// Only shown for LIVE team games. Polls /game-detail every 15s while the game sheet is open.
(function () {
  const E = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isTeam = (g) => g && g.st === 'live' && g.sp !== 'UFC' && g.sp !== 'PFL';
  const C = {}; // game id -> { d, err, tab, tm, gi }

  // Diamond with base runners (filled = occupied).
  const diamond = (s) => {
    const b = (x, y, on) => `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" transform="rotate(45 ${x} ${y})" class="${on ? 'on' : ''}"/>`;
    return `<svg class="lv-dia" viewBox="0 0 60 56" width="64" height="60" aria-hidden="true">${b(30, 12, s.r2)}${b(50, 30, s.r1)}${b(10, 30, s.r3)}<rect x="24" y="44" width="12" height="12" class="hp"/></svg>`;
  };
  const dots = (n, max, cls) => Array.from({ length: max }, (_, i) => `<i class="${cls}${i < n ? ' on' : ''}"></i>`).join('');

  // Compact line shown on the live score cards.
  window.sitLine = (g) => {
    if (!isTeam(g) || !g.sit) return '';
    const s = g.sit;
    if (s.k === 'b') return `<div class="lv-mini">${diamond(s).replace('width="64" height="60"', 'width="28" height="26"')}<span>${s.o} out${s.o === 1 ? '' : 's'} · ${s.ba}-${s.sk}</span></div>`;
    if (s.k === 'f' && s.dd) return `<div class="lv-mini"><span>${s.po ? (s.po === 'a' ? E(g.a) : E(g.b)) + ' ball · ' : ''}${E(s.dd)}${s.rz ? ' · <b class="lv-rz">Red zone</b>' : ''}</span></div>`;
    return '';
  };

  function situation(d) {
    const s = d.sit; if (!s) return '';
    if (s.k === 'b') return `<div class="lv-sit">${diamond(s)}<div class="lv-cnt"><div><span>B</span>${dots(s.ba, 4, 'bl')}</div><div><span>S</span>${dots(s.sk, 3, 'sk')}</div><div><span>O</span>${dots(s.o, 3, 'ot')}</div></div>
      <div class="lv-who">${s.bt ? `<div><small>At bat</small><b>${E(s.bt)}</b></div>` : ''}${s.pt ? `<div><small>Pitching</small><b>${E(s.pt)}</b></div>` : ''}</div></div>${s.lp ? `<p class="lv-lp">${E(s.lp)}</p>` : ''}`;
    if (s.k === 'f') { const tm = s.po === 'a' ? d.away.ab : s.po === 'b' ? d.home.ab : '';
      return `<div class="lv-fb"><div><small>${tm ? E(tm) + ' ball' : 'Situation'}</small><b>${E(s.dd || '—')}</b>${s.pt ? `<span class="mu"> · ${E(s.pt)}</span>` : ''}${s.rz ? ' <b class="lv-rz">Red zone</b>' : ''}</div>${s.ta != null || s.tb != null ? `<div class="mu">Timeouts · ${E(d.away.ab)} ${s.ta != null ? s.ta : '–'} · ${E(d.home.ab)} ${s.tb != null ? s.tb : '–'}</div>` : ''}</div>${s.lp ? `<p class="lv-lp">${E(s.lp)}</p>` : ''}`; }
    return s.lp ? `<p class="lv-lp">${E(s.lp)}</p>` : '';
  }

  function lineScore(d) {
    const base = d.sp === 'MLB' || d.sp === 'CBASE', head = d.lab.map((l) => `<th>${E(l)}</th>`).join('') + '<th class="t">' + (base ? 'R' : 'T') + '</th>' + (base ? '<th>H</th><th>E</th>' : '');
    const row = (t) => `<tr><td class="n">${E(t.ab || t.n)}</td>${t.ls.map((v) => `<td>${E(v)}</td>`).join('')}<td class="t">${E(t.sc)}</td>${base ? `<td>${t.h != null ? t.h : '–'}</td><td>${t.e != null ? t.e : '–'}</td>` : ''}</tr>`;
    return `<div class="lv-sc"><table class="lv-tb"><thead><tr><th class="n"></th>${head}</tr></thead><tbody>${row(d.away)}${row(d.home)}</tbody></table></div>`;
  }

  function plays(d) {
    if (!d.plays.length) return '';
    return `<div class="lv-h">Recent plays</div><div class="lv-pl">${d.plays.map((p) => `<div class="${p.sc ? 'sc' : ''}">${p.c || p.p ? `<small>${E([p.p, p.c].filter(Boolean).join(' · '))}</small>` : ''}${E(p.t)}</div>`).join('')}</div>`;
  }

  function teamToggle(c, d) {
    return `<div class="lv-tt"><button class="chip${c.tm === 0 ? ' on' : ''}" data-lvm="0">${E(d.away.ab || d.away.n)}</button><button class="chip${c.tm === 1 ? ' on' : ''}" data-lvm="1">${E(d.home.ab || d.home.n)}</button></div>`;
  }

  function boxTab(c, d) {
    const gs = d.box[c.tm] || [];
    if (!gs.length) return teamToggle(c, d) + '<p class="mu">Box score isn\u2019t available yet.</p>';
    const gi = Math.min(c.gi || 0, gs.length - 1), g = gs[gi];
    const tabs = gs.length > 1 ? `<div class="lv-tt lv-gt">${gs.map((x, i) => `<button class="chip${i === gi ? ' on' : ''}" data-lvg="${i}">${E(x.n || x.k)}</button>`).join('')}</div>` : '';
    const rows = g.rows.slice().sort((a, b) => (a.dnp ? 1 : 0) - (b.dnp ? 1 : 0)).map((r) => `<tr class="${r.st ? 'st' : ''}"><td class="n"><span class="lv-pn">${r.i && /^https:\/\//.test(r.i) ? `<img class="lv-ph" src="${E(r.i)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<i class="lv-ph"></i>'}<span><b>${E(r.n)}</b>${r.pos ? `<small> ${E(r.pos)}</small>` : ''}</span></span></td>${r.dnp || !r.s.length ? `<td colspan="${g.labels.length}" class="mu">DNP</td>` : g.labels.map((_, i) => `<td>${E(r.s[i] != null ? r.s[i] : '')}</td>`).join('')}</tr>`).join('');
    const tot = g.tot && g.tot.length ? `<tr class="tot"><td class="n"><b>Total</b></td>${g.labels.map((_, i) => `<td>${E(g.tot[i] != null ? g.tot[i] : '')}</td>`).join('')}</tr>` : '';
    return `${teamToggle(c, d)}${tabs}<div class="lv-sc"><table class="lv-tb lv-bx"><thead><tr><th class="n"></th>${g.labels.map((l) => `<th>${E(l)}</th>`).join('')}</tr></thead><tbody>${rows}${tot}</tbody></table></div>`;
  }

  function luTab(d) {
    if (!d.lu[0] && !d.lu[1]) return '<p class="mu">Lineups aren\u2019t available for this game.</p>';
    const list = (a, bat) => a.map((p, i) => `<li>${bat ? `<span class="bo">${p.bo || i + 1}</span>` : p.jn ? `<span class="bo">${E(p.jn)}</span>` : ''}<b>${E(p.n)}</b>${p.pos ? `<small>${E(p.pos)}</small>` : ''}</li>`).join('');
    const one = (u, t) => { if (!u) return ''; const bat = d.sp === 'MLB' || d.sp === 'CBASE';
      return `<div class="lv-lu"><div class="lv-h">${E(t.n)}${u.f ? ` <span class="mu">· ${E(u.f)}</span>` : ''}</div><div class="lv-sub">${bat ? 'Batting order' : 'Starters'}</div><ul>${list(u.s, bat)}</ul>${u.p && u.p.length ? `<div class="lv-sub">Pitchers</div><ul>${list(u.p, false)}</ul>` : ''}${u.b && u.b.length ? `<div class="lv-sub">${bat ? 'Bench / subs' : 'Bench'}</div><ul>${list(u.b, false)}</ul>` : ''}</div>`; };
    return one(d.lu[0], d.away) + one(d.lu[1], d.home);
  }

  function tsTab(d) {
    if (!d.ts.length) return '<p class="mu">Team stats aren\u2019t available yet.</p>';
    return `<div class="lv-ts"><div class="lv-tsh"><b>${E(d.away.ab || d.away.n)}</b><span></span><b>${E(d.home.ab || d.home.n)}</b></div>${d.ts.map((r) => `<div><b>${E(r[1])}</b><span>${E(r[0])}</span><b>${E(r[2])}</b></div>`).join('')}</div>`;
  }

  function inner(g) {
    const c = C[g.id];
    if (!c || !c.d) return `<p class="mu lv-ld">${c && c.err ? 'Live details aren\u2019t available right now.' : 'Loading live details\u2026'}</p>`;
    const d = c.d, tabs = [['live', 'Live'], ['box', 'Box score'], ['lu', 'Lineups'], ['ts', 'Team stats']].filter((t) => t[0] !== 'lu' || d.lu[0] || d.lu[1]).filter((t) => t[0] !== 'ts' || d.ts.length);
    const tab = tabs.some((t) => t[0] === c.tab) ? c.tab : 'live';
    const body = tab === 'live' ? lineScore(d) + situation(d) + plays(d) : tab === 'box' ? boxTab(c, d) : tab === 'lu' ? luTab(d) : tsTab(d);
    return `<div class="lv-tabs">${tabs.map((t) => `<button class="${t[0] === tab ? 'on' : ''}" data-lvt="${t[0]}">${t[1]}</button>`).join('')}</div><div class="lv-body">${body}</div>${c.err ? '<p class="mu lv-ld">Reconnecting\u2026</p>' : ''}`;
  }

  // Placeholder container for the game sheet template (re-rendered from cache whenever the sheet redraws).
  window.lvHtml = (g) => (isTeam(g) ? `<div id="lvd" class="lvd">${inner(g)}</div>` : '');

  window.startLive = (g, m) => {
    if (!isTeam(g)) return;
    const c = (C[g.id] = C[g.id] || { tab: 'live', tm: 0, gi: 0 });
    const paint = () => { const b = m.querySelector('#lvd'); if (b) b.innerHTML = inner(g); };
    m.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lvt]'), x = e.target.closest('[data-lvm]'), y = e.target.closest('[data-lvg]');
      if (t) { c.tab = t.dataset.lvt; paint(); } else if (x) { c.tm = +x.dataset.lvm; c.gi = 0; paint(); } else if (y) { c.gi = +y.dataset.lvg; paint(); }
    });
    const pull = async () => {
      if (!m.isConnected) return;
      if (!document.hidden) { try { c.d = await FX_API.gameDetail(g.id); c.err = 0; } catch (e) { c.err = 1; } paint(); }
      if (m.isConnected) setTimeout(pull, 15000);
    };
    pull();
  };
})();
