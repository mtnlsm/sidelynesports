-- SLOTS 3: everything new for the slots in ONE file. Run in the Supabase SQL editor after slots.sql and Slots-2.sql. Safe to re-run, and any future slot changes go in this same file.
--   1) 2 new BIG-WIN machines: olympus (Gods of Olympus) and heist (Diamond Heist), 19 in total.
--   2) Different odds on every machine (slots_theme_pay and slots_theme_bon below).
-- Most bonuses are worth 12 (sum of multiplier x rows/3). These two are worth more (see below) and trigger less often, so the payback stays the same.
--   olympus Thunder of Zeus: 3 spins 2,2,20 on 3 rows (value 24)  |  heist Vault Crack: 3 spins 2,2,7, rows 3,3,6 (value 2+2+14 = 18)
--   The bonus value is allowed to be above 12: slots_spin scales the chance of triggering by 12/value, so the payback stays the same. Bigger bonus = rarer but bigger.

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
    when 'pirate'  then array[1,1,1,1,2,2,4]
    when 'magic'   then array[2,2,3,5]
    when 'luau'    then array[1,1,1,1,1,1,3,3]
    when 'racing'  then array[1,1,2,2,2,4]
    when 'olympus' then array[2,2,20]
    when 'heist'   then array[2,2,7]
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
    when 'pirate'  then array[3,3,3,3,3,3,3]
    when 'magic'   then array[3,3,3,3]
    when 'luau'    then array[3,3,3,3,3,3,3,3]
    when 'racing'  then array[3,3,3,3,3,3]
    when 'olympus' then array[3,3,3]
    when 'heist'   then array[3,3,6]
    else null end $$;

-- DIFFERENT ODDS ON EVERY MACHINE
-- Two knobs per machine, both multiply the shared base settings in slots.sql:
--   slots_theme_pay = payback factor. 1.00 = the standard payback (about 88% on tiny bets up to about 96% from 9,000 chips).
--   slots_theme_bon = how often the free spins bonus triggers. 1.00 = standard.
-- Rough payback at big bets (96% x pay x (0.855 + 0.145 x bonus)):
--   HOT   (about 97.9-98.9%): gold, dragon, neon, pirate, viking, west, olympus
--   STANDARD (96%): classic, ocean, candy, jungle, luau, racing, heist
--   COLD  (about 91-95%): frozen, cosmic, egypt, magic, spooky
-- No machine goes above 100%, so the house always keeps an edge.   <== TUNE any number below

create or replace function slots_theme_pay(p_theme text) returns numeric language sql immutable as $$
  select case p_theme
    when 'classic' then 1.00
    when 'gold'    then 1.02
    when 'ocean'   then 1.00
    when 'frozen'  then 0.97
    when 'west'    then 1.00
    when 'dragon'  then 1.03
    when 'cosmic'  then 0.98
    when 'candy'   then 1.00
    when 'viking'  then 1.00
    when 'egypt'   then 0.96
    when 'jungle'  then 1.00
    when 'neon'    then 1.02
    when 'spooky'  then 0.95
    when 'pirate'  then 1.01
    when 'magic'   then 0.98
    when 'luau'    then 1.00
    when 'racing'  then 1.00
    when 'olympus' then 1.02
    when 'heist'   then 1.00
    else 1.00 end $$;

create or replace function slots_theme_bon(p_theme text) returns numeric language sql immutable as $$
  select case p_theme
    when 'west'    then 1.15
    when 'cosmic'  then 1.10
    when 'viking'  then 1.10
    when 'egypt'   then 1.20
    when 'pirate'  then 1.10
    else 1.00 end $$;

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
  if p_bet is null or p_bet<c_min or p_bet>c_max then raise exception 'Bet must be between % and % chips',c_min,c_max; end if;
  mults:=slots_bonus_mults(p_theme); rws:=slots_bonus_rows(p_theme);
  if mults is null or rws is null then raise exception 'Unknown machine, reload the page'; end if;
  len:=array_length(mults,1); c_ret:=c_ret_tot/len; c_fsmax:=len*c_rounds;
  c_bonus_p:=c_bonus_p*12.0/(select sum(tm*tr/3.0) from unnest(mults,rws) as t(tm,tr));
  c_bonus_p:=c_bonus_p*slots_theme_bon(p_theme);   -- each machine has its own bonus frequency
  total:=p_bet; unit:=p_bet/9.0; adj:=slots_adj_bet(p_bet)*slots_theme_pay(p_theme);   -- each machine has its own payback

  select chips into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<total then raise exception 'Not enough chips: you have %, you need %',bal,total; end if;
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

  update profiles set chips=chips-total where id=uid;
  if pay>0 then perform chip_credit(uid,pay); end if;

  fr:=b->'reels';
  for c in 0..4 loop flat:=flat||case when c>0 then '|' else '' end||(fr->c->>0)||','||(fr->c->>1)||','||(fr->c->>2); end loop;
  insert into slot_spins(user_id,bet,reels,kind,payout,denom,lines,cpl,theme) values(uid,total,flat,kind,pay::int,null,9,null,p_theme);
  select chips into nv from profiles where id=uid;
  return jsonb_build_object('reels',b->'reels','kind',kind,'bet',total,'lines',9,'theme',p_theme,'payout',pay,'line_pay',lpay,'wins',b->'wins','scatters',(b->>'scatters')::int,'free',free,'chips',nv);
end $$;

revoke all on function slots_theme_pay(text) from public,anon;
revoke all on function slots_theme_bon(text) from public,anon;
revoke all on function slots_spin(int,text) from public,anon;
grant execute on function slots_spin(int,text) to authenticated;
notify pgrst,'reload schema';
