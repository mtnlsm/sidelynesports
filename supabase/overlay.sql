-- Sidelyne Sports: stream overlay support. Safe to re-run. Run in Supabase SQL Editor.
-- Picks are private (RLS: you can only read your own), and an OBS browser source is anonymous, so the overlay
-- reads a pick through a secret per-user key instead. The key lives in its own table that nobody can read directly.

create table if not exists overlay_keys(
  user_id uuid primary key references profiles(id) on delete cascade,
  key uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now());
alter table overlay_keys enable row level security;            -- no policies + no grants = only the functions below can touch it
revoke all on overlay_keys from anon, authenticated;

-- Signed-in user fetches (or resets) their own overlay key. Resetting invalidates every link they shared.
create or replace function my_overlay_key(p_reset boolean default false) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid := auth.uid(); k uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_reset then
    insert into overlay_keys(user_id) values (uid)
      on conflict (user_id) do update set key = gen_random_uuid(), created_at = now()
      returning key into k;
  else
    insert into overlay_keys(user_id) values (uid) on conflict (user_id) do nothing;
    select o.key into k from overlay_keys o where o.user_id = uid;
  end if;
  return k;
end $$;
revoke execute on function my_overlay_key(boolean) from public, anon;
grant execute on function my_overlay_key(boolean) to authenticated;

-- The overlay (anonymous) asks: "what is the owner of this key picking on this game?"
-- Returns only the display name/avatar and that one pick. Nothing else about the account is exposed.
create or replace function overlay_pick(p_key uuid, p_game text) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare uid uuid; pr record; up record; gm record; usr jsonb;
begin
  if p_key is null or coalesce(length(p_game),0) not between 1 and 80 then return null; end if;
  select o.user_id into uid from overlay_keys o where o.key = p_key;
  if uid is null then return null; end if;

  select username, display_name, avatar_url into pr from profiles where id = uid;
  usr := jsonb_build_object('username', pr.username, 'name', coalesce(pr.display_name, pr.username), 'avatar', pr.avatar_url);

  select u.pick, u.stake, u.mult, u.matchup, u.result, u.awarded into up
    from user_picks u where u.user_id = uid and u.game_id = p_game;
  if not found then return jsonb_build_object('user', usr, 'pick', null); end if;

  select g.a, g.b into gm from game_odds g where g.game_id = p_game;   -- lets the overlay know which side (away=a, home=b) was picked
  return jsonb_build_object('user', usr, 'pick', jsonb_build_object(
    'team', up.pick, 'stake', coalesce(up.stake, 0), 'mult', up.mult, 'matchup', up.matchup,
    'result', up.result, 'awarded', up.awarded,
    'side', case when gm.a is not null and up.pick = gm.a then 'a' when gm.b is not null and up.pick = gm.b then 'b' end));
end $$;
grant execute on function overlay_pick(uuid, text) to anon, authenticated;

notify pgrst,'reload schema';
