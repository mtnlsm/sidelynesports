-- Sidelyne Sports: SP CASINO SLOTS (5 reels x 3 rows, 9 paylines) with a single BET AMOUNT, like an online casino. Free play only, SP has no cash value.
-- Run in Supabase SQL Editor AFTER stake.sql (it uses sp_credit from there). Safe to re-run.
-- Every spin is decided here on the server (the app only plays the animation), so the odds can't be tampered with.
--
-- WHAT CHANGED IN THIS VERSION
--   * Betting is now ONE number: slots_spin(p_bet, p_theme). Type any bet from 1 to 100,000 SP (or use 1/2, 2x, Max in the app).
--     All 9 paylines are always active. Each line stakes bet/9, so total bet = the number you typed.
--   * 6 new machines: candy, viking, egypt, jungle, neon, spooky (13 in total).
--   * The old slots_spin(denom, lines, cpl, theme) is dropped. slots_play(...) is kept as a thin wrapper so wager_saver.sql keeps working.
--
-- LINE PAYS: 3, 4 or 5 matching symbols left to right from reel 1 on a payline.
--   Pays = multiplier x (bet/9) x payback factor. Multipliers (3 / 4 / 5 of a kind) for the 6 symbol tiers:
--     t1 8/22/70   t2 10/28/100   t3 14/40/140   t4 18/50/200   t5 22/70/300   t6 34/110/500
-- MACHINES (theme ids): classic, gold, ocean, frozen, west, dragon, cosmic, candy, viking, egypt, jungle, neon, spooky.
--   The theme changes the look + sounds (client) and the BONUS below. Pay table and odds are the same on every machine.
-- BONUS: 3+ scatters anywhere = FREE SPINS at your bet. Every machine has its own bonus (slots_bonus_mults + slots_bonus_rows below).
--   A 6 row spin plays the 9 paylines on the top 3 rows AND again on the bottom 3 rows, so it is worth exactly 2x a 3 row spin.
--   Every bonus is balanced so that sum(multiplier x rows/3) = 12, which keeps the payback the same on every machine.
--   3 more scatters during the bonus = another round of the same spins (max 4 rounds).
-- PAYBACK BY BET SIZE: about 88% on tiny bets up to about 96% from 9,000 SP and up (see slots_adj_bet).
--   (measured by simulation: raw return is ~74.5% at factor 1.0.)

create table if not exists slot_spins(
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  bet int not null, reels text not null, kind text not null, payout int not null,
  created_at timestamptz not null default now());
alter table slot_spins add column if not exists denom int;
alter table slot_spins add column if not exists lines int;
alter table slot_spins add column if not exists cpl int;
alter table slot_spins add column if not exists theme text;
create index if not exists idx_slot_spins_user on slot_spins(user_id,created_at desc);
alter table slot_spins enable row level security;
drop policy if exists ss_sel on slot_spins;
create policy ss_sel on slot_spins for select using(auth.uid()=user_id);
grant select on slot_spins to authenticated;

-- one-time reset of the slot stats (see the note at the top)
create table if not exists slots_meta(k text primary key, at timestamptz not null default now());
alter table slots_meta enable row level security;
revoke all on slots_meta from public,anon,authenticated;
do $reset$ begin
  if not exists(select 1 from slots_meta where k='reset_new_machines_v1') then
    delete from slot_spins;
    insert into slots_meta(k) values('reset_new_machines_v1');
  end if;
end $reset$;

drop function if exists slots_spin(int);
drop function if exists slots_spin(int,int,int);
drop function if exists slots_play(int,int,int,int,int);   -- replaced by slots_play(int,int,int,int,int,int)

create or replace function slots_mult(p_sym text,p_n int) returns int language sql immutable as $$
  select case p_sym
    when 't1' then (array[8,22,70])[p_n-2]
    when 't2' then (array[10,28,100])[p_n-2]
    when 't3' then (array[14,40,140])[p_n-2]
    when 't4' then (array[18,50,200])[p_n-2]
    when 't5' then (array[22,70,300])[p_n-2]
    when 't6' then (array[34,110,500])[p_n-2]
    else 0 end $$;   -- <== TUNE: the pay table

