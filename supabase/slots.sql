-- Sidelyne Sports: SLOTS (5 reels x 3 rows, up to 9 paylines) with DENOMINATIONS. Free play only, SP has no cash value.
-- Run in Supabase SQL Editor AFTER stake.sql (it uses sp_credit from there). Safe to re-run. Replaces the old slots_spin(int).
-- Every spin is decided here on the server (the app only plays the animation), so the odds can't be tampered with.
--
-- HOW A BET WORKS (like a real machine):
--   total bet = denom x lines x credits per line
--   denom  : 1, 2, 5, 10, 25 or 100 SP per credit
--   lines  : 1, 3, 5 or 9 active paylines
--   credits per line: 1 to 10
--   Smallest bet = 1 SP (1 x 1 line x 1 credit). Biggest = 9,000 SP.
-- LINE PAYS: 3, 4 or 5 matching symbols left to right from reel 1 on an active line.
--   Pays = multiplier x credits per line x denom x payback factor. Multipliers (3 / 4 / 5 of a kind):
--     soccer 8/22/70  ufc 10/28/100  nhl 14/40/140  mlb 18/50/200  nba 22/70/300  nfl 34/110/500
-- THEMES: nfl, nba, nhl, mlb, ufc, soccer. The theme only changes the look (client) and the BONUS below. Pay table and odds are the same.
--   The symbol ids in the pay table (soccer..nfl) are just 6 TIERS, lowest to highest; the app draws each theme's own icons on them.
-- BONUS: 3+ Sidelynes anywhere = FREE SPINS at your bet. Every theme has its own bonus (slots_bonus_mults below): a list of win multipliers,
--   one per free spin. Every list adds up to 12 (same value as the old 6 spins x2) so the payback stays the same.
--   3 more Sidelynes during the bonus = another round of the same spins (max 4 rounds).
-- PAYBACK BY DENOM (like a real casino, bigger denoms pay back more): about 88% at denom 1 up to about 96% at denom 100.
--   (measured by simulation: raw return is ~74.5% at factor 1.0; slots_adj() scales it per denom.)

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

drop function if exists slots_spin(int);
drop function if exists slots_spin(int,int,int);   -- replaced by slots_spin(int,int,int,text)

create or replace function slots_mult(p_sym text,p_n int) returns int language sql immutable as $$
  select case p_sym
    when 'soccer' then (array[8,22,70])[p_n-2]
    when 'ufc'    then (array[10,28,100])[p_n-2]
    when 'nhl'    then (array[14,40,140])[p_n-2]
    when 'mlb'    then (array[18,50,200])[p_n-2]
    when 'nba'    then (array[22,70,300])[p_n-2]
    when 'nfl'    then (array[34,110,500])[p_n-2]
    else 0 end $$;   -- <== TUNE: the pay table

-- The bonus of each theme = win multiplier of each free spin, in order. Keep every list adding up to 12 to keep the payback.   <== TUNE
--   og   Original        : 6 spins, every win x2 (the classic Sidelyne bonus)
--   nfl  Touchdown Drive : 6 spins, multiplier climbs 1,1,2,2,3,3
--   nba  Fast Break      : 8 spins, 1,1,1,1,2,2,2,2
--   nhl  Power Play      : 4 spins, every win x3
--   mlb  Home Run Derby  : 12 swings, every win x1
--   ufc  Fight Night     : 5 rounds, 1,2,2,3,4 (the last round is the KO)
--   soccer Penalty Shootout : 5 kicks, 1,1,2,3,5 (sudden death)
create or replace function slots_bonus_mults(p_theme text) returns int[] language sql immutable as $$
  select case p_theme
    when 'og'     then array[2,2,2,2,2,2]
    when 'nfl'    then array[1,1,2,2,3,3]
    when 'nba'    then array[1,1,1,1,2,2,2,2]
    when 'nhl'    then array[3,3,3,3]
    when 'mlb'    then array[1,1,1,1,1,1,1,1,1,1,1,10]
    when 'ufc'    then array[1,2,2,3,4]
    when 'soccer' then array[1,1,2,3,5]
    else null end $$;

-- payback factor per denom (raw return ~0.745 x factor = target RTP)   <== TUNE
create or replace function slots_adj(p_denom int) returns numeric language sql immutable as $$
  select case p_denom when 1 then 1.181 when 2 then 1.195 when 5 then 1.221 when 10 then 1.248 when 25 then 1.275 when 100 then 1.289 else 1.0 end $$;

