-- Sidelyne Sports: STAKES. Every pick now costs SP up front (default 25). Put down more for a bigger win.
-- Run in Supabase SQL Editor AFTER schema.sql, admin.sql, saves.sql, results.sql (or settle_picks.sql), props.sql and shop.sql.
-- Safe to re-run. If you ever re-run saves.sql / results.sql / props.sql / shop.sql, run this file again last
-- (those files redefine save_pick / settle_game / settle_prop and would undo the stake rules).
--
-- RULES (change the three numbers marked  <== TUNE  in the functions below if you want different ones)
--   Stake:   minimum 25 SP (default), maximum 1,000,000 SP per pick (effectively: all-in). You must have the SP. It is taken the moment you pick.
--   Raise:   you can raise your stake on a pick before the game starts (you pay the difference). You can't lower it.
--   Win:     you get stake x 2 back (stake back + the same amount again as profit).
--   Loss:    you lose the stake.
--   Push:    a draw, a voided pick (changed after the game started) or a cancelled prop gives the stake back.
--   Old picks made before this file was run have no stake and still pay the old rules (+250/+50 games, +150/+25 props).
--   The old "+25 SP just for picking" reward is gone (it would cancel out the stake).
--   Level / badges follow lifetime SP, and only your PROFIT counts toward it (getting your own stake back doesn't level you up).

-- ============ 1) COLUMNS ============
alter table user_picks add column if not exists stake int not null default 0 check(stake>=0);
alter table prop_picks add column if not exists stake int not null default 0 check(stake>=0);
alter table profiles   add column if not exists lifetime_novas int not null default 0;

-- ============ 2) LEVEL TRACKING: ignore the part of a payout that is just your own stake coming back ============
create or replace function profiles_track_lifetime() returns trigger language plpgsql as $$
declare skip int:=coalesce(nullif(current_setting('sidelyne.life_skip',true),''),'0')::int;
begin
  if new.novas>old.novas then
    new.lifetime_novas:=greatest(coalesce(old.lifetime_novas,0),old.novas)+greatest(new.novas-old.novas-skip,0);
  end if;
  new.lifetime_novas:=greatest(coalesce(new.lifetime_novas,0),new.novas);
  new.level:=level_for(new.lifetime_novas);
  return new;
end $$;
drop trigger if exists profiles_lifetime on profiles;
create trigger profiles_lifetime before update on profiles for each row execute function profiles_track_lifetime();

-- ============ 3) INTERNAL HELPERS ============
-- Give SP to a user once (the unique(user_id,reason,ref) key makes it impossible to pay twice).
-- p_skip = how much of p_amount is the user's own stake coming back (doesn't count toward level).
create or replace function sp_credit(p_uid uuid,p_amount int,p_skip int,p_reason text,p_ref text) returns boolean language plpgsql security definer set search_path=public as $$
begin
  if coalesce(p_amount,0)<=0 then return false; end if;
  insert into nova_transactions(user_id,amount,reason,ref) values(p_uid,p_amount,p_reason,p_ref) on conflict do nothing;
  if not found then return false; end if;
  perform set_config('sidelyne.life_skip',greatest(coalesce(p_skip,0),0)::text,true);
  update profiles set novas=novas+p_amount where id=p_uid;
  perform set_config('sidelyne.life_skip','0',true);
  return true;
end $$;
revoke all on function sp_credit(uuid,int,int,text,text) from public,anon,authenticated;

-- ============ 4) GAME PICKS ============
drop function if exists save_pick(text,text,text,text);
create or replace function save_pick(p_game text,p_sport text,p_pick text,p_matchup text,p_stake int default 25) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_min constant int:=25;     -- <== TUNE: minimum stake
  c_max constant int:=1000000;   -- <== TUNE: maximum stake (balance is the real limit, so all-in always works)
  bal int; ex user_picks%rowtype; have boolean; eff int; diff int; nv int;
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

  eff:=case when have and ex.stake>0 then greatest(ex.stake,p_stake) else p_stake end;   -- can raise, never lower
  diff:=eff-case when have then ex.stake else 0 end;                                     -- only the extra is charged
  if diff>bal then raise exception 'Not enough SP: you have %, you need %',bal,diff; end if;

  if diff>0 then
    update profiles set novas=novas-diff where id=uid;
    insert into nova_transactions(user_id,amount,reason,ref) values(uid,-diff,'Pick stake',gen_random_uuid()::text);
  end if;

  if have then
    update user_picks set pick=p_pick,stake=eff,updated_at=now() where user_id=uid and game_id=p_game;
  else
    insert into user_picks(user_id,game_id,sport,pick,matchup,stake) values(uid,p_game,left(p_sport,10),p_pick,left(p_matchup,200),eff);
  end if;

  select novas into nv from profiles where id=uid;
  perform sync_badges();
  return jsonb_build_object('novas',nv,'awarded',0,'stake',eff,'charged',diff);
