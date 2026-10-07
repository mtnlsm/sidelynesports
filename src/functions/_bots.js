// Seeded accounts: normal users driven with the service role key. The list of which accounts they are lives in the private bot_accounts table.
const { db } = require('./_cache');
const sports = require('./sports-data');
const crypto = require('crypto');

// [username, display name, favorite sport]
const PEOPLE = [['jaylen_m23', 'Jaylen', 'NBA'], ['gabe_nfl', 'Gabe R', 'NFL'], ['olivia_ufc', 'Olivia', 'UFC'], ['sam_sundays', 'Sam', 'NFL'], ['cam_courtside', 'Cam', 'NBA'], ['brianna_b', 'Brianna', 'NFL'],
  ['marcus_mma', 'Marcus', 'UFC'], ['fiona_hoops', 'Fiona', 'NBA'], ['pete_picks', 'Pete', 'NFL'], ['tess_t', 'Tess', 'MLB'], ['hank_h', 'Hank', 'NFL'], ['riley_r_', 'Riley', 'UFC'],
  ['dre_dunks', 'Dre', 'NBA'], ['rosa_gameday', 'Rosa', 'NFL'], ['carlos_9', 'Carlos', 'MLB'], ['uma_lee', 'Uma', 'NHL'], ['kyle_w', 'Kyle', 'NFL'], ['nia_sports', 'Nia', 'NBA'],
  ['tommy_b24', 'Tommy', 'NHL'], ['jess_in_the_stands', 'Jess', 'NFL']];
const BIOS = ['', '', 'big fan', 'sunday football + whatever else is on', 'here for the picks', 'bad takes, good vibes', 'streak chaser', 'ride or die for my team', 'hoops and ufc', ''];
const AV = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'], BN = ['b1', 'b2', 'b3'];

const T = {
  pick: ['{p} tonight. {a} vs {b} just feels like that kind of game', 'going {p} in {a} vs {b}', 'taking {p}, not even close imo', '{p} for me. {a} vs {b}', 'locked in {p} 🔒', 'ok {p}. dont @ me if it goes wrong', '{a} vs {b}... {p} and im not changing it', 'gut says {p}'],
  hype: ['who yall riding with today?', 'slate looks crazy today', 'streak still alive, not jinxing it', 'someone has to pull an upset today right', 'this app is way too addicting lol', 'checking scores every 5 min again', 'hot take: underdogs win more than people think', 'weekend games better deliver', 'just missed a pick by one score. painful', 'how is everyone doing on picks this week'],
  sport: ['any {s} fans on here?', '{s} picks are looking tough today', 'who is your {s} lock of the day', 'loving the {s} schedule this week', 'best {s} team right now? go', 'unpopular {s} opinion: the favorites are overrated'],
};
const REPLY = ['facts', 'lol same', 'bold pick', 'im with you on that one', 'nah underdog wins this', 'we will see 👀', '100%', 'respect', 'hard disagree but ok', 'this is the way', 'good call', 'haha its gonna be close'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] || '');
const chance = (p) => Math.random() < p;
const shuffle = (a) => a.slice().sort(() => Math.random() - 0.5);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Create accounts. Join date is the moment of creation, so they show up as genuinely new members.
async function seed(sb, count) {
  const made = [];
  seed.errors = [];
  const have = new Set(((await sb.from('profiles').select('username').in('username', PEOPLE.map((x) => x[0]))).data || []).map((x) => x.username));
  for (const [un, dn, sp] of shuffle(PEOPLE)) {
    if (made.length >= count) break;
    if (have.has(un)) continue;
    const { data, error } = await sb.auth.admin.createUser({ email: `${un.replace(/[^a-z0-9]/g, '')}.${crypto.randomBytes(3).toString('hex')}@mail.invalid`, password: crypto.randomBytes(24).toString('hex'),
      email_confirm: true, user_metadata: { username: un, display_name: dn } });
    if (error || !data.user) { seed.errors.push('createUser ' + un + ': ' + (error ? error.message : 'no user returned')); console.error('bots seed createUser', un, error && error.message); continue; }
    const id = data.user.id;
    const ins = await sb.from('bot_accounts').insert({ user_id: id });
    if (ins.error) { seed.errors.push('bot_accounts insert: ' + ins.error.message + ' (did you run supabase/bots.sql?)'); console.error('bots seed bot_accounts', ins.error.message); await sb.auth.admin.deleteUser(id); break; }
    await sb.from('profiles').update({ onboarded: true, bio: pick(BIOS) || null, avatar_url: chance(0.6) ? 'preset:' + pick(AV) : null, banner_url: chance(0.4) ? 'preset:' + pick(BN) : null }).eq('id', id);
    made.push(un);
  }
  return made;
}

