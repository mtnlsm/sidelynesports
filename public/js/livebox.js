// Live game panel: line score, outs/runners/count (MLB), down & distance (NFL), box score, lineups, team stats, recent plays.
// Only shown for LIVE team games. Polls /game-detail every 15s while the game sheet is open.
(function () {
  const E = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const isTeam = (g) => g && g.st === 'live' && g.sp !== 'UFC' && g.sp !== 'PFL';
  const isMma = (g) => g && (g.sp === 'UFC' || g.sp === 'PFL'); // every UFC/PFL fight gets the overlay: upcoming = tale of the tape, live/final = fight stats too
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

  // Player photo (crisp ESPN size when possible, blank circle if there is none or it fails to load).
  function ph(u) {
    if (!u || !/^https:\/\//.test(u)) return '<i class="lv-ph"></i>';
    // Ask ESPN for a proportional (uncropped) resize near the on-screen size so the browser never has to shrink it more than ~2x; CSS does the centering.
    let src = u;
    const m = u.match(/^https:\/\/a\.espncdn\.com(\/i\/headshots\/.+?\.png)/);
    if (m) { const w = Math.round(64 * Math.min(3, Math.max(2, window.devicePixelRatio || 2))); src = 'https://a.espncdn.com/combiner/i?img=' + m[1] + '&w=' + w + '&scale=size&cquality=100&location=origin'; }
    return `<img class="lv-ph" src="${E(src)}" data-o="${E(u)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="if(this.dataset.o&&this.src!==this.dataset.o){this.src=this.dataset.o}else{this.style.visibility='hidden'}">`;
  }

  function boxTab(c, d) {
    const gs = d.box[c.tm] || [];
    if (!gs.length) return teamToggle(c, d) + '<p class="mu">Box score isn\u2019t available yet.</p>';
    const gi = Math.min(c.gi || 0, gs.length - 1), g = gs[gi];
    const tabs = gs.length > 1 ? `<div class="lv-tt lv-gt">${gs.map((x, i) => `<button class="chip${i === gi ? ' on' : ''}" data-lvg="${i}">${E(x.n || x.k)}</button>`).join('')}</div>` : '';
    const rows = g.rows.slice().sort((a, b) => (a.dnp ? 1 : 0) - (b.dnp ? 1 : 0)).map((r) => `<tr class="${r.st ? 'st' : ''}"><td class="n"><span class="lv-nc">${ph(r.i)}<span><b>${E(r.n)}</b>${r.pos ? `<small> ${E(r.pos)}</small>` : ''}</span></span></td>${r.dnp || !r.s.length ? `<td colspan="${g.labels.length}" class="mu">DNP</td>` : g.labels.map((_, i) => `<td>${E(r.s[i] != null ? r.s[i] : '')}</td>`).join('')}</tr>`).join('');
    const tot = g.tot && g.tot.length ? `<tr class="tot"><td class="n"><b>Total</b></td>${g.labels.map((_, i) => `<td>${E(g.tot[i] != null ? g.tot[i] : '')}</td>`).join('')}</tr>` : '';
    return `${teamToggle(c, d)}${tabs}<div class="lv-sc"><table class="lv-tb lv-bx"><thead><tr><th class="n"></th>${g.labels.map((l) => `<th>${E(l)}</th>`).join('')}</tr></thead><tbody>${rows}${tot}</tbody></table></div>`;
  }

  function luTab(d) {
    if (!d.lu[0] && !d.lu[1]) return '<p class="mu">Lineups aren\u2019t available for this game.</p>';
    const list = (a, bat) => a.map((p, i) => `<li>${bat ? `<span class="bo">${p.bo || i + 1}</span>` : p.jn ? `<span class="bo">${E(p.jn)}</span>` : ''}${ph(p.i)}<b>${E(p.n)}</b>${p.pos ? `<small>${E(p.pos)}</small>` : ''}</li>`).join('');
    const one = (u, t) => { if (!u) return ''; const bat = d.sp === 'MLB' || d.sp === 'CBASE';
      return `<div class="lv-lu"><div class="lv-h">${E(t.n)}${u.f ? ` <span class="mu">· ${E(u.f)}</span>` : ''}</div><div class="lv-sub">${bat ? 'Batting order' : 'Starters'}</div><ul>${list(u.s, bat)}</ul>${u.p && u.p.length ? `<div class="lv-sub">Pitchers</div><ul>${list(u.p, false)}</ul>` : ''}${u.b && u.b.length ? `<div class="lv-sub">${bat ? 'Bench / subs' : 'Bench'}</div><ul>${list(u.b, false)}</ul>` : ''}</div>`; };
    return one(d.lu[0], d.away) + one(d.lu[1], d.home);
  }

  function tsTab(d) {
    if (!d.ts.length) return '<p class="mu">Team stats aren\u2019t available yet.</p>';
    return `<div class="lv-ts"><div class="lv-tsh"><b>${E(d.away.ab || d.away.n)}</b><span></span><b>${E(d.home.ab || d.home.n)}</b></div>${d.ts.map((r) => `<div><b>${E(r[1])}</b><span>${E(r[0])}</span><b>${E(r[2])}</b></div>`).join('')}</div>`;
  }


  // ---------- UFC / PFL: live fight stats ----------
  const fph = (u) => (u && /^https:\/\//.test(u) ? `<img class="uf-ph" src="${E(u)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<i class="uf-ph"></i>');
  const acc = (x) => (x && x.d ? Math.round((x.n / x.d) * 100) + '%' : '');
  const val = (x) => (x.t ? E(x.t) : x.d != null ? `${x.n}<small>/${x.d}</small>` : String(x.n));
  function mmaRow(r) {
    const an = r.a.n || 0, bn = r.b.n || 0, tot = an + bn, pa = tot ? (an / tot) * 100 : 50, lead = an > bn ? 'a' : bn > an ? 'b' : '';
    const sub = r.a.d || r.b.d ? `<div class="ufr-s"><span>${acc(r.a) ? acc(r.a) + ' acc.' : ''}</span><span>${acc(r.b) ? acc(r.b) + ' acc.' : ''}</span></div>` : '';
    return `<div class="ufr"><div class="ufr-t"><b class="${lead === 'a' ? 'w' : ''}">${val(r.a)}</b><span>${E(r.l)}</span><b class="${lead === 'b' ? 'w' : ''}">${val(r.b)}</b></div><div class="ufr-b${tot ? '' : ' z'}${an === 0 || bn === 0 ? ' solo' : ''}"><i class="a" style="width:${pa}%"></i><i class="b"></i></div>${sub}</div>`;
  }
  function roundDots(g, d) {
    const n = Math.max(g.rd || 3, d.rd || 0), fin = g.st === 'final';
    return `<div class="uf-rd">${Array.from({ length: n }, (_, i) => `<i class="${fin || i + 1 < d.rd ? 'dn' : i + 1 === d.rd ? 'now' : ''}"></i>`).join('')}</div>`;
  }

  // Fighter profiles (record, age, reach, last 5) come from the existing /fighter function. undefined = not asked yet, null = loading, 0 = failed.
  const F = {};
  const eid = (u) => { const m = String(u || '').match(/players\/full\/(\d+)\./); return m ? m[1] : ''; };
  function loadF(g, side, done) {
    const name = side === 'a' ? g.a : g.b, id = eid(side === 'a' ? g.ia : g.ib);
    if (F[name] !== undefined) return;
    F[name] = null;
    fetch('/.netlify/functions/fighter?' + (id ? 'id=' + id : 'name=' + encodeURIComponent(name))).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((d) => { F[name] = d; }).catch(() => { F[name] = 0; }).then(done);
  }
  const impl = (m) => { const n = parseInt(m, 10); return n ? (n < 0 ? -n / (-n + 100) : 100 / (n + 100)) : 0; };
  const inches = (t) => { const m = String(t || '').match(/(\d+)'\s*(\d+)?/); if (m) return +m[1] * 12 + (+m[2] || 0); const n = String(t || '').match(/(\d+(\.\d+)?)/); return n ? +n[1] : 0; };
  const fmtWhen = (d) => { const t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + ' \u00b7 ' + t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); };
  const fmtD = (d) => { const t = new Date(d); return isNaN(t) ? '' : t.toLocaleDateString([], { month: 'short', year: '2-digit' }); };
  const rkTag = (q) => (q === 'C' ? '<em class="uf2-rk c">Champion</em>' : q > 0 ? `<em class="uf2-rk">#${q} ranked</em>` : '');

  function fighterCol(g, side, d) {
    const a = side === 'a', n = a ? g.a : g.b, p = F[n], rec = (a ? g.ra : g.rb) || (p && p.record && p.record.summary) || '', fl = a ? g.fa : g.fb, q = a ? g.qa : g.qb, win = d && d.win === (a ? 0 : 1), lose = d && d.win === (a ? 1 : 0);
    return `<div class="uf2-f ${side}${win ? ' win' : ''}${lose ? ' lose' : ''}"><span class="uf2-pw">${fph(a ? g.ia : g.ib).replace('uf-ph', 'uf-ph uf2-ph')}${fl && /^https:/.test(fl) ? `<i class="uf2-fl" style="background-image:url('${E(fl)}')"></i>` : ''}${win ? '<i class="uf2-w">W</i>' : ''}</span>
      ${rkTag(q)}<b class="uf2-n">${E(n)}</b>${p && p.nickname ? `<small class="uf2-nk">\u201c${E(p.nickname)}\u201d</small>` : ''}<span class="uf2-rec">${E(rec || '\u2013')}</span></div>`;
  }
  function oddsBar(g) {
    const o = g.od; if (g.st !== 'up' || !o || !o.a || !o.b) return '';
    const x = impl(o.a), y = impl(o.b), t = x + y; if (!t) return '';
    const pa = Math.round((x / t) * 100), pb = 100 - pa;
    return `<div class="uf2-od"><div class="uf2-od-h"><b>${pa}%</b><span>Win probability</span><b>${pb}%</b></div><div class="uf2-od-b"><i class="a" style="width:${pa}%"></i><i class="b"></i></div><div class="uf2-od-s"><span>${E(o.a)}</span><span>Moneyline</span><span>${E(o.b)}</span></div></div>`;
  }
  function hero(g, d) {
    d = d || {};
    const fin = g.st === 'final', lv = g.st === 'live';
    const mid = fin ? [d.res, d.rd ? 'R' + d.rd + (d.ck ? ' ' + d.ck : '') : ''].filter(Boolean).join(' \u00b7 ') : lv ? (d.rd ? `Round ${d.rd}${d.ck ? ' \u00b7 ' + d.ck : ''}` : g.clk || 'Live') : fmtWhen(g.date);
    return `<div class="uf2-hero"><div class="uf2-top">${g.ev ? `<span>${E(g.ev)}</span>` : ''}${lv ? '<span class="live"><i></i>LIVE</span>' : ''}</div>
      <div class="uf2-row">${fighterCol(g, 'a', d)}<div class="uf2-mid"><span class="uf2-vs">VS</span>${g.wc ? `<small>${E(g.wc)}</small>` : ''}<small>${g.rd || 3} rounds</small>${lv || fin ? roundDots(g, d) : ''}<span class="uf-st">${E(mid)}</span></div>${fighterCol(g, 'b', d)}</div>
      ${g.vn ? `<div class="uf2-vn">${E(g.vn)}</div>` : ''}</div>`;
  }
  function tapeRow(label, av, bv, edge) {
    if ((av == null || av === '') && (bv == null || bv === '')) return '';
    const ea = edge > 0 ? ' e' : '', eb = edge < 0 ? ' e' : '';
    return `<div class="uf2-tr"><b class="${ea.trim()}">${E(av == null || av === '' ? '\u2013' : av)}</b><span>${E(label)}</span><b class="${eb.trim()}">${E(bv == null || bv === '' ? '\u2013' : bv)}</b></div>`;
  }
  const cmp = (x, y) => (x > y ? 1 : y > x ? -1 : 0);
  function form(p) {
    const f = (p && p.fights) || []; if (!f.length) return '';
    return `<div class="uf2-fm">${f.slice(0, 5).reverse().map((x) => `<i class="${E(x.result)}" title="${E((x.result || '') + ' vs ' + (x.opponent || '') + (x.method ? ' \u00b7 ' + x.method : ''))}">${E(x.result)}</i>`).join('')}</div>`;
  }
  function recent(g) {
    const col = (n) => { const p = F[n]; if (!p || !p.fights || !p.fights.length) return ''; return `<div class="uf2-rc"><div class="lv-h">${E(n)}</div>${p.fights.slice(0, 5).map((x) => `<div class="uf2-fr"><i class="${E(x.result)}">${E(x.result)}</i><div><b>${E(x.opponent)}</b><small>${E([x.method, x.round ? 'R' + x.round : '', fmtD(x.date)].filter(Boolean).join(' \u00b7 '))}</small></div></div>`).join('')}</div>`; };
    const h = col(g.a) + col(g.b); return h ? `<div class="uf2-rcs">${h}</div>` : '';
  }
  function tape(g) {
    const A = F[g.a], B = F[g.b];
    if (A == null || B == null) return '<p class="mu lv-ld">Loading fighter details\u2026</p>';
    if (!A && !B) return '<p class="mu uf-none">Fighter details aren\u2019t available right now.</p>';
    const ra = (A && A.record) || {}, rb = (B && B.record) || {};
    const rows = [
      tapeRow('Record', g.ra || ra.summary, g.rb || rb.summary, 0),
      tapeRow('Streak', A && A.streak, B && B.streak, 0),
      tapeRow('Age', A && A.age, B && B.age, 0),
      tapeRow('Height', A && A.height, B && B.height, cmp(inches(A && A.height), inches(B && B.height))),
      tapeRow('Reach', A && A.reach, B && B.reach, cmp(inches(A && A.reach), inches(B && B.reach))),
      tapeRow('Weight', A && A.weight, B && B.weight, 0),
      tapeRow('Stance', A && A.stance, B && B.stance, 0),
      tapeRow('Wins by KO/TKO', ra.ko, rb.ko, cmp(ra.ko || 0, rb.ko || 0)),
      tapeRow('Wins by submission', ra.sub, rb.sub, cmp(ra.sub || 0, rb.sub || 0)),
      tapeRow('Wins by decision', ra.dec, rb.dec, cmp(ra.dec || 0, rb.dec || 0))
    ].join('');
    return `<div class="lv-h">Tale of the tape</div><div class="uf-stats">${rows}</div>${A || B ? `<div class="uf2-fmw"><div>${form(A)}</div><span>Last 5</span><div>${form(B)}</div></div>` : ''}${recent(g)}`;
  }

  function statsBody(g, c) {
    if (!c || !c.d) return `<p class="mu lv-ld">${c && c.err ? 'Fight stats aren\u2019t available right now.' : 'Loading fight stats\u2026'}</p>`;
    const d = c.d, fin = g.st === 'final';
    const grp = (k) => d.stats.filter((r) => r.g === k);
    const sec = (t, k) => (grp(k).length ? `<div class="lv-h">${t}</div>${grp(k).map(mmaRow).join('')}` : '');
    const body = d.stats.length
      ? `<div class="lv-h">Fight stats</div><div class="uf-stats">${grp('main').map(mmaRow).join('')}</div>${sec('Significant strikes by target', 'tgt')}${sec('Significant strikes by position', 'pos')}`
      : `<p class="mu uf-none">${fin ? 'Detailed stats aren\u2019t available for this fight.' : 'Stats show up here once the first round gets going.'}</p>`;
    return `${body}${fin ? '' : '<p class="mu uf-note">Updates automatically \u00b7 stats can lag the action by a few seconds.</p>'}${c.err ? '<p class="mu lv-ld">Reconnecting\u2026</p>' : ''}`;
  }
  function mmaInner(g) {
    const c = C[g.id] || {}, up = g.st === 'up', tab = up || c.tab === 'tape' ? 'tape' : 'stats';
    const tabs = up ? '' : `<div class="lv-tabs">${[['stats', 'Fight stats'], ['tape', 'Tale of the tape']].map((t) => `<button class="${t[0] === tab ? 'on' : ''}" data-lvt="${t[0]}">${t[1]}</button>`).join('')}</div>`;
    return `${hero(g, c.d)}${oddsBar(g)}${tabs}<div class="lv-body">${tab === 'tape' ? tape(g) : statsBody(g, c)}</div>`;
  }


  // ---------- FIELD VIEW: 2.5D court / rink / field / diamond with who-has-it marker (live team games only) ----------
  const kindOf = (sp) => (/^(NFL|CFB|CFL)$/.test(sp) ? 'fb' : /^(NBA|WNBA|CBB)$/.test(sp) ? 'bb' : sp === 'NHL' ? 'hk' : /^(MLB|CBASE)$/.test(sp) ? 'bs' : '');
  const sportIcon = (sp, z) => {
    const k = kindOf(sp);
    if (k === 'fb') return `<svg width="${z * 1.5}" height="${z}" viewBox="0 0 48 30" aria-hidden="true"><ellipse cx="24" cy="15" rx="22" ry="12" fill="#8a4b1f" stroke="#2e1608" stroke-width="1.4"/><path d="M12 15H36M18 11V19M24 10.5V19.5M30 11V19" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><path d="M7.5 8.5Q10 15 7.5 21.5M40.5 8.5Q38 15 40.5 21.5" fill="none" stroke="#fff" stroke-width="1.3"/></svg>`;
    if (k === 'hk') return `<svg width="${z * 1.2}" height="${z}" viewBox="0 0 40 30" aria-hidden="true"><path d="M3 11V19C3 24 10 28 20 28C30 28 37 24 37 19V11Z" fill="#15181c"/><ellipse cx="20" cy="11" rx="17" ry="8" fill="#2c3239" stroke="#000" stroke-width=".8"/><ellipse cx="14" cy="9" rx="6" ry="2.2" fill="#fff" opacity=".18"/></svg>`;
    if (k === 'bs') return `<svg width="${z}" height="${z}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#f7f3ea" stroke="#9a9488" stroke-width="1.2"/><g fill="none" stroke="#c8242b" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="2.4 2"><path d="M10 6C17 13 17 27 10 34"/><path d="M30 6C23 13 23 27 30 34"/></g></svg>`;
    return `<svg width="${z}" height="${z}" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="17" fill="#ee8a2b" stroke="#5a2a06" stroke-width="1.4"/><path d="M3 20H37M20 3V37M7.5 8.5C14 14 14 26 7.5 31.5M32.5 8.5C26 14 26 26 32.5 31.5" fill="none" stroke="#5a2a06" stroke-width="1.3"/></svg>`;
  };
  // Small "has it" badge for the score cards: exact for football (ESPN possession) and baseball (batting team); other sports show it inside the game sheet.
  window.possMark = (g, side) => {
    if (!g || g.st !== 'live') return '';
    const k = kindOf(g.sp); if (!k) return '';
    let po = g.sit && g.sit.po || ''; if (!po && k === 'bs') po = /^top/i.test(g.clk || '') ? 'a' : /^bot/i.test(g.clk || '') ? 'b' : '';
    return po === side ? ` <span class="fld-pk" title="${k === 'bs' ? 'Batting' : 'Has the ball'}">${sportIcon(g.sp, 15)}</span>` : '';
  };
  const colOf = (t, sp) => { try { if (typeof artPal === 'function') { const p = artPal(t.n, sp); return p.c1; } } catch (e) {} return '#2f7dd1'; };
  const yardInfo = (d) => {
    const s = d.sit || {}, po = d.po || s.po || '', pt = String(s.pt || ''), dd = String(s.dd || '');
    const m = pt.match(/^([A-Z]{2,4})\s+(\d{1,2})$/) || dd.match(/\bat\s+([A-Z]{2,4})\s+(\d{1,2})/);
    let yx = null;
    if (m) { const ab = m[1], y = +m[2]; yx = ab === d.away.ab ? y : ab === d.home.ab ? 100 - y : (po === 'b' ? 100 - y : y); }
    else if (/\b(at|^)\s*50\b/.test(dd + ' ' + pt)) yx = 50;
    if (yx == null) return { po, yx: null };
    const dm = dd.match(/&\s*(\d+)/), goal = /goal/i.test(dd);
    const dist = dm ? +dm[1] : goal ? (po === 'a' ? 100 - yx : yx) : null;
    const fd = dist == null ? null : Math.max(0, Math.min(100, po === 'a' ? yx + dist : yx - dist));
    return { po, yx, fd };
  };
  const mk = (x, y, inner, c, cls) => `<i class="fld-gr${cls ? ' ' + cls : ''}" style="left:${x}%;top:${y}%;--c:${c}"></i><div class="fld-mk${cls ? ' ' + cls : ''}" style="left:${x}%;top:${y}%;--c:${c}">${inner}</div>`;
  const ballMk = (d, x, y, c) => mk(x, y, `<span class="fld-ball">${sportIcon(d.sp, 30)}</span>`, c, 'ball');

  function surface(d) {
    const k = kindOf(d.sp), ca = colOf(d.away, d.sp), cb = colOf(d.home, d.sp), po = d.po || (d.sit && d.sit.po) || '', pc = po === 'a' ? ca : cb;
    const ab = (t) => E((t.ab || t.n || '').slice(0, 4).toUpperCase());
    if (k === 'bb') {
      const W = 94, H = 50, line = 'stroke="#fff" stroke-opacity=".85" stroke-width=".5" fill="none"';
      const hl = po ? `<rect x="${po === 'a' ? 47 : 0}" y="0" width="47" height="50" fill="${pc}" fill-opacity=".16"/>` : '';
      const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><linearGradient id="fw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9a35c"/><stop offset=".5" stop-color="#e6b872"/><stop offset="1" stop-color="#d9a35c"/></linearGradient></defs>
        <rect width="${W}" height="${H}" fill="url(#fw)"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${i * 4}" width=".35" height="${H}" fill="#000" opacity=".05"/>`).join('')}
        <rect x="0" y="17" width="19" height="16" fill="${ca}" fill-opacity=".6"/><rect x="75" y="17" width="19" height="16" fill="${cb}" fill-opacity=".6"/>${hl}
        <rect x=".4" y=".4" width="93.2" height="49.2" ${line}/><path d="M47 0V50" ${line}/><circle cx="47" cy="25" r="6" ${line}/>
        <rect x="0" y="17" width="19" height="16" ${line}/><rect x="75" y="17" width="19" height="16" ${line}/><circle cx="19" cy="25" r="6" ${line}/><circle cx="75" cy="25" r="6" ${line}/>
        <path d="M0 3H14.2A23.75 23.75 0 0 1 14.2 47H0" ${line}/><path d="M94 3H79.8A23.75 23.75 0 0 0 79.8 47H94" ${line}/>
        <circle cx="5.25" cy="25" r=".9" fill="none" stroke="#e8591a" stroke-width=".5"/><circle cx="88.75" cy="25" r=".9" fill="none" stroke="#e8591a" stroke-width=".5"/>
        <text x="9.5" y="26.6" font-size="4.4" font-weight="900" fill="#fff" fill-opacity=".9" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">${ab(d.away)}</text><text x="84.5" y="26.6" font-size="4.4" font-weight="900" fill="#fff" fill-opacity=".9" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">${ab(d.home)}</text>
        ${po ? `<path d="M${po === 'a' ? 58 : 36} 25H${po === 'a' ? 78 : 16}" stroke="${pc}" stroke-width="1.2" stroke-dasharray="2.4 2.2" stroke-linecap="round"/>` : ''}</svg>`;
      return { svg, ar: '94/50', tilt: 52, edge: '#8a5a24', mk: ballMk(d, po ? (po === 'a' ? 66 : 34) : 50, 50, po ? pc : '#ee8a2b') };
    }
    if (k === 'hk') {
      const W = 200, H = 85, line = (c, w) => `stroke="${c}" stroke-width="${w}" fill="none"`;
      const hl = po ? `<rect x="${po === 'a' ? 125 : 0}" y="0" width="75" height="85" fill="${pc}" fill-opacity=".14"/>` : '';
      const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><defs><clipPath id="rk"><rect width="${W}" height="${H}" rx="26"/></clipPath><linearGradient id="ig" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fbff"/><stop offset="1" stop-color="#d6ecf7"/></linearGradient></defs>
        <g clip-path="url(#rk)"><rect width="${W}" height="${H}" fill="url(#ig)"/><rect width="11" height="${H}" fill="${ca}" fill-opacity=".22"/><rect x="189" width="11" height="${H}" fill="${cb}" fill-opacity=".22"/>${hl}
        <path d="M100 0V85" ${line('#d33a3a', 2.4)} stroke-dasharray="5 2"/><path d="M75 0V85M125 0V85" ${line('#2d6fd6', 2.4)}/><path d="M11 0V85M189 0V85" ${line('#d33a3a', .8)}/>
        <circle cx="100" cy="42.5" r="15" ${line('#2d6fd6', .9)}/><circle cx="100" cy="42.5" r="1.6" fill="#2d6fd6"/>
        ${[[31, 22], [31, 63], [169, 22], [169, 63]].map((c) => `<circle cx="${c[0]}" cy="${c[1]}" r="15" ${line('#d33a3a', .8)}/><circle cx="${c[0]}" cy="${c[1]}" r="1.6" fill="#d33a3a"/>`).join('')}
        <path d="M11 35.5A8 8 0 0 1 11 49.5Z" fill="#7fb6ec" stroke="#d33a3a" stroke-width=".6"/><path d="M189 35.5A8 8 0 0 0 189 49.5Z" fill="#7fb6ec" stroke="#d33a3a" stroke-width=".6"/>
        <rect x="6" y="38" width="5" height="9" fill="none" stroke="#999" stroke-width=".8"/><rect x="189" y="38" width="5" height="9" fill="none" stroke="#999" stroke-width=".8"/>
        <text x="50" y="45" font-size="9" font-weight="900" fill="${ca}" fill-opacity=".55" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">${ab(d.away)}</text><text x="150" y="45" font-size="9" font-weight="900" fill="${cb}" fill-opacity=".55" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">${ab(d.home)}</text>
        ${po ? `<path d="M${po === 'a' ? 98 : 102} 42.5H${po === 'a' ? 140 : 60}" stroke="${pc}" stroke-width="2" stroke-dasharray="5 4" stroke-linecap="round"/>` : ''}</g>
        <rect x=".6" y=".6" width="198.8" height="83.8" rx="26" ${line('#9fb7c4', 1.2)}/></svg>`;
      return { svg, ar: '200/85', rad: '13%/30.6%', tilt: 54, edge: '#7a98a8', mk: ballMk(d, po ? (po === 'a' ? 70 : 30) : 50, 50, po ? pc : '#2c3239') };
    }
    if (k === 'fb') {
      const y = yardInfo(d), X = (v) => 10 + v;
      const stripes = Array.from({ length: 10 }, (_, i) => (i % 2 ? `<rect x="${10 + i * 10}" width="10" height="53.3" fill="#fff" opacity=".05"/>` : '')).join('');
      const lines = Array.from({ length: 21 }, (_, i) => `<path d="M${10 + i * 5} 0V53.3" stroke="#fff" stroke-opacity="${i % 2 ? .22 : .6}" stroke-width=".35"/>`).join('');
      const nums = [10, 20, 30, 40, 50, 60, 70, 80, 90].map((v) => `<text x="${10 + v}" y="10" font-size="3.4" fill="#fff" fill-opacity=".55" text-anchor="middle" font-weight="800" font-family="Arial,sans-serif" transform="rotate(180 ${10 + v} 8.8)">${Math.min(v, 100 - v)}</text><text x="${10 + v}" y="46.6" font-size="3.4" fill="#fff" fill-opacity=".55" text-anchor="middle" font-weight="800" font-family="Arial,sans-serif">${Math.min(v, 100 - v)}</text>`).join('');
      const hash = Array.from({ length: 99 }, (_, i) => `<path d="M${11 + i} 22.4v1.1M${11 + i} 29.8v1.1" stroke="#fff" stroke-opacity=".4" stroke-width=".25"/>`).join('');
      let live = '';
      if (y.yx != null && y.po) {
        const x0 = y.po === 'a' ? X(y.yx) : 10, x1 = y.po === 'a' ? 110 : X(y.yx);
        live = `<rect x="${x0}" y="0" width="${x1 - x0}" height="53.3" fill="${pc}" fill-opacity=".16"/>`
          + (y.fd != null ? `<path d="M${X(y.fd)} 0V53.3" stroke="#ffd83a" stroke-width=".9"/>` : '') + `<path d="M${X(y.yx)} 0V53.3" stroke="#3b8cff" stroke-width=".9"/>`
          + `<path d="M${X(y.yx) + (y.po === 'a' ? 3 : -3)} 26.65H${X(y.yx) + (y.po === 'a' ? 15 : -15)}" stroke="${pc}" stroke-width="1.4" stroke-linecap="round"/><path d="M${X(y.yx) + (y.po === 'a' ? 12 : -12)} 23.4L${X(y.yx) + (y.po === 'a' ? 16 : -16)} 26.65L${X(y.yx) + (y.po === 'a' ? 12 : -12)} 29.9" fill="none" stroke="${pc}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>`;
      }
      const svg = `<svg viewBox="0 0 120 53.3" preserveAspectRatio="none"><rect width="120" height="53.3" fill="#2f7d3c"/>${stripes}<rect width="10" height="53.3" fill="${ca}" fill-opacity=".9"/><rect x="110" width="10" height="53.3" fill="${cb}" fill-opacity=".9"/>${lines}${hash}${nums}
        <text transform="translate(6.6 26.65) rotate(-90)" font-size="5" font-weight="900" fill="#fff" fill-opacity=".92" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">${ab(d.away)}</text><text transform="translate(113.4 26.65) rotate(90)" font-size="5" font-weight="900" fill="#fff" fill-opacity=".92" text-anchor="middle" font-family="Arial Black,Arial,sans-serif">${ab(d.home)}</text>
        ${live}<rect x=".3" y=".3" width="119.4" height="52.7" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".6"/></svg>`;
      const bx = y.yx != null ? ((10 + y.yx) / 120) * 100 : 50;
      return { svg, ar: '120/53.3', tilt: 52, edge: '#144a22', mk: ballMk(d, bx, 50, y.po ? pc : '#8a4b1f') };
    }
    if (k === 'bs') {
      const s = d.sit || {}, bat = po, fld = po === 'a' ? 'b' : po === 'b' ? 'a' : '', cbat = bat === 'a' ? ca : bat === 'b' ? cb : '#f4efe4', cfld = fld === 'a' ? ca : fld === 'b' ? cb : '#888';
      const base = (x, y, on) => `<g transform="rotate(45 ${x} ${y})"><rect x="${x - 4.5}" y="${y - 4.5}" width="9" height="9" fill="${on ? cbat : '#fff'}" stroke="${on ? '#fff' : '#222'}" stroke-opacity="${on ? 1 : .5}" stroke-width="${on ? 1.2 : .6}"/></g>${on ? `<circle cx="${x}" cy="${y}" r="11" fill="${cbat}" fill-opacity=".35"/>` : ''}`;
      const svg = `<svg viewBox="0 0 200 170" preserveAspectRatio="none"><defs><clipPath id="bf"><path d="M100 152L-4 48Q100 -52 204 48Z"/></clipPath></defs><rect width="200" height="170" fill="#1d4a2b"/>
        <path d="M100 152L-4 48Q100 -52 204 48Z" fill="#2f7d3c"/><g clip-path="url(#bf)">${Array.from({ length: 6 }, (_, i) => `<path d="M-4 ${150 - i * 34}Q100 ${60 - i * 34} 204 ${150 - i * 34}" fill="none" stroke="#fff" stroke-opacity=".045" stroke-width="12"/>`).join('')}<circle cx="100" cy="112" r="52" fill="#b98a55"/><path d="M100 80L132 110L100 140L68 110Z" fill="#2f7d3c"/></g>
        <path d="M100 152L-4 48M100 152L204 48" stroke="#fff" stroke-opacity=".8" stroke-width="1"/><path d="M-4 48Q100 -52 204 48" fill="none" stroke="#12331a" stroke-width="3" stroke-opacity=".7"/>
        <path d="M100 152L142 110L100 68L58 110Z" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.1"/><circle cx="100" cy="110" r="6" fill="#c89a63" stroke="#fff" stroke-opacity=".4" stroke-width=".6"/>
        ${base(142, 110, s.r1)}${base(100, 68, s.r2)}${base(58, 110, s.r3)}<path d="M94.5 150H105.500V154L100 158L94.500 154Z" fill="#fff" stroke="#222" stroke-opacity=".5" stroke-width=".6"/></svg>`;
      const nm2 = (n) => E(String(n || '').split(' ').slice(-1)[0] || '');
      let m = '';
      if (s.r1) m += mk(71, 64.7, '<i class="fld-pin"></i>', cbat, 'run');
      if (s.r2) m += mk(50, 40, '<i class="fld-pin"></i>', cbat, 'run');
      if (s.r3) m += mk(29, 64.7, '<i class="fld-pin"></i>', cbat, 'run');
      m += mk(50, 66, `<i class="fld-pin"></i>${s.pt ? `<span class="fld-nm">${nm2(s.pt)}</span>` : ''}`, cfld, 'run');
      m += mk(50, 90, `<span class="fld-ball">${sportIcon(d.sp, 26)}</span>${s.bt ? `<span class="fld-nm">${nm2(s.bt)}</span>` : ''}`, cbat, 'ball');
      return { svg, ar: '200/170', tilt: 42, edge: '#1c4a26', mk: m };
    }
    return null;
  }

  function fieldTab(d) {
    const sf = surface(d); if (!sf) return '<p class="mu">Field view isn\u2019t available for this sport.</p>';
    const po = d.po || (d.sit && d.sit.po) || '', k = kindOf(d.sp), t = (x, side) => `<div class="fld-t ${side}${po === side ? ' has' : ''}">${po === side ? `<span class="fld-pk">${sportIcon(d.sp, 18)}</span>` : ''}<b>${E(x.ab || x.n)}</b><em>${E(x.sc)}</em></div>`;
    const s = d.sit || {}, ap = sf.ar.split('/'), gap = (0.86 * 0.5 * (ap[1] / ap[0]) * (1 - Math.cos((sf.tilt * Math.PI) / 180)) * 100).toFixed(1);
    let cap = '';
    if (k === 'fb') cap = [s.dd ? `<b>${E(s.dd)}</b>` : '', po ? `${E(po === 'a' ? d.away.ab : d.home.ab)} ball` : '', s.rz ? '<b class="lv-rz">Red zone</b>' : ''].filter(Boolean).join(' \u00b7 ');
    else if (k === 'bs') cap = [s.ba != null ? `${s.ba}-${s.sk} count` : '', s.o != null ? `${s.o} out${s.o === 1 ? '' : 's'}` : '', s.bt ? `At bat: <b>${E(s.bt)}</b>` : '', s.pt ? `Pitching: <b>${E(s.pt)}</b>` : ''].filter(Boolean).join(' \u00b7 ');
    else cap = po ? `${E(po === 'a' ? d.away.ab : d.home.ab)} ${k === 'hk' ? 'puck' : 'ball'}${d.pe ? ' <span class="mu">(estimated from the last play)</span>' : ''}` : '<span class="mu">Possession shows up after the next play.</span>';
    const lp = d.plays && d.plays[0] ? `<p class="fld-lp">${E(d.plays[0].t)}</p>` : (s.lp ? `<p class="fld-lp">${E(s.lp)}</p>` : '');
    return `<div class="fld"><div class="fld-hd">${t(d.away, 'a')}<div class="fld-clk">${E(d.clk || '')}</div>${t(d.home, 'b')}</div>
      <div class="fld-stage k-${k}" style="margin-top:-${gap}%;margin-bottom:-${gap}%"><div class="fld-plane" style="--tilt:${sf.tilt}deg;--edge:${sf.edge};aspect-ratio:${sf.ar}${sf.rad ? ';border-radius:' + sf.rad : ''}">${sf.svg}${sf.mk}</div></div>
      <div class="fld-cap">${cap}</div>${lp}</div>`;
  }

  function inner(g) {
    if (isMma(g)) return mmaInner(g);
    const c = C[g.id];
    if (!c || !c.d) return `<p class="mu lv-ld">${c && c.err ? 'Live details aren\u2019t available right now.' : 'Loading live details\u2026'}</p>`;
    const d = c.d, tabs = [['field', 'Field'], ['live', 'Live'], ['box', 'Box score'], ['lu', 'Lineups'], ['ts', 'Team stats']].filter((t) => t[0] !== 'field' || kindOf(d.sp)).filter((t) => t[0] !== 'lu' || d.lu[0] || d.lu[1]).filter((t) => t[0] !== 'ts' || d.ts.length);
    const tab = tabs.some((t) => t[0] === c.tab) ? c.tab : tabs[0][0];
    const body = tab === 'field' ? fieldTab(d) : tab === 'live' ? lineScore(d) + situation(d) + plays(d) : tab === 'box' ? boxTab(c, d) : tab === 'lu' ? luTab(d) : tsTab(d);
    return `<div class="lv-tabs">${tabs.map((t) => `<button class="${t[0] === tab ? 'on' : ''}" data-lvt="${t[0]}">${t[1]}</button>`).join('')}</div><div class="lv-body">${body}</div>${c.err ? '<p class="mu lv-ld">Reconnecting\u2026</p>' : ''}`;
  }

  // Placeholder container for the game sheet template (re-rendered from cache whenever the sheet redraws).
  window.lvHtml = (g) => (isTeam(g) || isMma(g) ? `<div id="lvd" class="lvd${isMma(g) ? ' uf' : ''}">${inner(g)}</div>` : '');

  window.startLive = (g, m) => {
    if (!isTeam(g) && !isMma(g)) return;
    const c = (C[g.id] = C[g.id] || { tab: isMma(g) ? 'stats' : 'field', tm: 0, gi: 0 });
    const paint = () => { const b = m.querySelector('#lvd'); if (b) b.innerHTML = inner(g); };
    m.addEventListener('click', (e) => {
      const t = e.target.closest('[data-lvt]'), x = e.target.closest('[data-lvm]'), y = e.target.closest('[data-lvg]');
      if (t) { c.tab = t.dataset.lvt; paint(); } else if (x) { c.tm = +x.dataset.lvm; c.gi = 0; paint(); } else if (y) { c.gi = +y.dataset.lvg; paint(); }
    });
    const pull = async () => {
      if (!m.isConnected) return;
      if (!document.hidden) { try { c.d = await (isMma(g) ? fetch('/.netlify/functions/game-detail?id=' + encodeURIComponent(g.id) + '&evi=' + encodeURIComponent(g.evi || '') + '&_=' + Date.now(), { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }) : FX_API.gameDetail(g.id)); c.err = 0; } catch (e) { c.err = 1; } paint(); }
      if (m.isConnected && g.st !== 'final') setTimeout(pull, 15000);
    };
    if (isMma(g)) { const redo = () => { if (m.isConnected) paint(); }; loadF(g, 'a', redo); loadF(g, 'b', redo); if (g.st === 'up') return; } // upcoming fights: tale of the tape only, nothing to poll
    pull();
  };
})();