end $$;

-- Called by the settle-games function once a game is final. Runs once per pick.
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
      amt:=case when ok then r.stake*c_mult else 0 end;
      update user_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and game_id=r.game_id;
      if ok then perform sp_credit(r.user_id,amt,r.stake,'Correct pick',p_game); end if;
    end if;
    update profiles set streak=case when ok then streak+1 else 0 end,
      best_streak=greatest(best_streak,case when ok then streak+1 else streak end) where id=r.user_id;
    n:=n+1;
  end loop;
  return n;
end $$;

-- ============ 5) HIGHER / LOWER PICKS ============
drop function if exists save_prop_pick(text,text);
create or replace function save_prop_pick(p_prop text,p_choice text,p_stake int default 25) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_min constant int:=25;     -- <== TUNE: minimum stake
  c_max constant int:=1000000;   -- <== TUNE: maximum stake (balance is the real limit, so all-in always works)
  pr props; bal int; ex prop_picks%rowtype; have boolean; eff int; diff int; nv int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_choice not in('higher','lower') then raise exception 'Invalid pick'; end if;
  p_stake:=coalesce(p_stake,c_min);
  if p_stake<c_min or p_stake>c_max then raise exception 'Stake must be between % and % SP',c_min,c_max; end if;
  select * into pr from props where id=p_prop;
  if not found or pr.status<>'open' or pr.starts_at<=now() then raise exception 'This pick is locked'; end if;

  select novas into bal from profiles where id=uid for update;
  if bal is null then raise exception 'Profile not found'; end if;

  select * into ex from prop_picks where user_id=uid and prop_id=p_prop for update;
  have:=found;
  if have and ex.settled_at is not null then raise exception 'This pick is already settled'; end if;

  eff:=case when have and ex.stake>0 then greatest(ex.stake,p_stake) else p_stake end;
  diff:=eff-case when have then ex.stake else 0 end;
  if diff>bal then raise exception 'Not enough SP: you have %, you need %',bal,diff; end if;

  if diff>0 then
    update profiles set novas=novas-diff where id=uid;
    insert into nova_transactions(user_id,amount,reason,ref) values(uid,-diff,'Prop stake',gen_random_uuid()::text);
  end if;

  if have then
    update prop_picks set choice=p_choice,stake=eff,updated_at=now() where user_id=uid and prop_id=p_prop;
  else
    insert into prop_picks(user_id,prop_id,choice,stake) values(uid,p_prop,p_choice,eff);
  end if;

  select novas into nv from profiles where id=uid;
  return jsonb_build_object('novas',nv,'awarded',0,'stake',eff,'charged',diff);
end $$;

-- Settle one prop with the real stat. Called by the props function, or by you:  select settle_prop('<prop id>', 63);
create or replace function settle_prop(p_prop text,p_actual numeric) returns int language plpgsql security definer set search_path=public as $$
declare
  c_mult constant int:=2;     -- <== TUNE: a win returns stake x this
  pr props; r record; n int:=0; ok boolean; amt int;
