/* ===== LEAGUES (needs supabase/leagues.sql) =====
   Has its own tab in the main navigation (bottom bar on mobile, side bar on desktop). You vs everyone in the league: make free picks on upcoming games, 1 point per
   correct pick. Leagues never expire: they run until the owner deletes them. Standings reset every 2 months (a new season). Owners can customize them (picture, banner, bio, colors). Everything goes through database functions (league_*), nothing is
   written to the tables directly. Loaded after app.js, so it can reuse its helpers (esc, modal, avHtml, crest, G, ME ...). */
(() => {
  const BONUS = 20000; // only used for text before the server answers; the real amount comes from league_cfg() in leagues.sql
  const LG = { id: null, tab: 'picks', mine: null, pub: null, det: null, pk: new Set(), sf: 'all', pf: 'all', seg: 'all', open: {}, stay: new Set() };
  const SPORTS = ['ALL', 'NFL', 'NBA', 'MLB', 'NHL', 'CFB', 'UFC', 'PFL'];
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#64748b'];
  const DEF1 = '#3b82f6', DEF2 = '#8b5cf6';
  const HEX = /^#[0-9a-fA-F]{6}$/;
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
.lgx-win{background:color-mix(in srgb,var(--lc,var(--ab)) 14%,var(--sf));box-shadow:inset 0 0 0 1.5px var(--lc,var(--ab))}
.lgx-side.on{border-color:var(--lc,var(--ab));background:color-mix(in srgb,var(--lc,var(--ab)) 12%,var(--sf2))}
.lgx-av{flex:none;border-radius:50%;object-fit:cover;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;background:linear-gradient(135deg,var(--lc,#3b82f6),var(--lc2,#8b5cf6))}
.lgx-av.sq{border-radius:22%}
.lgx-hero{border-radius:18px;overflow:hidden;margin-bottom:10px;background:var(--sf);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--lc,var(--ab)) 40%,transparent)}
.lgx-ban{height:110px;background:linear-gradient(135deg,var(--lc,#3b82f6),var(--lc2,#8b5cf6)) center/cover no-repeat}
.lgx-hb{padding:0 14px 14px;position:relative}
.lgx-hb .lgx-av{margin-top:-34px;border:3px solid var(--sf)}
.lgx-bar{height:4px;border-radius:4px;background:linear-gradient(90deg,var(--lc,#3b82f6),var(--lc2,#8b5cf6));margin:8px 0}
.lgx-tag{display:inline-block;font-size:12px;font-weight:700;padding:3px 9px;border-radius:99px;background:color-mix(in srgb,var(--lc,var(--ab)) 18%,transparent);color:var(--lc,var(--ab))}
.lgx-prog{height:6px;border-radius:6px;background:var(--sf2);overflow:hidden;margin-top:8px}
.lgx-prog i{display:block;height:100%;border-radius:6px;background:linear-gradient(90deg,var(--lc,#3b82f6),var(--lc2,#8b5cf6));transition:width .25s}
.lgx-day{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin:18px 2px 8px}
.lgx-day h3{margin:0;font-size:16px}
.lgx-ev{margin:18px 0 6px;border-radius:16px;background:var(--sf);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--lc,var(--ab)) 35%,transparent);overflow:hidden}
.lgx-evh{display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;background:none;border:0;color:inherit;font:inherit;text-align:left;cursor:pointer}
.lgx-evh .t{flex:1;min-width:0}
.lgx-evh .d{font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--lc,var(--ab))}
.lgx-evh .n{display:block;font-size:17px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lgx-evh .m{display:block;font-size:12px;color:var(--mu);margin-top:2px}
.lgx-evh .c{flex:none;font-size:12px;font-weight:700;color:var(--mu)}
.lgx-evb{padding:0 10px 4px}
.lgx-seg{display:flex;gap:6px;margin:0 0 10px}
.lgx-seg button{flex:1;padding:8px 6px;border-radius:10px;border:0;background:var(--sf2);color:var(--tx);font:inherit;font-size:13px;font-weight:700;cursor:pointer}
.lgx-seg button.on{background:var(--lc,var(--ab));color:#fff}
.lgx-fc{position:relative}
.lgx-fc.me{box-shadow:inset 0 0 0 1.5px var(--lc,var(--ab))}
.lgx-ftag{display:inline-block;font-size:11px;font-weight:800;letter-spacing:.08em;padding:3px 9px;border-radius:99px;background:var(--lc,var(--ab));color:#fff;margin-bottom:6px}
.lgx-ok{font-size:12px;font-weight:700;color:var(--lc,var(--ab))}
.lgx-side small{font-size:11px;font-weight:600}
}
.lgx-rec{display:flex;gap:10px;align-items:center;margin:16px 2px 8px}
.lgx-prize{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:12px 14px;border-radius:14px;background:linear-gradient(135deg,color-mix(in srgb,var(--lc,#3b82f6) 22%,var(--sf)),color-mix(in srgb,var(--lc2,#8b5cf6) 22%,var(--sf)));box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--lc,var(--ab)) 55%,transparent)}
.lgx-prize b{font-size:16px}
.lgx-prize p{margin:2px 0 0}
.lgx-pz{display:inline-block;font-size:12px;font-weight:700;color:var(--lc,var(--ab))}
.lgx-sw{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 12px}
.lgx-sw button{width:30px;height:30px;border-radius:50%;border:3px solid transparent;cursor:pointer;padding:0}
.lgx-sw button.on{border-color:var(--tx)}
.lgx-up{display:flex;gap:8px;align-items:center;margin:6px 0 12px;flex-wrap:wrap}
.lgx-up .chip{flex:none}
textarea.lgx-ta{width:100%;font:inherit;font-size:16px;color:inherit;background:var(--sf2);border:1.5px solid transparent;border-radius:12px;padding:12px 14px;margin:4px 0 4px;resize:vertical;box-sizing:border-box}
`;
  document.head.append(st);

  /* ---------- small helpers ---------- */
  const rpc = async (fn, a) => { const r = await FX_DB.rpc(fn, a || {}); if (r.error) throw r.error; return r.data; };
  const box = () => document.getElementById('lb');
  const fail = (e) => toast((e && e.message) || String(e));
  const sportName = (c) => (c === 'ALL' ? 'All sports' : (typeof spl === 'function' ? spl(c) : c));
  const fmt = (n) => Number(n || 0).toLocaleString();
  const left = (iso) => {
    if (!iso) return 'Always on';
    const ms = Date.parse(iso) - Date.now(); if (ms <= 0) return 'Ended';
    const m = Math.floor(ms / 6e4), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
    return d > 0 ? d + 'd ' + h + 'h left' : h > 0 ? h + 'h ' + (m % 60) + 'm left' : Math.max(1, m) + 'm left';
  };
  const isOpen = (l) => l.status === 'active' && (!l.ends_at || Date.parse(l.ends_at) > Date.now());
  const seasonTxt = (l) => { if (!l.season_ends) return 'Always on'; const ms = Date.parse(l.season_ends) - Date.now(); return 'Season ' + (l.season || 1) + ' · ' + (ms <= 0 ? 'resetting…' : left(l.season_ends)); };
  const stateTxt = (l) => (l.status !== 'active' ? 'Finished' : !l.ends_at ? seasonTxt(l) : Date.parse(l.ends_at) <= Date.now() ? 'Finishing…' : left(l.ends_at));
  const c1 = (l) => (l && HEX.test(l.color || '') ? l.color : DEF1);
  const c2 = (l) => (l && HEX.test(l.color2 || '') ? l.color2 : (l && HEX.test(l.color || '') ? l.color : DEF2));
  const cv = (l) => `--lc:${c1(l)};--lc2:${c2(l)}`;
  const safeUrl = (u) => (u && /^https?:\/\//.test(u) ? u : '');
  const lav = (l, z, sq) => safeUrl(l.avatar_url)
    ? `<img class="lgx-av${sq ? ' sq' : ''}" src="${esc(l.avatar_url)}" alt="" style="width:${z}px;height:${z}px;${cv(l)}">`
    : `<div class="lgx-av${sq ? ' sq' : ''}" style="width:${z}px;height:${z}px;font-size:${Math.round(z * .42)}px;${cv(l)}">${esc(((l.name || '?').trim()[0] || '?').toUpperCase())}</div>`;
  async function uploadLeagueImg(file, kind) {
    if (!file || !/^image\//.test(file.type)) throw new Error('Please choose an image');
    if (file.size > 10 * 1024 * 1024) throw new Error('Image is too large (max 10 MB)');
    const b = kind === 'banner' ? await resizeImg(file, 1200, 400) : await resizeImg(file, 400, 400);
    const path = ME.id + '/league-' + kind + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.jpg';
    const up = await FX_DB.storage.from('avatars').upload(path, b, { upsert: true, contentType: 'image/jpeg', cacheControl: '3600' });
    if (up.error) throw up.error;
    return FX_DB.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  }
  const chooseFile = () => new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => res(i.files[0] || null); i.click(); });
  const seen = () => { try { return new Set(JSON.parse(localStorage.getItem('fx-lg-won') || '[]')); } catch (e) { return new Set(); } };
  const mark = (id) => { try { const s = seen(); s.add(id); localStorage.setItem('fx-lg-won', JSON.stringify([...s].slice(-100))); } catch (e) {} };
  const copy = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copied'); } catch (e) { toast('Copy failed. Long-press to copy: ' + t); } };

  let last = '';
  // repaint in place without the page jumping: pin the tapped control to the same spot on screen
  function repaintKeepY() { const y = window.scrollY; paint(detailHtml()); if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y); }
  function paintKeep(c, sel) {
    const top = c.getBoundingClientRect().top;
    paint(detailHtml());
    const n = document.querySelector(sel);
    if (n) window.scrollBy(0, n.getBoundingClientRect().top - top);
  }
  function paint(html) {
    const b = box(); if (!b) return false;
    if (html === last && b.dataset.lgx === '1') return true;
    const hs = [...b.querySelectorAll('.hs')].map((e) => e.scrollLeft);   // keep the filter rows where the user scrolled them
    b.innerHTML = html; b.dataset.lgx = '1'; last = html;
    b.querySelectorAll('.hs').forEach((e, i) => { if (hs[i]) e.scrollLeft = hs[i]; });
    return true;
  }
  const paintErr = (e) => paint(`<div class="glass card"><b>Couldn't load leagues</b><p class="mu">${esc((e && e.message) || e)}</p><p class="mu">Did you run supabase/leagues.sql in the Supabase SQL Editor?</p></div>`);

  // Tell the player when a league they were in finished and they won (once per league), and refresh their SP.
  function scan(rows) {
    const s = seen(); let won = false;
    (rows || []).forEach((l) => {
      if (l.won_season) { const k = l.id + ':s' + l.won_season; if (!s.has(k)) { mark(k); won = true; toast('You finished #1 in ' + l.name + '! +' + fmt(l.won_bonus || BONUS) + ' SP'); } }
      else if (l.i_won && !s.has(l.id)) { mark(l.id); won = true; toast('You won ' + l.name + '! +' + fmt(l.bonus) + ' SP'); }
    });
    if (won && typeof syncNovas === 'function') syncNovas('League win');
  }

  /* ---------- home: my leagues, public leagues, create / join ---------- */
  const cardHtml = (l) => `<div class="glass card" data-lgx="open" data-lid="${esc(l.id)}" role="button" tabindex="0" style="cursor:pointer;${cv(l)};box-shadow:inset 4px 0 0 var(--lc)">
<div class="row sp"><div class="row" style="min-width:0;gap:10px">${lav(l, 36)}<b class="ellip" style="min-width:0">${esc(l.name)}</b></div><span class="chip" style="flex:none">${esc(stateTxt(l))}</span></div>
<div class="mu" style="margin:4px 0 8px">${esc(sportName(l.sport))} · ${l.members} player${l.members === 1 ? '' : 's'}${l.is_public ? ' · Public' : ''}${l.is_owner ? ' · Yours' : ''}</div>${isOpen(l) ? `<div class="lgx-pz" style="margin:0 0 6px">#1 wins ${fmt(BONUS)} SP</div>` : ''}${l.bio ? `<div class="mu ellip" style="margin:-2px 0 8px">${esc(l.bio)}</div>` : ''}
<div class="row sp"><span>Rank <b>#${l.rank}</b> of ${l.members}</span><span class="mu">${l.wins} W · ${l.losses} L${l.i_won ? ' · <b style="color:var(--ab)">Won +' + fmt(l.bonus) + ' SP</b>' : ''}</span></div></div>`;
  const pubHtml = (l) => `<div class="glass card row sp" data-lgx="open" data-lid="${esc(l.id)}" role="button" tabindex="0" style="cursor:pointer;gap:10px;${cv(l)};box-shadow:inset 4px 0 0 var(--lc)">
${lav(l, 40)}<div style="min-width:0;flex:1"><b class="ellip" style="display:block">${esc(l.name)}</b><div class="mu ellip">${esc(sportName(l.sport))} · ${l.members} player${l.members === 1 ? '' : 's'}${l.owner_name ? ' · @' + esc(l.owner_name) : ''}</div><div class="lgx-pz">#1 wins ${fmt(BONUS)} SP</div>${l.bio ? `<div class="mu ellip">${esc(l.bio)}</div>` : ''}</div>
<button class="chip on" data-lgx="joinpub" data-lid="${esc(l.id)}" style="flex:none">Join</button></div>`;
  function homeHtml() {
    const mine = LG.mine || [], pub = (LG.pub || []).filter((x) => !x.joined);
    return `<div class="glass card"><b>Leagues</b><p class="mu" style="margin:6px 0 0">Pick winners against your friends (or everyone). 1 point per correct pick, no SP at risk. <b>Finish #1 when a season ends and you win ${fmt(BONUS)} SP.</b> Leagues never expire: they stay open until the owner deletes them. Standings reset every 2 months, and you can give your league a picture, banner, bio and colors.</p></div>
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

  const dayLabel = (t) => {
    const d = new Date(t), n = new Date(), k = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    const diff = Math.round((k(d) - k(n)) / 864e5);
    return diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };
  const tm = (d) => (d ? new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '');
  const sideBtn = (g, n, k, cur, rec) => `<button class="lgx-side${cur && cur.pick === n ? ' on' : ''}" data-lgx="pick" data-lgid="${esc(g.id)}" data-lside="${k}" aria-pressed="${!!(cur && cur.pick === n)}">${crest(n, g.sp, MMA(g.sp) ? 44 : 36)}<span>${esc(n)}</span>${rec ? `<small class="mu">${esc(String(rec))}</small>` : ''}</button>`;

  function gameCard(g, mp) {   // team sports
    const cur = mp.get(String(g.id));
    return `<div class="glass card"><div class="row sp"><span class="chip glass">${esc(spl(g.sp))}</span><span class="mu">${esc(tm(g.date) || when(g))}${cur ? ' · <span class="lgx-ok">Picked</span>' : ''}</span></div><div class="lgx-pk">${sideBtn(g, g.a, 'a', cur)}<span class="lgx-vs">VS</span>${sideBtn(g, g.b, 'b', cur)}</div></div>`;
  }
  function fightCard(g, mp) {  // UFC / PFL
    const cur = mp.get(String(g.id)), tag = g.pos === 0 ? 'MAIN EVENT' : g.pos === 1 ? 'CO-MAIN' : '';
    return `<div class="glass card lgx-fc${g.pos === 0 ? ' me' : ''}">${tag ? `<div class="lgx-ftag">${tag}</div>` : ''}<div class="row sp"><span class="mu">${esc(g.wc || 'Bout')} · ${g.rd || 3} rounds</span>${cur ? '<span class="lgx-ok">Picked</span>' : ''}</div><div class="lgx-pk">${sideBtn(g, g.a, 'a', cur, g.ra)}<span class="lgx-vs">VS</span>${sideBtn(g, g.b, 'b', cur, g.rb)}</div></div>`;
  }
  const picked = (mp, g) => mp.has(String(g.id));
  const prog = (n, t) => `<div class="lgx-prog"><i style="width:${t ? Math.round((n / t) * 100) : 0}%"></i></div>`;

  function fightEvents(games, mp) {
    const m = new Map();
    games.forEach((g) => { const k = g.sp + ':' + (g.evi || g.ev || 'x'); if (!m.has(k)) m.set(k, { k, n: g.ev || spl(g.sp), sp: g.sp, a: [] }); m.get(k).a.push(g); });
    const evs = [...m.values()].sort((x, y) => Date.parse(x.a[0].tm || x.a[0].date || 0) - Date.parse(y.a[0].tm || y.a[0].date || 0)).slice(0, 8);
    return evs.map((e, i) => {
      e.a.sort((x, y) => (x.pos || 0) - (y.pos || 0));
      const f = e.a[0], isOpen = e.k in LG.open ? LG.open[e.k] : i === 0;
      const dt = f.tm || f.tp || f.date, dd = dt ? new Date(dt).toLocaleDateString([], { month: 'short', day: 'numeric', weekday: 'long' }).toUpperCase() : '';
      const nPre = e.a.filter((g) => g.seg === 'pre').length, nMain = e.a.length - nPre;
      const made = e.a.filter((g) => picked(mp, g)).length;
      const meta = [f.tm ? 'Main card ' + tm(f.tm) : '', f.tp && nPre ? 'Prelims ' + tm(f.tp) : '', f.vn || ''].filter(Boolean).join(' · ');
      const show = e.a.filter((g) => LG.seg === 'all' || (LG.seg === 'pre' ? g.seg === 'pre' : g.seg !== 'pre'));
      const segs = nPre ? `<div class="lgx-seg">${[['all', 'All', e.a.length], ['main', 'Main card', nMain], ['pre', 'Prelims', nPre]].map(([k, v, n]) => `<button data-lgx="seg" data-sg="${k}" class="${LG.seg === k ? 'on' : ''}">${v} ${n}</button>`).join('')}</div>` : '';
      return `<section class="lgx-ev"><button class="lgx-evh" data-lgx="evt" data-ek="${esc(e.k)}" data-open="${isOpen ? 1 : 0}" aria-expanded="${isOpen}"><div class="t"><span class="d">${esc(dd)}</span><span class="n">${esc(e.n)}</span>${meta ? `<span class="m">${esc(meta)}</span>` : ''}</div><span class="c">${made}/${e.a.length} ${isOpen ? '▾' : '▸'}</span></button>${isOpen ? `<div class="lgx-evb">${prog(made, e.a.length)}<div style="height:10px"></div>${segs}${show.length ? show.map((g) => fightCard(g, mp)).join('') : '<p class="mu">No fights in this section.</p>'}</div>` : ''}</section>`;
    }).join('');
  }
  function teamDays(games, mp) {
    const days = new Map();
    games.forEach((g) => { const k = new Date(g.date).toDateString(); if (!days.has(k)) days.set(k, []); days.get(k).push(g); });
    let n = 0, out = '';
    for (const [, a] of days) {
      if (n >= 40) break;
      const slice = a.slice(0, 40 - n); n += slice.length;
      const made = a.filter((g) => picked(mp, g)).length;
      out += `<div class="lgx-day"><h3>${esc(dayLabel(a[0].date))}</h3><span class="mu">${made}/${a.length} picked</span></div>${slice.map((g) => gameCard(g, mp)).join('')}`;
    }
    return out + (games.length > 40 ? '<p class="mu">Showing the next 40 games.</p>' : '');
  }

  function picksHtml(l) {
    const mp = pickMap(), all = elig(l), openIds = new Set(all.map((g) => String(g.id)));
    const mine = (LG.det.picks || []).filter((p) => !openIds.has(String(p.game_id)));
    // sport filter (only for "All sports" leagues that actually have games in more than one sport)
    const sports = [...new Set(all.map((g) => g.sp))];
    if (LG.sf !== 'all' && !sports.includes(LG.sf)) LG.sf = 'all';
    const scoped = LG.sf === 'all' ? all : all.filter((g) => g.sp === LG.sf);
    const made = scoped.filter((g) => picked(mp, g)).length, todo = scoped.length - made;
    if (LG.pf === 'todo' && !todo && scoped.length) LG.pf = 'all';
    const list = LG.pf === 'todo' ? scoped.filter((g) => !picked(mp, g) || LG.stay.has(String(g.id))) : LG.pf === 'done' ? scoped.filter((g) => picked(mp, g)) : scoped;
    const sfBar = l.sport === 'ALL' && sports.length > 1 ? `<div class="row hs sb">${['all', ...sports].map((c) => `<button class="sbtn ${LG.sf === c ? 'on' : ''}" data-lgx="sf" data-sp="${esc(c)}">${c === 'all' ? 'All sports' : esc(spl(c))}</button>`).join('')}</div>` : '';
    const pfBar = scoped.length ? `<div class="row hs sb">${[['all', 'All', scoped.length], ['todo', 'To pick', todo], ['done', 'Picked', made]].map(([k, v, n]) => `<button class="sbtn ${LG.pf === k ? 'on' : ''}" data-lgx="pf" data-lpf="${k}">${v} <span class="pf-n">${n}</span></button>`).join('')}</div>` : '';
    const head = scoped.length ? `<div class="glass card"><div class="row sp"><b>Your picks</b><span class="mu">${made} of ${scoped.length} made</span></div>${prog(made, scoped.length)}<p class="mu" style="margin:8px 0 0">Tap a fighter or team to pick. You can change a pick until the game starts.</p></div>` : '';
    const mma = list.filter((g) => MMA(g.sp)), team = list.filter((g) => !MMA(g.sp));
    let body = '';
    if (team.length) body += teamDays(team, mp);
    if (mma.length) body += (team.length ? '<h2 style="margin:20px 0 4px">Fight cards</h2>' : '') + fightEvents(mma, mp);
    if (!body) body = scoped.length ? '<div class="glass card"><b>Nothing here</b><p class="mu">Try a different filter.</p></div>'
      : `<div class="glass card"><b>No upcoming ${l.sport === 'ALL' ? '' : esc(sportName(l.sport)) + ' '}games right now</b><p class="mu">${GSTAT === 'loading' ? 'Loading games…' : 'Check back soon, new games show up here as they are scheduled.'}</p></div>`;
    const w = mine.filter((p) => p.result === 'win').length, lo = mine.filter((p) => p.result === 'loss').length;
    const rec = mine.length ? `<div class="lgx-rec"><h2 style="margin:0;flex:1">Locked and settled</h2><span class="mu">${w}W · ${lo}L</span></div>` + mine.slice(0, 40).map((p) => `<div class="glass card row sp"><div style="min-width:0"><b class="ellip" style="display:block">${esc(p.pick)}</b><div class="mu ellip">${esc(p.matchup)}${p.sport ? ' · ' + esc(spl(p.sport)) : ''}</div></div><span style="flex:none">${resBadge(p)}</span></div>`).join('') : '';
    return `${head}${sfBar}${pfBar}${body}${rec}`;
  }
  function standHtml(l, rows) {
    const fin = l.status !== 'active';
    return rows.map((u) => {
      const me = ME && u.id === ME.id, top = fin && u.rank === 1 && l.bonus_paid;
      return `<div class="glass card row sp${top ? ' lgx-win' : ''}" style="${me && !top ? 'box-shadow:inset 0 0 0 1.5px var(--ab)' : ''}"><a class="ulk row" href="/@${esc(u.username)}" data-u="${esc(u.username)}" style="min-width:0;flex:1"><b style="width:26px;text-align:center;flex:none;color:${u.rank <= 3 ? 'var(--ab)' : 'var(--mu)'}">${u.rank}</b>${avHtml(u, 40)}<div style="min-width:0"><b class="ellip" style="display:block">${dname(u)}${flr(u)}</b><div class="mu">@${esc(u.username)}${top ? ' · Won +' + fmt(l.bonus) + ' SP' : (!fin && u.rank === 1 && u.points > 0 ? ' · Leading for ' + fmt(BONUS) + ' SP' : '')}</div></div></a><div style="text-align:right;flex:none"><b>${u.points} pt${u.points === 1 ? '' : 's'}</b><div class="mu">${u.wins}W · ${u.losses}L</div></div></div>`;
    }).join('') || '<p class="mu">No players yet.</p>';
  }
  function pastHtml(h) {
    if (!h.length) return '';
    return '<h2 style="margin:20px 0 10px">Past seasons</h2>' + h.map((s) => {
      const top = s.top || [];
      const dt = new Date(s.ended_at).toLocaleDateString([], { month: 'short', year: 'numeric' });
      return `<div class="glass card"><div class="row sp"><b>Season ${s.season}</b><span class="mu">Ended ${esc(dt)}${s.bonus_paid ? ' · <b style="color:var(--ab)">Winner got +' + fmt(s.bonus) + ' SP</b>' : ''}</span></div>${top.length ? top.map((u, i) => `<div class="row sp" style="margin-top:8px"><div class="row" style="min-width:0;gap:8px"><b style="width:20px;text-align:center;flex:none;color:${i === 0 ? 'var(--ab)' : 'var(--mu)'}">${i + 1}</b>${avHtml({ username: u.username, display_name: u.display_name, avatar_url: u.avatar_url }, 28)}<span class="ellip" style="min-width:0">${esc(u.display_name || u.username)}${i === 0 && s.winner ? ' ' + ic('crown', 14, 1) : ''}</span></div><span class="mu" style="flex:none">${u.points} pt${u.points === 1 ? '' : 's'} · ${u.wins}W ${u.losses}L</span></div>`).join('') : '<p class="mu" style="margin:8px 0 0">No picks were settled this season.</p>'}</div>`;
    }).join('');
  }
  function detailHtml() {
    const d = LG.det; if (!d) return skel;
    const l = d.league, mem = d.is_member, open = isOpen(l), cfg = d.cfg || {}, mine = !!(ME && l.owner === ME.id);
    const winner = l.status !== 'active' ? d.standings.find((u) => u.rank === 1) : null;
    const code = mem && open ? `<div class="lgx-code"><div><small class="mu">Invite code</small><b>${esc(l.code)}</b></div><button class="chip" data-lgx="copycode">Copy code</button><button class="chip" data-lgx="copylink">Copy invite link</button></div>` : '';
    const join = !mem && open ? `<button class="pri" data-lgx="joinpub" data-lid="${esc(l.id)}" style="margin-top:12px">Join this league</button>` : '';
    const banner = winner ? `<div class="glass card lgx-win"><div class="row sp"><b>${ic('crown', 16, 1)} ${l.bonus_paid ? esc(winner.display_name || winner.username) + ' won the league' : 'Final standings'}</b>${l.bonus_paid ? '<b>+' + fmt(l.bonus) + ' SP</b>' : ''}</div>${l.bonus_paid ? '' : `<p class="mu" style="margin:6px 0 0">No bonus this time: a league needs ${cfg.min_members || 3}+ players and a winner with ${cfg.min_picks || 5}+ graded picks.</p>`}</div>` : '';
    const prize = open ? `<div class="lgx-prize">${ic('crown', 26, 1)}<div><b>#1 wins ${fmt(cfg.bonus || BONUS)} SP</b><p class="mu">Finish first when the season ends${l.season_ends ? ' (' + new Date(l.season_ends).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ')' : ''}. Needs ${cfg.min_members || 3}+ players and ${cfg.min_picks || 5}+ graded picks from the winner. Standings reset every ${cfg.season_months || 2} months.</p></div></div>` : '';
    const ban = safeUrl(l.banner_url) ? `background-image:url('${esc(l.banner_url).replace(/'/g, '%27')}')` : '';
    const info = `<div class="lgx-hero"><div class="lgx-ban" style="${ban}"></div><div class="lgx-hb"><div class="row sp" style="align-items:flex-end;gap:10px">${lav(l, 68, 1)}<div class="row" style="gap:8px;flex:none;margin-bottom:4px">${mine ? '<button class="chip" data-lgx="edit">Edit league</button>' : ''}<span class="chip">${esc(stateTxt(l))}</span></div></div>
<b class="ellip" style="display:block;font-size:20px;margin-top:8px">${esc(l.name)}</b>
<div class="mu" style="margin-top:4px">${esc(sportName(l.sport))} · ${l.members} player${l.members === 1 ? '' : 's'} · ${l.is_public ? 'Public' : 'Private'}${l.owner_username ? ' · by @' + esc(l.owner_username) : ''}</div>
${l.bio ? `<p style="margin:10px 0 0;white-space:pre-wrap;word-break:break-word">${esc(l.bio)}</p>` : ''}
<div class="lgx-bar"></div>
${open ? `<p class="mu" style="margin:0">Make free picks on upcoming games. 1 point per correct pick.</p>` : ''}${code}${join}</div></div>`;
    const tabs = mem ? `<div class="row hs sb" style="margin-bottom:10px">${[['picks', 'Picks'], ['stand', 'Standings']].map(([k, v]) => `<button class="sbtn ${LG.tab === k ? 'on' : ''}" data-lgx="tab" data-lt="${k}">${v}</button>`).join('')}</div>` : '<h2 style="margin:16px 0 10px">Standings</h2>';
    const body = mem && LG.tab === 'picks' ? picksHtml(l) : standHtml(l, d.standings) + pastHtml(d.history || []);
    const leave = mine ? `<div style="margin-top:16px"><button class="chip" data-lgx="del">Delete league</button></div>` : (mem && open ? `<div style="margin-top:16px"><button class="chip" data-lgx="leave">Leave league</button></div>` : '');
    return `<div style="${cv(l)}"><div class="row sp" style="margin-bottom:10px"><button class="chip" data-lgx="back">‹ Leagues</button></div>${banner}${prize}${info}${tabs}${body}${leave}</div>`;
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
  function openLeague(id) { LG.id = id; LG.det = null; LG.tab = 'picks'; LG.sf = 'all'; LG.pf = 'all'; LG.seg = 'all'; LG.open = {}; LG.stay = new Set(); paint(skel); loadDetail(); }
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

  /* ---------- create / edit (same form) ---------- */
  function leagueForm(existing) {
    const ed = !!existing;
    const st = { pub: ed ? (existing.is_public ? 1 : 0) : 0, color: ed ? c1(existing) : DEF1, color2: ed ? c2(existing) : DEF2,
                 avatar: ed ? (existing.avatar_url || '') : '', banner: ed ? (existing.banner_url || '') : '', busy: false };
    const sw = (k) => COLORS.map((c) => `<button type="button" data-sw="${k}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join('');
    const m = modal(`<h3 style="margin-bottom:10px">${ed ? 'Edit league' : 'Create a league'}</h3>
<div class="lgx-hero" id="lgx-prev"></div>
<label class="mu">League name</label><input id="lgx-name" maxlength="40" placeholder="Sunday Sharps" autocomplete="off" value="${ed ? esc(existing.name) : ''}" style="font-size:16px;margin:4px 0 12px">
<label class="mu">Bio <span id="lgx-bc">0/200</span></label><textarea id="lgx-bio" class="lgx-ta" rows="3" maxlength="200" placeholder="What is this league about? Rules, vibe, who it's for.">${ed ? esc(existing.bio || '') : ''}</textarea>
<label class="mu" style="display:block;margin-top:8px">League picture</label>
<div class="lgx-up"><button type="button" class="chip" id="lgx-avu">Upload</button><button type="button" class="chip" id="lgx-avr">Remove</button></div>
<label class="mu">Banner</label>
<div class="lgx-up"><button type="button" class="chip" id="lgx-bnu">Upload</button><button type="button" class="chip" id="lgx-bnr">Remove</button></div>
<label class="mu">Main color</label><div class="lgx-sw" id="lgx-sw1">${sw('color')}</div>
<label class="mu">Second color</label><div class="lgx-sw" id="lgx-sw2">${sw('color2')}</div>
${ed ? '' : `<label class="mu">Sport</label><select id="lgx-sport" class="lgx-sel">${SPORTS.map((s) => `<option value="${s}">${esc(sportName(s))}</option>`).join('')}</select>`}
<div class="row" style="margin:0 0 6px"><button type="button" class="chip" data-v="0">Private</button><button type="button" class="chip" data-v="1">Public</button></div>
<p class="mu" id="lgx-vh" style="margin:0 0 12px"></p>
<p class="mu" style="margin:0 0 12px">${ed ? 'The sport can\'t be changed after a league is created.' : 'Leagues never expire. Standings reset every 2 months and whoever is #1 at the end of a season wins ' + fmt(BONUS) + ' SP (needs 3+ players and 5+ graded picks).'}</p>
<button class="pri" id="lgx-go">${ed ? 'Save changes' : 'Create league'}</button>`);
    const q = (x) => m.querySelector(x);
    const preview = () => {
      const l = { name: q('#lgx-name').value || 'Your league', color: st.color, color2: st.color2, avatar_url: st.avatar, banner_url: st.banner };
      const ban = safeUrl(st.banner) ? `background-image:url('${esc(st.banner).replace(/'/g, '%27')}')` : '';
      const el = q('#lgx-prev'); el.style.cssText = cv(l);
      el.innerHTML = `<div class="lgx-ban" style="${ban};height:80px"></div><div class="lgx-hb"><div style="display:flex">${lav(l, 56, 1)}</div><b class="ellip" style="display:block;font-size:17px;margin-top:6px">${esc(l.name)}</b><div class="lgx-bar"></div></div>`;
      m.querySelectorAll('[data-sw]').forEach((b) => b.classList.toggle('on', st[b.dataset.sw].toLowerCase() === b.dataset.c));
      q('#lgx-bc').textContent = q('#lgx-bio').value.length + '/200';
    };
    const vis = () => {
      m.querySelectorAll('[data-v]').forEach((x) => x.classList.toggle('on', +x.dataset.v === st.pub));
      q('#lgx-vh').textContent = st.pub ? 'Anyone can find and join it from the Leagues tab.' : 'Only people with your invite code can join.';
    };
    m.querySelectorAll('[data-v]').forEach((b) => b.onclick = () => { st.pub = +b.dataset.v; vis(); });
    m.querySelectorAll('[data-sw]').forEach((b) => b.onclick = () => { st[b.dataset.sw] = b.dataset.c; preview(); });
    q('#lgx-name').addEventListener('input', preview); q('#lgx-bio').addEventListener('input', preview);
    const up = (kind, key) => async () => {
      const f = await chooseFile(); if (!f) return;
      toast('Uploading…');
      try { st[key] = await uploadLeagueImg(f, kind); preview(); toast('Uploaded'); } catch (e) { toast('Upload failed: ' + ((e && e.message) || e)); }
    };
    q('#lgx-avu').onclick = up('avatar', 'avatar'); q('#lgx-bnu').onclick = up('banner', 'banner');
    q('#lgx-avr').onclick = () => { st.avatar = ''; preview(); }; q('#lgx-bnr').onclick = () => { st.banner = ''; preview(); };
    q('#lgx-go').onclick = async () => {
      if (st.busy) return;
      const name = q('#lgx-name').value.trim();
      if (name.length < 3) return toast('Give your league a name (3+ characters)');
      st.busy = true;
      try {
        if (ed) {
          await rpc('league_update', { p_id: existing.id, p_name: name, p_bio: q('#lgx-bio').value.trim() || null, p_color: st.color, p_color2: st.color2, p_avatar: st.avatar || null, p_banner: st.banner || null, p_public: !!st.pub });
          m.remove(); LG.mine = null; toast('League updated'); loadDetail();
        } else {
          const r = await rpc('league_create', { p_name: name, p_sport: q('#lgx-sport').value, p_public: !!st.pub, p_bio: q('#lgx-bio').value.trim() || null, p_color: st.color, p_color2: st.color2, p_avatar: st.avatar || null, p_banner: st.banner || null });
          m.remove(); LG.mine = null; toast('League created. Share the code with your friends.'); openLeague(r.id);
        }
      } catch (e) { fail(e); st.busy = false; }
    };
    vis(); preview();
    setTimeout(() => { const i = q('#lgx-name'); i && !ed && i.focus(); }, 50);
  }
  const createModal = () => leagueForm(null);
  const editModal = (l) => leagueForm(l);

  /* ---------- join ---------- */
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
    if (a === 'edit' && LG.det) { editModal(LG.det.league); return; }
    if (a === 'sf') { LG.sf = c.dataset.sp; paintKeep(c, `[data-lgx="sf"][data-sp="${c.dataset.sp}"]`); return; }
    if (a === 'pf') { LG.pf = c.dataset.lpf; LG.stay.clear(); paintKeep(c, `[data-lgx="pf"][data-lpf="${c.dataset.lpf}"]`); return; }
    if (a === 'seg') { LG.seg = c.dataset.sg; paintKeep(c, `[data-lgx="seg"][data-sg="${c.dataset.sg}"]`); return; }
    if (a === 'evt') { LG.open[c.dataset.ek] = c.dataset.open !== '1'; paint(detailHtml()); return; }
    if (a === 'tab') { LG.tab = c.dataset.lt; paint(detailHtml()); return; }
    if (a === 'joinpub') { e.stopPropagation(); c.disabled = true; if (!(await join({ p_id: c.dataset.lid }))) c.disabled = false; return; }
    if (a === 'joincode') { const v = (document.getElementById('lgx-code') || {}).value || ''; if (v.trim().length < 4) return toast('Enter the invite code'); c.disabled = true; if (!(await join({ p_code: v.trim() }))) c.disabled = false; return; }
    if (a === 'copycode' && LG.det) { copy(LG.det.league.code); return; }
    if (a === 'copylink' && LG.det) { copy(location.origin + '/?lg=' + LG.det.league.code); return; }
    if (a === 'leave' && LG.det) {
      const l = LG.det.league;
      if (!confirm('Leave this league? Your picks in it will be removed.')) return;
      try { await rpc('league_leave', { p_id: l.id }); LG.mine = null; toast('You left the league'); LG.id = null; LG.det = null; loadHome(); } catch (err) { fail(err); }
      return;
    }
    if (a === 'del' && LG.det) {
      const l = LG.det.league;
      if (!confirm('Delete "' + l.name + '" for everyone? All members, picks and standings will be removed. This cannot be undone.')) return;
      try { await rpc('league_delete', { p_id: l.id }); LG.mine = null; toast('League deleted'); LG.id = null; LG.det = null; loadHome(); } catch (err) { fail(err); }
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
        if (LG.pf === 'todo') LG.stay.add(key);   // keep the fight on screen after you pick it
        repaintKeepY();
      } catch (err) { fail(err); } finally { LG.pk.delete(key); }
    }
  });

  /* ---------- keep things fresh ---------- */
  const here = () => S.tab === 'leagues' && !document.hidden && !document.querySelector('.modal');
  setInterval(() => { if (here() && LG.id && LG.det && LG.tab === 'picks') repaintKeepY(); }, 15000);   // new games from the live feed
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