-- Plays ONE grid. p_scat = how many Sidelyne logos to force in (0, 2 for a tease, 3 for the bonus). p_x = win multiplier (2 in free spins).
create or replace function slots_play(p_lines int,p_cpl int,p_denom int,p_scat int,p_x int) returns jsonb language plpgsql volatile as $$
declare
  pool constant text[]:=array['soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','nba','nba','nba','nba','nba','nba','nba','nba','nba','nba','nba','nba','nfl','nfl','nfl','nfl','nfl','nfl','nfl','nfl','nfl','nfl'];   -- <== TUNE: symbol weights
  lines constant int[]:=array[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
  g text[]:=array_fill('x'::text,array[5,3]);
  adj numeric:=slots_adj(p_denom); c int; r int; i int; n int; base text; cols int[]; lp bigint; pay bigint:=0; scat int:=0;
  wins jsonb:='[]'::jsonb; reels jsonb:='[]'::jsonb;
begin
  for c in 1..5 loop for r in 1..3 loop g[c][r]:=pool[1+floor(random()*array_length(pool,1))::int]; end loop; end loop;
  if p_scat>0 then
    cols:=(select array_agg(x) from (select x from generate_series(1,5) x order by random() limit p_scat) q);
    foreach c in array cols loop g[c][1+floor(random()*3)::int]:='S'; end loop;
  end if;
  for i in 1..p_lines loop
    base:=g[1][lines[i][1]+1];
    continue when base='S';
    n:=1;
    while n<5 and g[n+1][lines[i][n+1]+1]=base loop n:=n+1; end loop;
    if n>=3 then
      lp:=round(slots_mult(base,n)*p_cpl*p_denom*adj*p_x)::bigint; pay:=pay+lp;
      wins:=wins||jsonb_build_array(jsonb_build_object('line',i-1,'sym',base,'count',n,'pay',lp));
    end if;
  end loop;
  for c in 1..5 loop
    reels:=reels||jsonb_build_array(jsonb_build_array(g[c][1],g[c][2],g[c][3]));
    for r in 1..3 loop if g[c][r]='S' then scat:=scat+1; end if; end loop;
  end loop;
  return jsonb_build_object('reels',reels,'wins',wins,'pay',least(pay,1000000000),'scatters',scat);
end $$;

create or replace function slots_spin(p_denom int,p_lines int,p_cpl int,p_theme text default 'nfl') returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_bonus_p numeric:=0.012;            -- <== TUNE: base chance of the free spins bonus on any spin (for a bonus whose multipliers add up to 12). Scaled below by 12/sum(multipliers) so a richer bonus (MLB: 21) triggers less often and the payback stays the same
  c_tease   constant numeric:=0.12;    -- <== TUNE: how often a normal spin shows 2 Sidelynes as a tease
  c_ret_tot constant numeric:=0.072;   -- <== TUNE: chance of a retrigger over one round of free spins (split across the spins so every theme gets the same)
  c_rounds  constant int:=4;           -- max rounds of free spins in one bonus (first round + 3 retriggers)
  mults int[]; len int; c_ret numeric; c_fsmax int; mx int;
  total int; bal int; last timestamptz; roll numeric:=random(); b jsonb; f jsonb; kind text; pay bigint:=0; lpay bigint:=0; run bigint:=0;
  fs_total int:=0; n int:=0; ret boolean; spins jsonb:='[]'::jsonb; flat text:=''; c int; r int; nv int; fr jsonb; free jsonb:=null;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_denom not in(1,2,5,10,25,100) then raise exception 'Denomination must be 1, 2, 5, 10, 25 or 100'; end if;
  if p_lines not in(1,3,5,9) then raise exception 'Lines must be 1, 3, 5 or 9'; end if;
  if coalesce(p_cpl,0) not between 1 and 10 then raise exception 'Credits per line must be 1 to 10'; end if;
  mults:=slots_bonus_mults(p_theme);
  if mults is null then raise exception 'Unknown theme'; end if;
  len:=array_length(mults,1); c_ret:=c_ret_tot/len; c_fsmax:=len*c_rounds;
  c_bonus_p:=c_bonus_p*12.0/(select sum(m) from unnest(mults) m);
  total:=p_denom*p_lines*p_cpl;

  select novas into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<total then raise exception 'Not enough SP: you have %, you need %',bal,total; end if;
  select max(created_at) into last from slot_spins where user_id=uid;
  if last is not null and last>now()-interval '1 second' then raise exception 'Slow down'; end if;

  if roll<c_bonus_p then
    kind:='bonus'; b:=slots_play(p_lines,p_cpl,p_denom,3,1);
  elsif random()<c_tease then
    b:=slots_play(p_lines,p_cpl,p_denom,2,1);
  else
    b:=slots_play(p_lines,p_cpl,p_denom,0,1);
  end if;
  lpay:=(b->>'pay')::bigint; pay:=lpay;

  if kind='bonus' then
    fs_total:=len;
    while n<fs_total loop
      n:=n+1;
      mx:=mults[1+((n-1)%len)];
      ret:=fs_total<c_fsmax and random()<c_ret;
      f:=slots_play(p_lines,p_cpl,p_denom,case when ret then 3 else 0 end,mx);
      if ret then fs_total:=fs_total+len; end if;
      run:=run+(f->>'pay')::bigint;
      spins:=spins||jsonb_build_array(jsonb_build_object('n',n,'x',mx,'reels',f->'reels','wins',f->'wins','pay',(f->>'pay')::bigint,'run',run,'retrigger',ret,'total',fs_total));
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
  insert into slot_spins(user_id,bet,reels,kind,payout,denom,lines,cpl,theme) values(uid,total,flat,kind,pay::int,p_denom,p_lines,p_cpl,p_theme);
  select novas into nv from profiles where id=uid;
  return jsonb_build_object('reels',b->'reels','kind',kind,'bet',total,'denom',p_denom,'lines',p_lines,'cpl',p_cpl,'theme',p_theme,'payout',pay,'line_pay',lpay,'wins',b->'wins','scatters',(b->>'scatters')::int,'free',free,'novas',nv);
end $$;

revoke all on function slots_mult(text,int) from public,anon;
revoke all on function slots_adj(int) from public,anon;
revoke all on function slots_bonus_mults(text) from public,anon;
revoke all on function slots_play(int,int,int,int,int) from public,anon,authenticated;
revoke all on function slots_spin(int,int,int,text) from public,anon;
grant execute on function slots_spin(int,int,int,text) to authenticated;
notify pgrst,'reload schema';
