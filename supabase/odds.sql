-- Sidelyne Sports: ODDS-BASED PAYOUTS for game picks. Run in the Supabase SQL Editor AFTER stake.sql. Safe to re-run.
-- Run it again after any re-run of stake.sql / saves.sql / results.sql (they redefine save_pick / settle_game).
--   A winning pick pays  stake x multiplier  (the TOTAL you get back, stake included).
--   multiplier = the picked side's moneyline as a decimal: -200 -> 1.50, +150 -> 2.50, +100 -> 2.00. Favorites pay less, underdogs pay more.
--   No line from ESPN (UFC/MMA, some games), or a Draw pick: 2.00 like before.
--   The line is locked in when you bet (raising your stake keeps it; switching sides re-prices). Lines come from the server, never the browser.
create table if not exists game_odds(game_id text primary key,a text,b text,a_ml int,b_ml int,updated_at timestamptz default now());
alter table game_odds enable row level security;
alter table user_picks add column if not exists mult numeric;

create or replace function odds_mult(p_ml int) returns numeric language sql immutable as $f$
  select case when p_ml is null or p_ml=0 then null
    when p_ml>0 then least(21,1+p_ml/100.0) else greatest(1.01,least(21,1+100.0/(-p_ml))) end $f$;

create or replace function save_pick(p_game text,p_sport text,p_pick text,p_matchup text,p_stake int default 10) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_min constant int:=1;      -- <== TUNE: minimum stake
  c_max constant int:=1000000;   -- <== TUNE: maximum stake (balance is the real limit, so all-in always works)
  gm game_odds%rowtype; ml int; mu numeric; bal int; ex user_picks%rowtype; have boolean; eff int; diff int; nv int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if coalesce(length(p_game),0) not between 1 and 80 or coalesce(length(p_pick),0) not between 1 and 100 then raise exception 'Invalid pick'; end if;
  p_stake:=coalesce(p_stake,c_min);
  if p_stake<c_min or p_stake>c_max then raise exception 'Stake must be between % and % SP',c_min,c_max; end if;

  select novas into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;

  select * into ex from user_picks where user_id=uid and game_id=p_game for update;
  have:=found;
  if have and ex.settled_at is not null then raise exception 'This pick is already settled'; end if;

  -- payout multiplier: locked in from the real moneyline the first time you bet on a side; keeps if you only raise the stake
  if have and ex.pick=p_pick and ex.mult is not null then mu:=ex.mult;
  else
    select * into gm from game_odds where game_id=p_game;
    ml:=case when not found then null when p_pick=gm.a then gm.a_ml when p_pick=gm.b then gm.b_ml end;
    mu:=coalesce(odds_mult(ml),2);
  end if;

  eff:=case when have and ex.stake>0 then greatest(ex.stake,p_stake) else p_stake end;   -- can raise, never lower
  diff:=eff-case when have then ex.stake else 0 end;                                     -- only the extra is charged
  if diff>bal then raise exception 'Not enough SP: you have %, you need %',bal,diff; end if;

  if diff>0 then
    update profiles set novas=novas-diff where id=uid;
    insert into nova_transactions(user_id,amount,reason,ref) values(uid,-diff,'Pick stake',gen_random_uuid()::text);
  end if;

  if have then
    update user_picks set pick=p_pick,stake=eff,mult=mu,updated_at=now() where user_id=uid and game_id=p_game;
  else
    insert into user_picks(user_id,game_id,sport,pick,matchup,stake,mult) values(uid,p_game,left(p_sport,10),p_pick,left(p_matchup,200),eff,mu);
  end if;

  select novas into nv from profiles where id=uid;
  perform sync_badges();
  return jsonb_build_object('novas',nv,'awarded',0,'stake',eff,'charged',diff,'mult',mu);
end $$;

create or replace function settle_game(p_game text,p_winner text,p_start timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare
  c_mult constant int:=2;     -- <== TUNE: a win returns stake x this
  r record; n int:=0; ok boolean; amt int;
begin
  for r in select * from user_picks where game_id=p_game and settled_at is null for update loop
    -- picked/changed after the game started, or a draw: stake goes back
    if (p_start is not null and r.updated_at>p_start) or (p_winner='Draw' and r.stake>0) then
      update user_picks set result='void',awarded=r.stake,settled_at=now() where user_id=r.user_id and game_id=r.game_id;
      perform sp_credit(r.user_id,r.stake,r.stake,'Pick refunded',p_game);
      continue;
    end if;
    ok:=(r.pick=p_winner);
    if r.stake=0 then
      -- old pick from before stakes existed: old payout (+250 right / +50 wrong or draw)
      amt:=case when ok then 250 else 50 end;
      update user_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and game_id=r.game_id;
      perform sp_credit(r.user_id,amt,0,case when ok then 'Correct pick' else 'Pick played' end,p_game);
    else
      amt:=case when ok then greatest(round(r.stake*coalesce(r.mult,c_mult))::int,r.stake) else 0 end;
      update user_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and game_id=r.game_id;
      if ok then perform sp_credit(r.user_id,amt,r.stake,'Correct pick',p_game); end if;
    end if;
    update profiles set streak=case when ok then streak+1 else 0 end,
      best_streak=greatest(best_streak,case when ok then streak+1 else streak end) where id=r.user_id;
    n:=n+1;
  end loop;
  return n;
end $$;

revoke all on function save_pick(text,text,text,text,int) from public,anon;
grant execute on function save_pick(text,text,text,text,int) to authenticated;
revoke all on function settle_game(text,text,timestamptz) from public,anon,authenticated;
grant execute on function settle_game(text,text,timestamptz) to service_role;
