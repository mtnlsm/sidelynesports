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
    return '';  // player photos removed (only fighter photos are kept, in the UFC views)
    if (!u || !/^https:\/\//.test(u)) return '<i class="lv-ph"></i>';
    let src = u;
    try { if (typeof imgUrl === 'function') src = imgUrl(u, 40, true); } catch (e) {}
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
    return `<div class="uf2-od"><div class="uf2-od-h"><b>${pa}%</b><span>Win probability</span><b>${pb}%</b></div><div class="uf2-od-b"><i class="a" style="width:${pa}%"></i><i class="b"></i></div><div class="uf2-od-s"><span>${E(o.a)}</span><span>${o.p ? 'Odds \u00b7 ' + E(o.p) : 'Moneyline'}</span><span>${E(o.b)}</span></div></div>`;
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

  // ---------- Damage skeletons: strikes TAKEN by each fighter (the opponent's landed head/body/leg strikes). Yellow = taking damage, red = badly hurt. ----------
  const TH = { head: [3, 8], body: [5, 12], leg: [5, 12] }; // [yellow, red] landed strikes
  const lvl = (z, n, hurt) => (hurt && z === 'head' ? 'bad' : n >= TH[z][1] ? 'bad' : n >= TH[z][0] ? 'warn' : n > 0 ? 'lite' : '');
  // Anatomical front-view skeleton. Each zone (head / torso / legs) is tinted by how much damage that area has taken.
  const bn = (d, w) => `<path class="bo" d="${d}" stroke-width="${w + 2.6}"/><path class="bi" d="${d}" stroke-width="${w}"/>`;
  let skN = 0;
  const gd = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".3" stop-color="var(--f)" stop-opacity=".62"/><stop offset=".7" stop-color="var(--f)" stop-opacity=".3"/><stop offset="1" stop-color="var(--s)" stop-opacity=".55"/></linearGradient></defs>`;
  function skel(t, hurt) {
    const k = 'skg' + (skN++);
    const h = lvl('head', t.head, hurt), b = lvl('body', t.body, 0), l = lvl('leg', t.leg, 0);
    const ribs = [0, 1, 2, 3, 4, 5, 6].map((i) => { const y = 160 + i * 13.5, w = 40 - Math.abs(i - 2) * 4 - (i > 4 ? (i - 4) * 5 : 0), x = 94 - w; return bn(`M95 ${y} C ${x + 8} ${y - 12}, ${x - 6} ${y - 2}, ${x} ${y + 24 - i * 1.2}`, 4.4 - i * 0.2) + bn(`M105 ${y} C ${200 - x - 8} ${y - 12}, ${200 - x + 6} ${y - 2}, ${200 - x} ${y + 24 - i * 1.2}`, 4.4 - i * 0.2); }).join('');
    const vert = (n, y0, step, w) => Array.from({ length: n }, (_, i) => `<rect class="fl" x="${100 - (w + i * 0.6) / 2}" y="${y0 + i * step}" width="${w + i * 0.6}" height="${step - 2.6}" rx="2.6"/>`).join('');
    return `<svg class="sk-fig" viewBox="0 0 200 560" aria-hidden="true">
      <g class="sk-sil"><ellipse cx="100" cy="62" rx="40" ry="52"/><path d="M60 140Q100 124 140 140L150 160 140 250 134 300 150 350 132 450 128 548H72L68 450 50 350 66 300 60 250 50 160Z"/><path d="M50 148L34 240 26 330M150 148L166 240 174 330" class="lim" stroke-width="24"/></g>
      <g class="sk-z ${h}" style="--gr:url(#${k}h)">${gd(k + 'h')}<ellipse class="gl" cx="100" cy="58" rx="46" ry="56"/>
        <path class="fl" d="M100 12C72 12 60 32 62 56c1 14 7 22 14 28v14c0 5 5 8 10 8h28c5 0 10-3 10-8V84c7-6 13-14 14-28C140 32 128 12 100 12Z"/>
        <path class="fl" d="M76 92q2 26 24 28 22-2 24-28l-6 3q-2 14-18 17-16-3-18-17z"/>
        <ellipse class="ey" cx="86" cy="58" rx="10" ry="11"/><ellipse class="ey" cx="114" cy="58" rx="10" ry="11"/><path class="ey" d="M100 70l-7 15h14z"/>
        <path class="ln" d="M87 100h26M92 96v8M100 96v8M108 96v8"/><path class="ln" d="M70 40q4-18 30-22"/></g>
      <g class="sk-z ${b}" style="--gr:url(#${k}b)">${gd(k + 'b')}<ellipse class="gl" cx="100" cy="230" rx="58" ry="104"/>
        ${vert(4, 124, 8, 11)}${bn('M98 150Q74 140 48 148', 5.4)}${bn('M102 150Q126 140 152 148', 5.4)}
        ${vert(5, 252, 9.6, 14)}${ribs}
        <path class="fl" d="M100 150l-7 8 2 52 5 10 5-10 2-52z"/><path class="ln" d="M95 176h10M95 196h10"/>
        <path class="fl" d="M96 296C80 276 52 278 46 296c-2 18 8 36 28 46l16-6c2-14 4-24 6-34z"/><path class="fl" d="M104 296c16-20 44-18 50 0 2 18-8 36-28 46l-16-6c-2-14-4-24-6-34z"/>
        <path class="fl" d="M88 298h24l-6 36h-12z"/><ellipse class="ey" cx="76" cy="326" rx="6" ry="9"/><ellipse class="ey" cx="124" cy="326" rx="6" ry="9"/></g>
      <g class="sk-z n" style="--gr:url(#${k}n)">${gd(k + 'n')}${bn('M50 150L36 238', 7)}${bn('M150 150L164 238', 7)}${bn('M36 246L28 328', 5)}${bn('M44 246L36 330', 4)}${bn('M164 246L172 328', 5)}${bn('M156 246L164 330', 4)}
        <circle class="fl" cx="46" cy="150" r="7"/><circle class="fl" cx="154" cy="150" r="7"/><circle class="fl" cx="36" cy="242" r="6"/><circle class="fl" cx="164" cy="242" r="6"/>
        <path class="ln" d="M24 336l-4 20M30 338l-1 24M36 338l2 22M41 335l5 18M168 336l4 20M174 338l1 24M180 338l-2 22M185 335l-5 18" stroke-width="3"/></g>
      <g class="sk-z ${l}" style="--gr:url(#${k}l)">${gd(k + 'l')}<ellipse class="gl" cx="100" cy="450" rx="62" ry="112"/>
        ${bn('M70 346L84 446', 8.6)}${bn('M130 346L116 446', 8.6)}<circle class="fl" cx="68" cy="344" r="9"/><circle class="fl" cx="132" cy="344" r="9"/>
        <ellipse class="fl" cx="86" cy="454" rx="9" ry="10"/><ellipse class="fl" cx="114" cy="454" rx="9" ry="10"/>
        ${bn('M86 466L90 540', 6.4)}${bn('M114 466L110 540', 6.4)}${bn('M97 468L96 538', 3)}${bn('M103 468L104 538', 3)}
        <path class="fl" d="M80 542q10-6 20 0l4 12H72zM100 542q10-6 20 0l8 12h-32z"/></g></svg>`;
  }
  function damage(g, d) {
    const row = (k) => d.stats.find((r) => r.k === k) || { a: { n: 0 }, b: { n: 0 } };
    const kd = row('kd'), hd = row('head'), bd = row('body'), lg = row('leg');
    const fin = g.st === 'final', koA = fin && d.win === 1 && /ko|tko|sub/i.test(d.res || ''), koB = fin && d.win === 0 && /ko|tko|sub/i.test(d.res || '');
    // fighter A takes what B lands (and the other way round)
    const tA = { head: hd.b.n || 0, body: bd.b.n || 0, leg: lg.b.n || 0 }, tB = { head: hd.a.n || 0, body: bd.a.n || 0, leg: lg.a.n || 0 };
    const col = (name, t, hurt, side) => `<div class="sk-c ${side}">${skel(t, hurt)}<b>${E(name)}</b><div class="sk-n"><span class="${lvl('head', t.head, hurt)}">Head <i>${t.head}</i></span><span class="${lvl('body', t.body, 0)}">Body <i>${t.body}</i></span><span class="${lvl('leg', t.leg, 0)}">Legs <i>${t.leg}</i></span></div></div>`;
    return `<div class="lv-h">Damage taken</div><div class="sk-w">${col(g.a, tA, (kd.b.n || 0) > 0 || koA, 'a')}${col(g.b, tB, (kd.a.n || 0) > 0 || koB, 'b')}</div><div class="sk-lg"><span><i class="warn"></i>Taking damage</span><span><i class="bad"></i>Badly hurt</span></div>`;
  }
  function statsBody(g, c) {
    if (!c || !c.d) return `<p class="mu lv-ld">${c && c.err ? 'Fight stats aren\u2019t available right now.' : 'Loading fight stats\u2026'}</p>`;
    const d = c.d, fin = g.st === 'final';
    const grp = (k) => d.stats.filter((r) => r.g === k);
    const sec = (t, k) => (grp(k).length ? `<div class="lv-h">${t}</div>${grp(k).map(mmaRow).join('')}` : '');
    const body = d.stats.length
      ? `${damage(g, d)}<div class="lv-h">Fight stats</div><div class="uf-stats">${grp('main').map(mmaRow).join('')}</div>${sec('Significant strikes by target', 'tgt')}${sec('Significant strikes by position', 'pos')}`
      : `<p class="mu uf-none">${fin ? 'Detailed stats aren\u2019t available for this fight.' : 'Stats show up here once the first round gets going.'}</p>`;
    return `${body}${fin ? '' : '<p class="mu uf-note">Updates automatically \u00b7 stats can lag the action by a few seconds.</p>'}${c.err ? '<p class="mu lv-ld">Reconnecting\u2026</p>' : ''}`;
  }
  function mmaInner(g) {
    const c = C[g.id] || {}, up = g.st === 'up', tab = up || c.tab === 'tape' ? 'tape' : 'stats';
    const tabs = up ? '' : `<div class="lv-tabs">${[['stats', 'Fight stats'], ['tape', 'Tale of the tape']].map((t) => `<button class="${t[0] === tab ? 'on' : ''}" data-lvt="${t[0]}">${t[1]}</button>`).join('')}</div>`;
    return `${hero(g, c.d)}${oddsBar(g)}${tabs}<div class="lv-body">${tab === 'tape' ? tape(g) : statsBody(g, c)}</div>`;
  }

  function inner(g) {
    if (isMma(g)) return mmaInner(g);
    const c = C[g.id];
    if (!c || !c.d) return `<p class="mu lv-ld">${c && c.err ? 'Live details aren\u2019t available right now.' : 'Loading live details\u2026'}</p>`;
    const d = c.d, tabs = [['live', 'Live'], ['box', 'Box score'], ['lu', 'Lineups'], ['ts', 'Team stats']].filter((t) => t[0] !== 'lu' || d.lu[0] || d.lu[1]).filter((t) => t[0] !== 'ts' || d.ts.length);
    const tab = tabs.some((t) => t[0] === c.tab) ? c.tab : 'live';
    const body = tab === 'live' ? lineScore(d) + situation(d) + plays(d) : tab === 'box' ? boxTab(c, d) : tab === 'lu' ? luTab(d) : tsTab(d);
    return `<div class="lv-tabs">${tabs.map((t) => `<button class="${t[0] === tab ? 'on' : ''}" data-lvt="${t[0]}">${t[1]}</button>`).join('')}</div><div class="lv-body">${body}</div>${c.err ? '<p class="mu lv-ld">Reconnecting\u2026</p>' : ''}`;
  }

  // Placeholder container for the game sheet template (re-rendered from cache whenever the sheet redraws).
  window.lvHtml = (g) => (isTeam(g) || isMma(g) ? `<div id="lvd" class="lvd${isMma(g) ? ' uf' : ''}">${inner(g)}</div>` : '');

  window.startLive = (g, m) => {
    if (!isTeam(g) && !isMma(g)) return;
    const c = (C[g.id] = C[g.id] || { tab: isMma(g) ? 'stats' : 'live', tm: 0, gi: 0 });
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