// One tick: 1-3 accounts do a few things. Many ticks do nothing, so activity is bursty and uneven like real people.
async function tick(sb) {
  if (chance(0.35)) return { skipped: true };
  const { data: ids } = await sb.from('bot_accounts').select('user_id');
  if (!ids || !ids.length) return { error: 'no seeded accounts, run seed first' };
  const { data: bots } = await sb.from('profiles').select('id,username').in('id', ids.map((x) => x.user_id));
  const res = await sports.handler({ queryStringParameters: { sport: 'ALL', type: 'games' } });
  const games = JSON.parse(res.body).items || [];
  const upcoming = games.filter((g) => g.st === 'up' && Date.parse(g.date) - Date.now() > 10 * 60e3);
  const log = { posts: 0, picks: 0, likes: 0, comments: 0, follows: 0 };
  const hour = new Date().getUTCHours(); // quieter overnight (US time)
  const sleepy = hour >= 6 && hour <= 11;
  for (const b of shuffle(bots).slice(0, sleepy ? 1 : 1 + Math.floor(Math.random() * 3))) {
    await sleep(Math.random() * 2500);
    if (upcoming.length && chance(0.7)) {
      for (const g of shuffle(upcoming).slice(0, 1 + Math.floor(Math.random() * 3))) {
        const p = chance(0.55) ? g.a : g.b; // slight lean to the first-listed team, like people do
        const r = await sb.from('user_picks').upsert({ user_id: b.id, game_id: String(g.id), sport: g.sp, pick: p, matchup: g.a + ' vs ' + g.b }, { onConflict: 'user_id,game_id', ignoreDuplicates: true });
        if (!r.error) { log.picks++;
          if (chance(0.25)) { const ok = await sb.from('posts').insert({ user_id: b.id, body: fill(pick(T.pick), { p, a: g.a, b: g.b }), sport: g.sp }); if (!ok.error) log.posts++; } }
      }
    } else if (chance(0.5)) {
      const sp = pick(['NFL', 'NBA', 'UFC', 'MLB', 'NHL']);
      const ok = await sb.from('posts').insert({ user_id: b.id, body: chance(0.5) ? pick(T.hype) : fill(pick(T.sport), { s: sp }), sport: chance(0.5) ? sp : null }); if (!ok.error) log.posts++;
    }
    const { data: recent } = await sb.from('posts').select('id,user_id,created_at').neq('user_id', b.id).order('created_at', { ascending: false }).limit(15);
    for (const p of shuffle(recent || []).slice(0, 3)) {
      if (Date.now() - Date.parse(p.created_at) < 4 * 60e3) continue; // nobody likes a post within seconds
      if (chance(0.6)) { const r = await sb.from('post_likes').insert({ post_id: p.id, user_id: b.id }); if (!r.error) log.likes++; }
      if (chance(0.1)) { const r = await sb.from('comments').insert({ post_id: p.id, user_id: b.id, body: pick(REPLY) }); if (!r.error) log.comments++; }
    }
    if (chance(0.2)) {
      const { data: ppl } = await sb.from('profiles').select('id').neq('id', b.id).order('created_at', { ascending: false }).limit(15);
      const t = pick(ppl || [{}]); if (t.id) { const r = await sb.from('follows').insert({ follower: b.id, followee: t.id }); if (!r.error) log.follows++; }
    }
  }
  return log;
}
module.exports = { seed, tick, db };
