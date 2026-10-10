-- Sidelyne Sports: MULTIPLE LEADERBOARDS. Safe to re-run.
-- Run in Supabase SQL Editor AFTER stats.sql (needs stat_net, user_picks and profiles.hide_stats).
-- Returns pick totals per player for the Ranks tab (Wins, Win rate, Profit). Totals only, no pick-by-pick data.
-- Players who turned on "Hide my stats" and admins are left out of those boards.
create or replace function board_stats() returns table(id uuid, wins int, losses int, net bigint)
language sql stable security definer set search_path=public as $$
  select p.id,
         (count(*) filter (where u.result='win'))::int,
         (count(*) filter (where u.result='loss'))::int,
         coalesce(sum(stat_net(u.result,u.stake,u.awarded)),0)::bigint
  from profiles p join user_picks u on u.user_id=p.id
  where p.onboarded and coalesce(p.hide_stats,false)=false and coalesce(p.role,'')<>'admin'
  group by p.id
$$;
grant execute on function board_stats() to anon, authenticated;