begin
  select * into pr from props where id=p_prop for update;
  if not found or pr.status<>'open' then return 0; end if;
  update props set actual=p_actual,status='settled' where id=p_prop;
  for r in select * from prop_picks where prop_id=p_prop and settled_at is null for update loop
    -- equal to the line, or changed after the game started: stake goes back
    if (r.updated_at>pr.starts_at or p_actual=pr.line) then
      update prop_picks set result='void',awarded=r.stake,settled_at=now() where user_id=r.user_id and prop_id=p_prop;
      perform sp_credit(r.user_id,r.stake,r.stake,'Prop refunded',p_prop);
      continue;
    end if;
    ok:=(r.choice='higher')=(p_actual>pr.line);
    if r.stake=0 then
      amt:=case when ok then 150 else 25 end;
      update prop_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and prop_id=p_prop;
      perform sp_credit(r.user_id,amt,0,case when ok then 'Correct prop' else 'Prop played' end,p_prop);
    else
      amt:=case when ok then r.stake*c_mult else 0 end;
      update prop_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and prop_id=p_prop;
      if ok then perform sp_credit(r.user_id,amt,r.stake,'Correct prop',p_prop); end if;
    end if;
    update profiles set streak=case when ok then streak+1 else 0 end,
      best_streak=greatest(best_streak,case when ok then streak+1 else streak end) where id=r.user_id;
    n:=n+1;
  end loop;
  return n;
end $$;

-- Cancel a prop (player did not play, fight cancelled): picks become void and stakes are refunded.  select void_prop('<prop id>');
create or replace function void_prop(p_prop text) returns int language plpgsql security definer set search_path=public as $$
declare r record; n int:=0;
begin
  update props set status='void' where id=p_prop and status='open';
  if not found then return 0; end if;
  for r in select * from prop_picks where prop_id=p_prop and settled_at is null for update loop
    update prop_picks set result='void',awarded=r.stake,settled_at=now() where user_id=r.user_id and prop_id=p_prop;
    perform sp_credit(r.user_id,r.stake,r.stake,'Prop refunded',p_prop);
    n:=n+1;
  end loop;
  return n;
end $$;


-- ============ 5b) SETTLE UFC / PFL HIGHER-LOWER PROPS BY HAND ============
-- UFC/PFL props are not settled automatically (the stats feed only covers team sports). After a fight, run for each stat:
--   select settle_props_where('<game id>','<fighter name>','sigStrikes',52);
--   stat keys: sigStrikes, takedowns, knockdowns, submissionAttempts.  Game id looks like 'UFC:401234567' (see the props table).
--   Fighter did not fight / card cancelled:  select void_prop(id) from props where game_id='<game id>' and status='open';
create or replace function settle_props_where(p_game text,p_subject text,p_stat text,p_actual numeric) returns int language plpgsql security definer set search_path=public as $$
declare r record; n int:=0;
begin
  for r in select id from props where game_id=p_game and status='open' and stat=p_stat
           and regexp_replace(lower(subject),'[^a-z]','','g')=regexp_replace(lower(p_subject),'[^a-z]','','g') loop
    n:=n+settle_prop(r.id,p_actual);
  end loop;
  return n;
end $$;
revoke all on function settle_props_where(text,text,text,numeric) from public,anon,authenticated;
grant execute on function settle_props_where(text,text,text,numeric) to service_role;

-- ============ 6) PERMISSIONS ============
revoke all on function save_pick(text,text,text,text,int) from public,anon;
grant execute on function save_pick(text,text,text,text,int) to authenticated;
revoke all on function save_prop_pick(text,text,int) from public,anon;
grant execute on function save_prop_pick(text,text,int) to authenticated;
revoke all on function settle_game(text,text,timestamptz) from public,anon,authenticated;
grant execute on function settle_game(text,text,timestamptz) to service_role;
revoke all on function settle_prop(text,numeric) from public,anon,authenticated;
grant execute on function settle_prop(text,numeric) to service_role;
revoke all on function void_prop(text) from public,anon,authenticated;
grant execute on function void_prop(text) to service_role;

notify pgrst,'reload schema';

-- ============ CHECK (run this on its own after the file above) ============
-- All three should say true. If any says false or errors, the stake version is not installed yet.
-- select (select prosrc like '%c_mult%' from pg_proc where proname='settle_prop') as settle_prop_ok,
--        (select prosrc like '%p_stake%' from pg_proc where proname='save_prop_pick') as save_prop_pick_ok,
--        exists(select 1 from information_schema.columns where table_name='prop_picks' and column_name='stake') as stake_column_ok;
