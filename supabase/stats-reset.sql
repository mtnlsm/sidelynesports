-- Sidelyne Sports: ADMIN RESET STATS. Resets one person's account back to a brand-new player. Safe to re-run.
-- Run in Supabase SQL Editor AFTER admin.sql, stake.sql and daily.sql (slots.sql / props.sql / shop.sql are used if they exist).
-- It checks is_admin() inside the database, so only real admins can use it.
--
-- WHAT IT RESETS (back to 0 / empty):
--   SP balance, lifetime SP (leaderboard + level back to 1), win streak and best streak, the daily SP claim (they can claim again right away),
--   all game picks and Higher/Lower picks (including open ones), all slot spins, blackjack rounds and other casino rounds (casino stats), Sidelyne Chips, old predictions, badges/achievements, and the SP history.
-- WHAT IT KEEPS: username, display name, bio, avatar, banner, posts, comments, follows, favorites, and shop items (flair, OG badge, borders, themes).
--   Pass p_shop=true (the "Also remove shop items" checkbox) to wipe the shop items and equipped flair / border / team theme too.
alter table profiles add column if not exists last_daily_at timestamptz;

create or replace function admin_reset_user(p_user uuid,p_shop boolean default false) returns text language plpgsql security definer set search_path=public as $$
declare t text;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if not exists(select 1 from profiles where id=p_user) then raise exception 'User not found'; end if;

  foreach t in array array['user_picks','prop_picks','slot_spins','bj_rounds','casino_rounds','predictions','user_achievements','nova_transactions'] loop
    if to_regclass('public.'||t) is not null then execute format('delete from public.%I where user_id=$1',t) using p_user; end if;
  end loop;

  -- balance and lifetime SP are zeroed in the SAME update, otherwise the lifetime/level trigger would keep the old lifetime total
  update profiles set novas=0,lifetime_novas=0,level=1,streak=0,best_streak=0,last_daily_at=null where id=p_user;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='chips') then
    execute 'update profiles set chips=0,chips_in=0,chips_out=0 where id=$1' using p_user;   -- Sidelyne Chips (chips.sql)
  end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='saver_spins') then
    execute 'update profiles set saver_spins=0 where id=$1' using p_user;   -- wager saver free spins, if that column exists
  end if;

  if p_shop then
    if to_regclass('public.user_items') is not null then delete from user_items where user_id=p_user; end if;
    update profiles set flair=null,team_theme=null where id=p_user;
    if exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='border') then
      execute 'update profiles set border=null where id=$1' using p_user;
    end if;
  end if;
  return 'Stats reset';
end $$;
revoke all on function admin_reset_user(uuid,boolean) from public,anon;
grant execute on function admin_reset_user(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
