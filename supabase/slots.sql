-- Sidelyne Sports: SLOTS (5 reels x 3 rows, 9 paylines). Three or more Sidelyne logos anywhere = the Sidelyne bonus (always 1,000 SP).
-- Run in Supabase SQL Editor AFTER stake.sql (it uses sp_credit from there). Safe to re-run. Replaces the old 3-reel version.
-- Every spin is decided here on the server (the app only plays the animation), so the odds can't be tampered with.
--
-- LINE PAYS: a line wins when 3, 4 or 5 matching symbols run left to right from reel 1 on that payline.
--   Your bet is split over the 9 lines (line stake = bet / 9). Each winning line pays line stake x the multiplier below.
--   Paylines (row 0 = top, 1 = middle, 2 = bottom):
--     Middle row, Top row, Bottom row, V shape, Peak (inverted V), Step down, Step up, Arch, Bowl
--   Multipliers of the line stake (3 / 4 / 5 of a kind):
--     soccer 8/22/70  ufc 10/28/100  nhl 14/40/140  mlb 18/50/200  nba 22/70/300  nfl 34/110/500
-- SCATTER: 3+ Sidelynes anywhere = bonus, ALWAYS +1,000 SP (and any line wins on the same spin are paid too).
--   Chance is 0.6% per 25 SP of bet (25 bet = 0.6%, 100 bet = 2.4%).
-- Return to player is about 87% (SP slowly drains from slots). Tune the numbers marked <== TUNE.

create table if not exists slot_spins(
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  bet int not null, reels text not null, kind text not null, payout int not null,
  created_at timestamptz not null default now());
create index if not exists idx_slot_spins_user on slot_spins(user_id,created_at desc);
alter table slot_spins enable row level security;
drop policy if exists ss_sel on slot_spins;
create policy ss_sel on slot_spins for select using(auth.uid()=user_id);
grant select on slot_spins to authenticated;

create or replace function slots_mult(p_sym text,p_n int) returns int language sql immutable as $$
  select case p_sym
    when 'soccer' then (array[8,22,70])[p_n-2]
    when 'ufc'    then (array[10,28,100])[p_n-2]
    when 'nhl'    then (array[14,40,140])[p_n-2]
    when 'mlb'    then (array[18,50,200])[p_n-2]
    when 'nba'    then (array[22,70,300])[p_n-2]
    when 'nfl'    then (array[34,110,500])[p_n-2]
    else 0 end $$;   -- <== TUNE: the pay table

create or replace function slots_spin(p_bet int) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_bonus   constant int:=1000;          -- <== TUNE: the Sidelyne bonus (always this amount)
  c_bonus_p constant numeric:=0.006;     -- <== TUNE: bonus chance per 25 SP of bet
  c_tease   constant numeric:=0.12;      -- <== TUNE: how often a losing/normal spin shows 2 Sidelynes as a tease
  pool constant text[]:=array['soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','soccer','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','ufc','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','nhl','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','mlb','nba','nba','nba','nba','nba','nba','nba','nba','nba','nba','nba','nba','nfl','nfl','nfl','nfl','nfl','nfl','nfl','nfl','nfl','nfl'];   -- <== TUNE: symbol weights (more copies = more common)
  lines constant int[]:=array[[1,1,1,1,1],[0,0,0,0,0],[2,2,2,2,2],[0,1,2,1,0],[2,1,0,1,2],[0,0,1,2,2],[2,2,1,0,0],[1,0,0,0,1],[1,2,2,2,1]];
  bal int; roll numeric:=random(); pb numeric; kind text; pay int:=0; lp int; mult int;
  g text[]:=array_fill('x'::text,array[5,3]);   -- g[reel][row], reel 1..5, row 1..3 (top to bottom)
  c int; r int; i int; n int; base text; cols int[]; wins jsonb:='[]'::jsonb; reels jsonb:='[]'::jsonb; scat int:=0;
  nv int; last timestamptz; flat text:='';
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_bet not in(25,50,100,250) then raise exception 'Bet must be 25, 50, 100 or 250 SP'; end if;

  select novas into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_bet then raise exception 'Not enough SP: you have %, you need %',bal,p_bet; end if;
  select max(created_at) into last from slot_spins where user_id=uid;
  if last is not null and last>now()-interval '1 second' then raise exception 'Slow down'; end if;

  pb:=c_bonus_p*p_bet/25.0;
  for c in 1..5 loop for r in 1..3 loop g[c][r]:=pool[1+floor(random()*array_length(pool,1))::int]; end loop; end loop;

  if roll<pb then
    kind:='bonus'; cols:=(select array_agg(x) from (select x from generate_series(1,5) x order by random() limit 3) q);
    foreach c in array cols loop g[c][1+floor(random()*3)::int]:='S'; end loop;
  elsif random()<c_tease then
    cols:=(select array_agg(x) from (select x from generate_series(1,5) x order by random() limit 2) q);
    foreach c in array cols loop g[c][1+floor(random()*3)::int]:='S'; end loop;
  end if;

  -- line pays (left to right from reel 1)
  for i in 1..9 loop
    base:=g[1][lines[i][1]+1];
    continue when base='S';
    n:=1;
    while n<5 and g[n+1][lines[i][n+1]+1]=base loop n:=n+1; end loop;
    if n>=3 then
      mult:=slots_mult(base,n); lp:=round(p_bet*mult/9.0)::int; pay:=pay+lp;
      wins:=wins||jsonb_build_array(jsonb_build_object('line',i-1,'sym',base,'count',n,'pay',lp));
    end if;
  end loop;
  if kind='bonus' then pay:=pay+c_bonus; elsif pay>0 then kind:='lines'; else kind:='lose'; end if;

  update profiles set novas=novas-p_bet where id=uid;
  insert into nova_transactions(user_id,amount,reason,ref) values(uid,-p_bet,'Slots spin',gen_random_uuid()::text);
  if pay>0 then perform sp_credit(uid,pay,least(p_bet,pay),'Slots win',gen_random_uuid()::text); end if;

  for c in 1..5 loop
    reels:=reels||jsonb_build_array(jsonb_build_array(g[c][1],g[c][2],g[c][3]));
    flat:=flat||case when c>1 then '|' else '' end||g[c][1]||','||g[c][2]||','||g[c][3];
    for r in 1..3 loop if g[c][r]='S' then scat:=scat+1; end if; end loop;
  end loop;
  insert into slot_spins(user_id,bet,reels,kind,payout) values(uid,p_bet,flat,kind,pay);
  select novas into nv from profiles where id=uid;
  return jsonb_build_object('reels',reels,'kind',kind,'bet',p_bet,'payout',pay,'wins',wins,'scatters',scat,'novas',nv);
end $$;

revoke all on function slots_mult(text,int) from public,anon;
revoke all on function slots_spin(int) from public,anon;
grant execute on function slots_spin(int) to authenticated;
notify pgrst,'reload schema';