-- The bonus of each machine, one entry per free spin, in order.   <== TUNE
--   slots_bonus_mults = win multiplier of the spin, slots_bonus_rows = how many rows the reels have on that spin (3 or 6).
--   KEEP sum(multiplier x rows/3) = 12 for every machine so the payback stays the same.
--   classic  Lucky Sevens     : 7 spins, 1,1,1,2,2,2,3                      (value 12)
--   gold     Shaft Blast      : 5 spins, reels blast open to 5 x 6, 1,1,1,1,2 (value 12)
--   ocean    Pearl Dive       : 8 spins, 1,1,1,1,1,2,2,3                    (value 12)
--   frozen   Aurora Storm     : 3 spins, 2,4,6                              (value 12)
--   west     Bounty Hunt      : 6 spins, 1,1,1,1,4,4                        (value 12)
--   dragon   Lantern Festival : 9 spins, 1,1,1,1,1,1,2,2,2                  (value 12)
--   cosmic   Supernova        : 4 spins, 1,2,4,5                            (value 12)
--   candy    Sweet Streak     : 5 spins, 1,2,3,3,3                          (value 12)
--   viking   Ragnarok         : 4 spins, 2,2,2,then the shield wall opens to 6 rows at x3 (2+2+2+6 = 12)
--   egypt    Sands of Time    : 6 spins, all on 6 rows at x1                (6 x 2 = 12)
--   jungle   Stampede         : 5 spins, 1,1,2,4,4                          (value 12)
--   neon     Overdrive        : 4 spins, 1,2,3,6                            (value 12)
--   spooky   Haunting         : 10 spins, 1,1,1,1,1,1,1,1,2,2               (value 12)
create or replace function slots_bonus_mults(p_theme text) returns int[] language sql immutable as $$
  select case p_theme
    when 'classic' then array[1,1,1,2,2,2,3]
    when 'gold'    then array[1,1,1,1,2]
    when 'ocean'   then array[1,1,1,1,1,2,2,3]
    when 'frozen'  then array[2,4,6]
    when 'west'    then array[1,1,1,1,4,4]
    when 'dragon'  then array[1,1,1,1,1,1,2,2,2]
    when 'cosmic'  then array[1,2,4,5]
    when 'candy'   then array[1,2,3,3,3]
    when 'viking'  then array[2,2,2,3]
    when 'egypt'   then array[1,1,1,1,1,1]
    when 'jungle'  then array[1,1,2,4,4]
    when 'neon'    then array[1,2,3,6]
    when 'spooky'  then array[1,1,1,1,1,1,1,1,2,2]
    else null end $$;

create or replace function slots_bonus_rows(p_theme text) returns int[] language sql immutable as $$
  select case p_theme
    when 'classic' then array[3,3,3,3,3,3,3]
    when 'gold'    then array[6,6,6,6,6]
    when 'ocean'   then array[3,3,3,3,3,3,3,3]
    when 'frozen'  then array[3,3,3]
    when 'west'    then array[3,3,3,3,3,3]
    when 'dragon'  then array[3,3,3,3,3,3,3,3,3]
    when 'cosmic'  then array[3,3,3,3]
    when 'candy'   then array[3,3,3,3,3]
    when 'viking'  then array[3,3,3,6]
    when 'egypt'   then array[6,6,6,6,6,6]
    when 'jungle'  then array[3,3,3,3,3]
    when 'neon'    then array[3,3,3,3]
    when 'spooky'  then array[3,3,3,3,3,3,3,3,3,3]
    else null end $$;

-- payback factor by BET SIZE: about 88% RTP on a 1 SP bet, rising smoothly to about 96% at 9,000 SP and above   <== TUNE
create or replace function slots_adj_bet(p_bet int) returns numeric language sql immutable as $$
  select 1.181+0.108*least(1.0,ln(greatest(p_bet,1)::numeric)/ln(9000::numeric)) $$;

-- legacy: payback factor per denom (only used by the slots_play wrapper below)
create or replace function slots_adj(p_denom int) returns numeric language sql immutable as $$
  select case p_denom when 1 then 1.181 when 2 then 1.195 when 5 then 1.221 when 10 then 1.248 when 25 then 1.275 when 100 then 1.289 else 1.0 end $$;

