/* Account changes (username, email, password). Every change asks for the current password first. */
(() => {
const RESERVED = ['you','me','u','admin','fanova','sidelyne','sidelynesports','sidelyne_sports','support','mod','api','login','signup','settings','index'];
const EYE = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const TITLES = { username: 'Change username', email: 'Change email', password: 'Change password' };

const pwField = (id, label, auto) =>
  `<div class="fld"><span class="fld-l">${label}</span><div class="fld-pw"><input id="${id}" type="password" autocomplete="${auto}" aria-label="${label}"><button type="button" class="fld-eye" data-eye="${id}" aria-label="Show or hide password">${EYE}</button></div></div>`;
const field = (id, label, val, attrs) =>
  `<div class="fld"><span class="fld-l">${label}</span><input id="${id}" value="${esc(val || '')}" aria-label="${label}" ${attrs || ''}></div>`;

window.acctOpen = async (kind, onDone) => {
  if (!ME || !FX_DB) return;
  const m = modal(`<h3>${TITLES[kind] || 'Account'}</h3><div class="ac"><div class="sk"></div></div>`);
  const box = m.querySelector('.ac');
  let u = null;
  try { u = (await FX_DB.auth.getUser()).data.user; } catch (e) {}
  if (!u) { box.innerHTML = '<p class="ac-p">Could not load your account. Log out and back in, then try again.</p>'; return; }
  const hasPw = (u.identities || []).some(i => i.provider === 'email');
  const err = t => { const e = box.querySelector('.ac-err'); if (e) e.textContent = t || ''; };
  const val = id => { const e = box.querySelector('#' + id); return e ? e.value : ''; };
  const busy = (b, on, label) => { b.disabled = on; b.textContent = on ? 'Please wait…' : label; };

  const verify = async pw => {
    if (!pw) return 'Enter your current password.';
    const r = await FX_DB.auth.signInWithPassword({ email: u.email, password: pw });
    if (!r.error) return null;
    return /invalid|credentials/i.test(r.error.message) ? 'Incorrect password.' : r.error.message;
  };
  const finish = msg => { document.querySelectorAll('.modal:not(#gate)').forEach(x => x.remove()); toast(msg); };

  m.addEventListener('click', e => {
    const eye = e.target.closest('[data-eye]');
    if (eye) { const i = box.querySelector('#' + eye.dataset.eye); if (i) i.type = i.type === 'password' ? 'text' : 'password'; }
  });
  box.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT') { const b = box.querySelector('.pri'); if (b && !b.disabled) b.click(); } });

  // Signed up with GitHub / Discord: no password exists yet.
  if (!hasPw && kind !== 'password') {
    box.innerHTML = `<p class="ac-p">You signed in with a connected account, so there is no password to confirm yet. Set a password first, then you can change your ${kind}.</p><button class="pri" id="acgo">Set a password</button>`;
    box.querySelector('#acgo').onclick = () => { m.remove(); window.acctOpen('password', onDone); };
    return;
  }

  if (kind === 'username') {
    box.innerHTML = `<p class="ac-p">Your profile link changes with it. Old links to @${esc(ME.username)} will stop working and anyone can claim that name.</p>${field('acu', 'New username', ME.username, 'maxlength="20" autocapitalize="none" autocomplete="off" spellcheck="false"')}<p class="ac-hint">3–20 letters, numbers or underscores.</p>${pwField('acp', 'Current password', 'current-password')}<p class="ac-err" role="alert"></p><button class="pri" id="acgo">Save username</button>`;
    const btn = box.querySelector('#acgo');
    btn.onclick = async () => {
      err('');
      const nu = val('acu').trim().toLowerCase().replace(/^@/, '');
      if (nu === ME.username) return err('That is already your username.');
      if (!/^[a-z0-9_]{3,20}$/.test(nu)) return err('Username must be 3–20 characters: letters, numbers, underscores.');
      if (RESERVED.includes(nu)) return err('That username is reserved.');
      busy(btn, true);
      const bad = await verify(val('acp'));
      if (bad) { busy(btn, false, 'Save username'); return err(bad); }
      const t = await FX_DB.from('profiles').select('id').eq('username', nu).maybeSingle();
      if (t.data) { busy(btn, false, 'Save username'); return err('That username is taken.'); }
      const r = await FX_DB.from('profiles').update({ username: nu }).eq('id', ME.id);
      if (r.error) {
        busy(btn, false, 'Save username');
        if (r.error.code === '23505') return err('That username is taken.');
        if (/cannot be changed/i.test(r.error.message)) return err('Username changes are not turned on yet. Run supabase/account.sql in Supabase.');
        return err(r.error.message);
      }
      ME.username = nu;
      if (S.up && S.up.prof && S.up.prof.id === ME.id) S.up.prof.username = nu;
      finish('Username changed to @' + nu);
      go('profile');
    };
    return;
  }

  // password
  box.innerHTML = `${hasPw ? pwField('acp', 'Current password', 'current-password') : '<p class="ac-p">You signed in with a connected account. Set a password to also log in with your username.</p>'}${pwField('acn', 'New password', 'new-password')}<p class="ac-hint">At least 8 characters.</p>${pwField('acn2', 'Confirm new password', 'new-password')}<p class="ac-err" role="alert"></p><button class="pri" id="acgo">${hasPw ? 'Change password' : 'Set password'}</button>`;
  const btn = box.querySelector('#acgo'), lbl = hasPw ? 'Change password' : 'Set password';
  btn.onclick = async () => {
    err('');
    const np = val('acn');
    if (np.length < 8) return err('New password must be at least 8 characters.');
    if (np !== val('acn2')) return err('The new passwords do not match.');
    if (hasPw && np === val('acp')) return err('Pick a password you are not already using.');
    busy(btn, true);
    if (hasPw) { const bad = await verify(val('acp')); if (bad) { busy(btn, false, lbl); return err(bad); } }
    const r = await FX_DB.auth.updateUser({ password: np });
    if (r.error) { busy(btn, false, lbl); return err(r.error.message); }
    finish(hasPw ? 'Password changed' : 'Password set');
    if (onDone) onDone();
  };
};
})();
