/* ===== LEAGUES (needs supabase/leagues.sql) =====
   Has its own tab in the main navigation (bottom bar on mobile, side bar on desktop). You vs everyone in the league: make free picks on upcoming games, 1 point per
   correct pick, #1 when the league ends wins the bonus SP. Everything goes through database functions (league_*), nothing is
   written to the tables directly. Loaded after app.js, so it can reuse its helpers (esc, modal, avHtml, crest, G, ME ...). */
(() => {
  const BONUS = 20000; // only used for text before the server answers; the real amount comes from league_cfg() in leagues.sql
  const LG = { id: null, tab: 'picks', mine: null, pub: null, det: null, pk: new Set() };
  const SPORTS = ['ALL', 'NFL', 'NBA', 'MLB', 'NHL', 'CFB', 'UFC', 'PFL'];
  const DAYS = [[1, '1 day'], [3, '3 days'], [7, '1 week'], [14, '2 weeks'], [30, '30 days'], [60, '60 days'], [90, '90 days']];
  const skel = '<div class="sk"></div><div class="sk"></div><div class="sk"></div>';

  const st = document.createElement('style');
  st.textContent = `
.lgx-pk{display:flex;align-items:stretch;gap:8px;margin-top:10px}
.lgx-side{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:10px 6px;min-height:88px;border-radius:14px;background:var(--sf2);color:var(--tx);font-weight:600;font-size:14px;text-align:center;border:2px solid transparent;cursor:pointer}
.lgx-side span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lgx-side.on{border-color:var(--ab);background:color-mix(in srgb,var(--ab) 12%,var(--sf2))}
.lgx-vs{align-self:center;color:var(--mu);font-size:12px;font-weight:700}
.lgx-code{display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap}
.lgx-code>div{flex:1;min-width:110px}.lgx-code b{display:block;font-size:22px;letter-spacing:3px}
select.lgx-sel{width:100%;font:inherit;font-size:16px;color:inherit;background:var(--sf2);border:1.5px solid transparent;border-radius:12px;padding:12px 14px;margin:4px 0 12px}
.lgx-win{background:color-mix(in srgb,var(--ab) 14%,var(--sf));box-shadow:inset 0 0 0 1.5px var(--ab)}
`;
  document.head.append(st);

  /* ---------- small helpers ---------- */
  const rpc = async (fn, a) => { const r = await FX_DB.rpc(fn, a || {}); if (r.error) throw r.error; return r.data; };
  const box = () => document.getElementById('lb');
  const fail = (e) => toast((e && e.message) || String(e));
  const sportName = (c) => (c === 'ALL' ? 'All sports' : (typeof spl === 'function' ? spl(c) : c));
  const fmt = (n) => Number(n || 0).toLocaleString();
  const left = (iso) => {
    const ms = Date.parse(iso) - Date.now(); if (ms <= 0) return 'Ended';
    const m = Math.floor(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
    return d > 0 ? d + 'd ' + h + 'h left' : h > 0 ? h + 'h ' + (m % 60) + 'm left' : Math.max(1, m) + 'm left';
  };
  const isOpen = (l) => l.status === 'active' && Date.parse(l.ends_at) > Date.now();
  const stateTxt = (l) => (l.status !== 'active' ? 'Finished' : Date.parse(l.ends_at) <= Date.now() ? 'Finishing…' : left(l.ends_at));
  const seen = () => { try { return new Set(JSON.parse(localStorage.getItem('fx-lg-won') || '[]')); } catch (e) { return new Set(); } };
  const mark = (id) => { try { const s = seen(); s.add(id); localStorage.setItem('fx-lg-won', JSON.stringify([...s].slice(-100))); } catch (e) {} };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast('Copy failed. Long-press to copy: ' + t); } };

  let last = '';
  function paint(html) {
    const b = box(); if (!b) return false;
    if (html === last && b.dataset.lgx === '1') return true;
    b.innerHTML = html; b.dataset.lgx = '1'; last = html; return true;
  }
  const paintErr = (e) => paint(`<div class="glass card"><b>Couldn't load leagues</b><p class="mu">${esc((e && e.message) || e)}</p><p class="mu">Did you run supabase/leagues.sql in the Supabase SQL Editor?</p></div>`);

  // Tell the player when a league they were in finished and they won (once per league), and refresh their SP.
  function scan(rows) {
    const s = seen(); let won = false;
    (rows || []).forEach((l) => { if (l.i_won && !s.has(l.id)) { mark(l.id); won = true; toast('You won ' + l.name + '! +' + fmt(l.bonus) + ' SP'); } });
    if (won && typeof syncNovas === 'function') syncNovas('League win');
  }

  /* ---------- home: my leagues, public leagues, create / join ---------- */
  const cardHtml = (l) => `<div class="glass card" data-lgx="open" data-lid="${esc(l.id)}" role="button" tabindex="0" style="cursor:pointer">
<div class="row sp"><b class="ellip" style="min-width:0">${esc(l.name)}</b><span class="chip" style="flex:none">${esc(stateTxt(l))}</span></div>
<div class="mu" style="margin:4px 0 8px">${esc(sportName(l.sport))} · ${l.members} player${l.members === 1 ? '' : 's'}${l.is_public ? ' · Public' : ''}</div>
<div class="row sp"><span>Rank <b>#${l.rank}</b> of ${l.members}</span><span class="mu">${l.wins} W · ${l.losses} L${l.i_won ? ' · <b style="color:var(--ab)">Won +' + fmt(l.bonus) + ' SP</b>' : ''}</span></div></div>`;
  const pubHtml = (l) => `<div class="glass card row sp" data-lgx="open" data-lid="${esc(l.id)}" role="button" tabindex="0" style="cursor:pointer">
<div style="min-width:0"><b class="ellip" style="display:block">${esc(l.name)}</b><div class="mu">${esc(sportName(l.sport))} · ${l.members} player${l.members === 1 ? '' : 's'} · ${esc(left(l.ends_at))}${l.owner_name ? ' · @' + esc(l.owner_name) : ''}</div></div>
<button class="chip on" data-lgx="joinpub" data-lid="${esc(l.id)}" style="flex:none">Join</button></div>`;
  function homeHtml() {
    const mine = LG.mine || [], pub = (LG.pub || []).filter((x) => !x.joined);
    return `<div class="glass card"><b>Leagues</b><p class="mu" style="margin:6px 0 0">Pick winners against your friends (or everyone) for a set time. 1 point per correct pick, no SP at risk. Finish <b>#1</b> when a league ends and you win <b>${fmt(BONUS)} SP</b>.</p></div>
<div class="row" style="gap:8px;margin-bottom:10px"><button class="pri" data-lgx="new" style="flex:1">Create a league</button></div>
<div class="glass card"><div class="row" style="gap:8px"><input id="lgx-code" maxlength="8" placeholder="Have an invite code?" autocapitalize="characters" autocomplete="off" spellcheck="false" style="font-size:16px;text-transform:uppercase"><button class="chip on" data-lgx="joincode" style="flex:none">Join</button></div></div>
<h2 style="margin:16px 0 10px">My leagues</h2>${mine.length ? mine.map(cardHtml).join('') : '<p class="mu">You are not in a league yet. Create one, or enter an invite code above.</p>'}
${pub.length ? '<h2 style="margin:16px 0 10px">Public leagues</h2>' + pub.map(pubHtml).join('') : ''}`;
  }
  async function loadHome() {
    LG.id = null; LG.det = null;
    if (!LG.mine) paint(skel); else paint(homeHtml());
    try {
      const [m, p] = await Promise.all([rpc('league_my'), rpc('league_public').catch(() => [])]);
      LG.mine = m; LG.pub = p; scan(m);
      if (LG.id || S.tab !== 'leagues') return;
      const inp = document.getElementById('lgx-code'), v = inp ? inp.value : '';
      paint(homeHtml());
      const i2 = document.getElementById('lgx-code'); if (i2 && v) i2.value = v;
    } catch (e) { paintErr(e); }
  }

  /* ---------- one league: picks + standings ---------- */
  const elig = (l) => G.filter((g) => g.st === 'up' && (l.sport === 'ALL' || g.sp === l.sport) && (MMA(g.sp) || Date.parse(g.date) > Date.now()))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  const pickMap = () => new Map(((LG.det && LG.det.picks) || []).map((p) => [String(p.game_id), p]));
  const resBadge = (p) => p.result === 'win' ? '<span class="rs w">Point</span>' : p.result === 'loss' ? '<span class="rs l">Missed</span>' : p.result === 'void' ? '<span class="rs">No point</span>' : '<span class="rs">Waiting for result</span>';

  function gameCard(g, mp) {
    const cur = mp.get(String(g.id)), side = (n, k) => `<button class="lgx-side${cur && cur.pick === n ? ' on' : ''}" data-lgx="pick" data-lgid="${esc(g.id)}" data-lside="${k}" aria-pressed="${!!(cur && cur.pick === n)}">${crest(n, g.sp, 36)}<span>${esc(n)}</span></button>`;
    return `<div class="glass card"><div class="row sp"><span class="chip glass">${esc(spl(g.sp))}</span><span class="mu">${esc(when(g))}</span></div><div class="lgx-pk">${side(g.a, 'a')}<span class="lgx-vs">VS</span>${side(g.b, 'b')}</div></div>`;
  }
  function picksHtml(l) {
    const mp = pickMap(), games = elig(l), openIds = new Set(games.map((g) => String(g.id)));
    const mine = (LG.det.picks || []).filter((p) => !openIds.has(String(p.game_id)));
    const made = games.filter((g) => mp.has(String(g.id))).length;
    return `<p class="mu" style="margin:0 0 10px">${games.length ? 'Tap a team to pick. You can change a pick until the game starts. ' + made + ' of ' + games.length + ' picked.' : ''}</p>
${games.length ? games.slice(0, 40).map((g) => gameCard(g, mp)).join('') + (games.length > 40 ? '<p class="mu">Showing the next 40 games.</p>' : '') : `<div class="glass card"><b>No upcoming ${l.sport === 'ALL' ? '' : esc(sportName(l.sport)) + ' '}games right now</b><p class="mu">${GSTAT === 'loading' ? 'Loading games…' : 'Check back soon, new games show up here as they are scheduled.'}</p></div>`}
${mine.length ? '<h2 style="margin:16px 0 10px">Your locked and settled picks</h2>' + mine.slice(0, 40).map((p) => `<div class="glass card row sp"><div style="min-width:0"><b class="ellip" style="display:block">${esc(p.pick)}</b><div class="mu ellip">${esc(p.matchup)}</div></div><span style="flex:none">${resBadge(p)}</span></div>`).join('') : ''}`;
  }
  function standHtml(l, rows) {
    const fin = l.status !== 'active';
    return rows.map((u) => {
      const me = ME && u.id === ME.id, top = fin && u.rank === 1 && l.bonus_paid;
      return `<div class="glass card row sp${top ? ' lgx-win' : ''}" style="${me && !top ? 'box-shadow:inset 0 0 0 1.5px var(--ab)' : ''}"><a class="ulk row" href="/@${esc(u.username)}" data-u="${esc(u.username)}" style="min-width:0;flex:1"><b style="width:26px;text-align:center;flex:none;color:${u.rank <= 3 ? 'var(--ab)' : 'var(--mu)'}">${u.rank}</b>${avHtml(u, 40)}<div style="min-width:0"><b class="ellip" style="display:block">${dname(u)}${flr(u)}</b><div class="mu">@${esc(u.username)}${top ? ' · Won +' + fmt(l.bonus) + ' SP' : ''}</div></div></a><div style="text-align:right;flex:none"><b>${u.points} pt${u.points === 1 ? '' : 's'}</b><div class="mu">${u.wins}W · ${u.losses}L</div></div></div>`;
    }).join('') || '<p class="mu">No players yet.</p>';
  }
  function detailHtml() {
    const d = LG.det; if (!d) return skel;
    const l = d.league, mem = d.is_member, open = isOpen(l), cfg = d.cfg || {};
    const winner = l.status !== 'active' ? d.standings.find((u) => u.rank === 1) : null;
    const code = mem && open ? `<div class="lgx-code"><div><small class="mu">Invite code</small><b>${esc(l.code)}</b></div><button class="chip" data-lgx="copycode">Copy code</button><button class="chip" data-lgx="copylink">Copy invite link</button></div>` : '';
    const join = !mem && open ? `<button class="pri" data-lgx="joinpub" data-lid="${esc(l.id)}" style="margin-top:12px">Join this league</button>` : '';
    const banner = winner ? `<div class="glass card lgx-win"><div class="row sp"><b>${ic('crown', 16, 1)} ${l.bonus_paid ? esc(winner.display_name || winner.username) + ' won the league' : 'Final standings'}</b>${l.bonus_paid ? '<b>+' + fmt(l.bonus) + ' SP</b>' : ''}</div>${l.bonus_paid ? '' : `<p class="mu" style="margin:6px 0 0">No bonus this time: a league needs ${cfg.min_members || 3}+ players and a winner with ${cfg.min_picks || 5}+ graded picks.</p>`}</div>` : '';
    const info = `<div class="glass card"><div class="row sp"><b class="ellip" style="font-size:18px;min-width:0">${esc(l.name)}</b><span class="chip" style="flex:none">${esc(stateTxt(l))}</span></div>
<div class="mu" style="margin-top:4px">${esc(sportName(l.sport))} · ${l.members} player${l.members === 1 ? '' : 's'} · ${l.is_public ? 'Public' : 'Private'}${l.owner_username ? ' · by @' + esc(l.owner_username) : ''}</div>
${open ? `<p class="mu" style="margin:8px 0 0">Finish #1 to win <b>${fmt(cfg.bonus || BONUS)} SP</b>. Needs ${cfg.min_members || 3}+ players and ${cfg.min_picks || 5}+ graded picks.</p>` : ''}${code}${join}</div>`;
    const tabs = mem ? `<div class="row hs sb" style="margin-bottom:10px">${[['picks', 'Picks'], ['stand', 'Standings']].map(([k, v]) => `<button class="sbtn ${LG.tab === k ? 'on' : ''}" data-lgx="tab" data-lt="${k}">${v}</button>`).join('')}</div>` : '<h2 style="margin:16px 0 10px">Standings</h2>';
    const body = mem && LG.tab === 'picks' ? picksHtml(l) : standHtml(l, d.standings);
    const leave = mem && open && (l.owner !== (ME && ME.id) || l.members === 1) ? `<div style="margin-top:16px"><button class="chip" data-lgx="leave">${l.owner === (ME && ME.id) ? 'Delete league' : 'Leave league'}</button></div>` : '';
    return `<div class="row sp" style="margin-bottom:10px"><button class="chip" data-lgx="back">‹ Leagues</button></div>${banner}${info}${tabs}${body}${leave}`;
  }
  async function loadDetail(silent) {
    const id = LG.id;
    try {
      const d = await rpc('league_detail', { p_id: id });
      if (LG.id !== id) return;
      const first = !LG.det; LG.det = d;
      if (first) LG.tab = d.is_member && isOpen(d.league) ? 'picks' : 'stand';
      if (S.tab === 'leagues') paint(detailHtml());
    } catch (e) {
      if (silent) return;
      paint(`<div class="row" style="margin-bottom:10px"><button class="chip" data-lgx="back">‹ Leagues</button></div><div class="glass card"><b>Couldn't open this league</b><p class="mu">${esc((e && e.message) || e)}</p></div>`);
    }
  }
  function openLeague(id) { LG.id = id; LG.det = null; LG.tab = 'picks'; paint(skel); loadDetail(); }
  function open() { if (LG.id) { LG.det ? paint(detailHtml()) : paint(skel); loadDetail(); } else loadHome(); }

  /* ---------- own nav tab: bottom bar on mobile, side bar on desktop ---------- */
  P.nv_leagues = '<path class="f" d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5A3.5 3.5 0 0 1 16.5 11M12 14v4M8.5 20h7"/>';
  R.leagues = () => '<div id="lb">' + skel + '</div>';
  if (!NAV.some((n) => n[0] === 'leagues')) {
    NAV.splice(NAV.findIndex((n) => n[0] === 'board') + 1, 0, ['leagues', 'nv_leagues', 'Leagues']);
    $('#nav').innerHTML = NAV.map((n) => navBtn(n[0], n[1], n[2])).join('');
    const cur = $('#nav [data-t="' + S.tab + '"]'); if (cur) cur.classList.add('on');
    const ns = document.createElement('style'); ns.textContent = '#nav.nav button{max-width:none}'; document.head.append(ns); // room for one more tab
  }
  const origGo = window.go;
  window.go = function (t) { const r = origGo.apply(this, arguments); if (t === 'leagues') open(); return r; };
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#nav [data-t="leagues"]')) { LG.id = null; LG.det = null; } }, true); // tapping the tab again goes back to the list

  /* ---------- create / join ---------- */
  function createModal() {
    let pub = 0, busy = false;
    const m = modal(`<h3 style="margin-bottom:10px">Create a league</h3>
<label class="mu">League name</label><input id="lgx-name" maxlength="40" placeholder="Sunday Sharps" autocomplete="off" style="font-size:16px;margin:4px 0 12px">
<label class="mu">Sport</label><select id="lgx-sport" class="lgx-sel">${SPORTS.map((s) => `<option value="${s}">${esc(sportName(s))}</option>`).join('')}</select>
<label class="mu">Runs for</label><select id="lgx-days" class="lgx-sel">${DAYS.map(([d, t]) => `<option value="${d}"${d === 7 ? ' selected' : ''}>${t}</option>`).join('')}</select>
<div class="row" style="margin:0 0 6px"><button class="chip on" data-v="0">Private</button><button class="chip" data-v="1">Public</button></div>
<p class="mu" id="lgx-vh" style="margin:0 0 12px">Only people with your invite code can join.</p>
<button class="pri" id="lgx-go">Create league</button>`);
    m.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => {
      pub = +b.dataset.v; m.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', x === b));
      m.querySelector('#lgx-vh').textContent = pub ? 'Anyone can find and join it from the Leagues tab.' : 'Only people with your invite code can join.';
    });
    m.querySelector('#lgx-go').onclick = async () => {
      if (busy) return;
      const name = m.querySelector('#lgx-name').value.trim();
      if (name.length < 3) return toast('Give your league a name (3+ characters)');
      busy = true;
      try {
        const r = await rpc('league_create', { p_name: name, p_sport: m.querySelector('#lgx-sport').value, p_days: +m.querySelector('#lgx-days').value, p_public: !!pub });
        m.remove(); LG.mine = null; toast('League created. Share the code with your friends.'); openLeague(r.id);
      } catch (e) { fail(e); busy = false; }
    };
    setTimeout(() => { const i = m.querySelector('#lgx-name'); i && i.focus(); }, 50);
  }
  async function join(args) {
    try { const r = await rpc('league_join', args); LG.mine = null; toast('You joined the league'); openLeague(r.id); return true; }
    catch (e) { fail(e); return false; }
  }
  function inviteModal(code) {
    const m = modal(`<h3 style="margin-bottom:8px">Join this league?</h3><p class="mu" style="margin-bottom:12px">Invite code <b>${esc(code)}</b></p><button class="pri" id="lgx-yes">Join league</button>`);
    m.querySelector('#lgx-yes').onclick = async () => { const b = m.querySelector('#lgx-yes'); b.disabled = true; if (await join({ p_code: code })) m.remove(); else b.disabled = false; };
  }

  /* ---------- clicks ---------- */
  document.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-lgx]'); if (!c) return;
    const a = c.dataset.lgx;
    if (a === 'open') { openLeague(c.dataset.lid); return; }
    if (a === 'back') { LG.id = null; LG.det = null; loadHome(); return; }
    if (a === 'new') { createModal(); return; }
    if (a === 'tab') { LG.tab = c.dataset.lt; paint(detailHtml()); return; }
    if (a === 'joinpub') { e.stopPropagation(); c.disabled = true; if (!(await join({ p_id: c.dataset.lid }))) c.disabled = false; return; }
    if (a === 'joincode') { const v = (document.getElementById('lgx-code') || {}).value || ''; if (v.trim().length < 4) return toast('Enter the invite code'); c.disabled = true; if (!(await join({ p_code: v.trim() }))) c.disabled = false; return; }
    if (a === 'copycode' && LG.det) { copy(LG.det.league.code); return; }
    if (a === 'copylink' && LG.det) { copy(location.origin + '/?lg=' + LG.det.league.code); return; }
    if (a === 'leave' && LG.det) {
      const l = LG.det.league, del = l.owner === (ME && ME.id);
      if (!confirm(del ? 'Delete this league?' : 'Leave this league? Your picks in it will be removed.')) return;
      try { await rpc('league_leave', { p_id: l.id }); LG.mine = null; toast(del ? 'League deleted' : 'You left the league'); LG.id = null; LG.det = null; loadHome(); } catch (err) { fail(err); }
      return;
    }
    if (a === 'pick' && LG.det) {
      const g = G.find((x) => String(x.id) === c.dataset.lgid);
      if (!g || g.st !== 'up' || (!MMA(g.sp) && Date.parse(g.date) <= Date.now())) return toast('That game has started');
      const side = c.dataset.lside === 'a' ? g.a : g.b, key = String(g.id), cur = pickMap().get(key);
      if ((cur && cur.pick === side) || LG.pk.has(key)) return;
      LG.pk.add(key);
      try {
        await rpc('league_save_pick', { p_league: LG.id, p_game: key, p_sport: g.sp, p_pick: side, p_matchup: g.a + ' vs ' + g.b, p_start: MMA(g.sp) ? null : g.date });
        LG.det.picks = [{ game_id: key, pick: side, matchup: g.a + ' vs ' + g.b, sport: g.sp, result: null, updated_at: new Date().toISOString() }, ...LG.det.picks.filter((p) => String(p.game_id) !== key)];
        paint(detailHtml());
      } catch (err) { fail(err); } finally { LG.pk.delete(key); }
    }
  });

  /* ---------- keep things fresh ---------- */
  const here = () => S.tab === 'leagues' && !document.hidden && !document.querySelector('.modal');
  setInterval(() => { if (here() && LG.id && LG.det && LG.tab === 'picks') paint(detailHtml()); }, 15000);   // new games from the live feed
  setInterval(() => { if (here()) { if (LG.id) loadDetail(true); else loadHome(); } }, 60000);               // standings / time left
  async function bg() { if (typeof ME === 'undefined' || !ME || !window.FX_DB) return; try { const rows = await rpc('league_my'); LG.mine = rows; scan(rows); } catch (e) {} }
  setTimeout(bg, 8000); setInterval(() => { if (!document.hidden) bg(); }, 600000);   // also pays out + announces a league win even if you never open the tab

  /* ---------- invite links: /?lg=CODE ---------- */
  try {
    const q = new URLSearchParams(location.search).get('lg');
    if (q && /^[A-Za-z0-9]{4,8}$/.test(q)) {
      const t0 = Date.now(), iv = setInterval(() => {
        if (Date.now() - t0 > 90000) { clearInterval(iv); return; }
        if (typeof ME !== 'undefined' && ME && S.loaded) {
          clearInterval(iv);
          setTimeout(() => { try { history.replaceState({}, '', '/'); } catch (e) {} go('leagues'); inviteModal(q.toUpperCase()); }, 1200);
        }
      }, 600);
    }
  } catch (e) {}
})();