-- Plays ONE grid. p_unit = SP staked on each payline (bet/9), p_adj = payback factor, p_scat = how many scatters to force in
-- (0, 2 for a tease, 3 for the bonus), p_x = win multiplier, p_rows = 3 (normal) or 6 (expanded bonus reels: the 9 paylines
-- play on the top 3 rows and again on the bottom 3 rows, line ids 0-8 and 9-17). Pay is summed unrounded and rounded once.
create or replace function slots_play_b(p_lines int,p_unit numeric,p_adj numeric,p_scat int,p_x int,p_rows int default 3) returns jsonb language plpgsql volatile as $$
declare
  pool constant text[]:=array['t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t1','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t2','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t3','t4','t4','t4','t4','t4','t4','t4','t4','t4','t4','t4','t4','t4','t4','t5','t5','t5','t5','t5','t5','t5','t5','t5','t5','t5','t5','t6','t6','t6','t6','t6','t6','t6','t6','t6','t6'];   -- <== TUNE: symbol weights
  lines constant int[]:=array[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
  nrow int:=case when p_rows=6 then 6 else 3 end;
  g text[];
  c int; r int; i int; n int; h int; off int; base text; cols int[]; lp numeric; pay numeric:=0; scat int:=0;
  wins jsonb:='[]'::jsonb; reels jsonb:='[]'::jsonb; col jsonb;
begin
  g:=array_fill('x'::text,array[5,nrow]);
  for c in 1..5 loop for r in 1..nrow loop g[c][r]:=pool[1+floor(random()*array_length(pool,1))::int]; end loop; end loop;
  if p_scat>0 then
    cols:=(select array_agg(x) from (select x from generate_series(1,5) x order by random() limit p_scat) q);
    foreach c in array cols loop g[c][1+floor(random()*nrow)::int]:='S'; end loop;
  end if;
  for h in 0..(nrow/3-1) loop
    off:=h*3;
    for i in 1..p_lines loop
      base:=g[1][lines[i][1]+1+off];
      continue when base='S';
      n:=1;
      while n<5 and g[n+1][lines[i][n+1]+1+off]=base loop n:=n+1; end loop;
      if n>=3 then
        lp:=slots_mult(base,n)*p_unit*p_adj*p_x; pay:=pay+lp;
        wins:=wins||jsonb_build_array(jsonb_build_object('line',h*9+i-1,'sym',base,'count',n,'pay',round(lp)::bigint));
      end if;
    end loop;
  end loop;
  for c in 1..5 loop
    col:='[]'::jsonb;
    for r in 1..nrow loop
      col:=col||jsonb_build_array(g[c][r]);
      if g[c][r]='S' then scat:=scat+1; end if;
    end loop;
    reels:=reels||jsonb_build_array(col);
  end loop;
  return jsonb_build_object('reels',reels,'wins',wins,'pay',least(round(pay)::bigint,1000000000),'scatters',scat);
end $$;

-- legacy wrapper (denom x credits per line), kept so wager_saver.sql and anything else that calls slots_play keeps working
create or replace function slots_play(p_lines int,p_cpl int,p_denom int,p_scat int,p_x int,p_rows int default 3) returns jsonb language sql volatile as $$
  select slots_play_b(p_lines,(p_cpl*p_denom)::numeric,slots_adj(p_denom),p_scat,p_x,p_rows) $$;

create or replace function slots_spin(p_bet int,p_theme text default 'classic') returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_min     constant int:=1;           -- <== TUNE: smallest bet
  c_max     constant int:=100000;      -- <== TUNE: biggest bet
  c_bonus_p numeric:=0.012;            -- <== TUNE: base chance of the free spins bonus on any spin (for a bonus worth 12). Scaled below by 12/value so a richer bonus triggers less often and the payback stays the same
  c_tease   constant numeric:=0.12;    -- <== TUNE: how often a normal spin shows 2 scatters as a tease
  c_ret_tot constant numeric:=0.072;   -- <== TUNE: chance of a retrigger over one round of free spins (split across the spins so every machine gets the same)
  c_rounds  constant int:=4;           -- max rounds of free spins in one bonus (first round + 3 retriggers)
  mults int[]; rws int[]; len int; c_ret numeric; c_fsmax int; mx int; rw int; unit numeric; adj numeric;
  total int; bal int; last timestamptz; roll numeric:=random(); b jsonb; f jsonb; kind text; pay bigint:=0; lpay bigint:=0; run bigint:=0;
  fs_total int:=0; n int:=0; ret boolean; spins jsonb:='[]'::jsonb; flat text:=''; c int; nv int; fr jsonb; free jsonb:=null;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_bet is null or p_bet<c_min or p_bet>c_max then raise exception 'Bet must be between % and % SP',c_min,c_max; end if;
  mults:=slots_bonus_mults(p_theme); rws:=slots_bonus_rows(p_theme);
  if mults is null or rws is null then raise exception 'Unknown machine, reload the page'; end if;
  len:=array_length(mults,1); c_ret:=c_ret_tot/len; c_fsmax:=len*c_rounds;
  c_bonus_p:=c_bonus_p*12.0/(select sum(tm*tr/3.0) from unnest(mults,rws) as t(tm,tr));
  total:=p_bet; unit:=p_bet/9.0; adj:=slots_adj_bet(p_bet);

  select novas into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<total then raise exception 'Not enough SP: you have %, you need %',bal,total; end if;
  select max(created_at) into last from slot_spins where user_id=uid;
  if last is not null and last>now()-interval '1 second' then raise exception 'Slow down'; end if;

  if roll<c_bonus_p then
    kind:='bonus'; b:=slots_play_b(9,unit,adj,3,1,3);
  elsif random()<c_tease then
    b:=slots_play_b(9,unit,adj,2,1,3);
  else
    b:=slots_play_b(9,unit,adj,0,1,3);
  end if;
  lpay:=(b->>'pay')::bigint; pay:=lpay;

  if kind='bonus' then
    fs_total:=len;
    while n<fs_total loop
      n:=n+1;
      mx:=mults[1+((n-1)%len)]; rw:=rws[1+((n-1)%len)];
      ret:=fs_total<c_fsmax and random()<c_ret;
      f:=slots_play_b(9,unit,adj,case when ret then 3 else 0 end,mx,rw);
      if ret then fs_total:=fs_total+len; end if;
      run:=run+(f->>'pay')::bigint;
      spins:=spins||jsonb_build_array(jsonb_build_object('n',n,'x',mx,'rows',rw,'reels',f->'reels','wins',f->'wins','pay',(f->>'pay')::bigint,'run',run,'retrigger',ret,'total',fs_total));
    end loop;
    pay:=pay+run;
    free:=jsonb_build_object('start',len,'round',len,'theme',p_theme,'spins',spins);
  elsif pay>0 then kind:='lines'; else kind:='lose'; end if;
  pay:=least(pay,1000000000);

  update profiles set novas=novas-total where id=uid;
  insert into nova_transactions(user_id,amount,reason,ref) values(uid,-total,'Slots spin',gen_random_uuid()::text);
  if pay>0 then perform sp_credit(uid,pay::int,least(total,pay::int),'Slots win',gen_random_uuid()::text); end if;

  fr:=b->'reels';
  for c in 0..4 loop flat:=flat||case when c>0 then '|' else '' end||(fr->c->>0)||','||(fr->c->>1)||','||(fr->c->>2); end loop;
  insert into slot_spins(user_id,bet,reels,kind,payout,denom,lines,cpl,theme) values(uid,total,flat,kind,pay::int,null,9,null,p_theme);
  select novas into nv from profiles where id=uid;
  return jsonb_build_object('reels',b->'reels','kind',kind,'bet',total,'lines',9,'theme',p_theme,'payout',pay,'line_pay',lpay,'wins',b->'wins','scatters',(b->>'scatters')::int,'free',free,'novas',nv);
end $$;

drop function if exists slots_spin(int,int,int,text);   -- old denom x lines x credits version

revoke all on function slots_mult(text,int) from public,anon;
revoke all on function slots_adj(int) from public,anon;
revoke all on function slots_adj_bet(int) from public,anon;
revoke all on function slots_bonus_mults(text) from public,anon;
revoke all on function slots_bonus_rows(text) from public,anon;
revoke all on function slots_play_b(int,numeric,numeric,int,int,int) from public,anon,authenticated;
revoke all on function slots_play(int,int,int,int,int,int) from public,anon,authenticated;
revoke all on function slots_spin(int,text) from public,anon;
grant execute on function slots_spin(int,text) to authenticated;
notify pgrst,'reload schema';
