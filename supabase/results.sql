-- Sidelyne Sports results fix: makes sure pick payouts work and keeps finished games visible for 36 hours.
-- Safe to re-run. Run in Supabase SQL Editor AFTER saves.sql. (Includes everything from settle_picks.sql, so run this even if you skipped it.)

-- 1) Columns the payout code writes to (if settle_picks.sql was never run, payouts silently failed without these)
alter table user_picks add column if not exists result text check(result in('win','loss','void'));
alter table user_picks add column if not exists awarded int;
alter table user_picks add column if not exists settled_at timestamptz;
create index if not exists idx_user_picks_open on user_picks(game_id) where settled_at is null;

-- 2) Finished games are remembered here (filled by the settle-games function) so they stay on the site after ESPN drops them
create table if not exists finished_games(
  game_id text primary key, sport text, a text, b text, sa text, sb text,
  game_date timestamptz, winner text not null, finished_at timestamptz not null default now());
create index if not exists idx_finished_games_at on finished_games(finished_at desc);
alter table finished_games enable row level security;
drop policy if exists fg_sel on finished_games; create policy fg_sel on finished_games for select using(true);
grant select on finished_games to anon, authenticated;

-- 3) Pick payouts: +250 SP correct, +50 SP wrong/draw. A settled pick can no longer be changed.
create or replace function save_pick(p_game text,p_sport text,p_pick text,p_matchup text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); is_new boolean; awarded int:=0; todays int; nv int;
begin
 if uid is null then raise exception 'Not signed in'; end if;
 if coalesce(length(p_game),0) not between 1 and 80 or coalesce(length(p_pick),0) not between 1 and 100 then raise exception 'Invalid pick'; end if;
 insert into user_picks(user_id,game_id,sport,pick,matchup) values(uid,p_game,left(p_sport,10),p_pick,left(p_matchup,200))
  on conflict(user_id,game_id) do update set pick=excluded.pick,updated_at=now() where user_picks.settled_at is null
  returning (xmax=0) into is_new;
 if is_new then
  select count(*) into todays from nova_transactions where user_id=uid and reason='Pick submitted' and created_at>=date_trunc('day',now());
  if todays<20 then
   insert into nova_transactions(user_id,amount,reason,ref) values(uid,25,'Pick submitted',p_game) on conflict do nothing;
   if found then awarded:=25; update profiles set novas=novas+25 where id=uid; end if;
  end if;
 end if;
 update profiles set level=level_for(novas) where id=uid returning novas into nv;
 perform sync_badges();
 return jsonb_build_object('novas',nv,'awarded',awarded);
end $$;

create or replace function settle_game(p_game text,p_winner text,p_start timestamptz) returns int language plpgsql security definer set search_path=public as $$
declare r record; n int:=0; ok boolean; amt int;
begin
 for r in select * from user_picks where game_id=p_game and settled_at is null for update loop
  if p_start is not null and r.updated_at>p_start then
   update user_picks set result='void',awarded=0,settled_at=now() where user_id=r.user_id and game_id=r.game_id;
   continue;
  end if;
  ok:=(r.pick=p_winner); amt:=case when ok then 250 else 50 end;
  update user_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and game_id=r.game_id;
  insert into nova_transactions(user_id,amount,reason,ref) values(r.user_id,amt,case when ok then 'Correct pick' else 'Pick played' end,p_game) on conflict do nothing;
  if found then
   update profiles set novas=novas+amt,streak=case when ok then streak+1 else 0 end,best_streak=greatest(best_streak,case when ok then streak+1 else streak end) where id=r.user_id;
   update profiles set level=level_for(novas) where id=r.user_id;
   n:=n+1;
  end if;
 end loop;
 return n;
end $$;
revoke all on function settle_game(text,text,timestamptz) from public,anon,authenticated;
grant execute on function settle_game(text,text,timestamptz) to service_role;

notify pgrst,'reload schema';
