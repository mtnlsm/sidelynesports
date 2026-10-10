-- Sidelyne Sports: LIVE GAME FEED (twitter-style posts, likes, replies) + view counter. Safe to re-run.
-- Run in Supabase SQL Editor. Needs profiles, not_blocked() and is_admin() (schema.sql / admin.sql).

-- 0) Remove the earlier plain-chat table if you ran the first version (harmless if it doesn't exist)
drop table if exists live_chat cascade;

-- 1) Posts (parent_id = null -> a post, parent_id = <post> -> a reply)
create table if not exists live_posts(
  id uuid primary key default gen_random_uuid(),
  game_id text not null check(length(game_id) between 3 and 40),
  user_id uuid not null references profiles(id) on delete cascade,
  parent_id uuid references live_posts(id) on delete cascade,
  body text not null check(length(body) between 1 and 280),
  created_at timestamptz not null default now());
create index if not exists idx_live_posts_game on live_posts(game_id, created_at desc);
create index if not exists idx_live_posts_parent on live_posts(parent_id);
create index if not exists idx_live_posts_user on live_posts(user_id, created_at desc);
alter table live_posts replica identity full;  -- lets realtime deliver deletes

create table if not exists live_post_likes(
  post_id uuid not null references live_posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key(post_id, user_id));
create index if not exists idx_live_post_likes_user on live_post_likes(user_id);

alter table live_posts enable row level security;
alter table live_post_likes enable row level security;
grant select on live_posts, live_post_likes to anon, authenticated;
grant insert, delete on live_posts, live_post_likes to authenticated;

drop policy if exists lp_sel on live_posts;  create policy lp_sel on live_posts for select using(not_blocked(user_id));
drop policy if exists lp_ins on live_posts;  create policy lp_ins on live_posts for insert with check(auth.uid()=user_id);
drop policy if exists lp_del on live_posts;  create policy lp_del on live_posts for delete using(auth.uid()=user_id or is_admin());
drop policy if exists lpl_sel on live_post_likes; create policy lpl_sel on live_post_likes for select using(true);
drop policy if exists lpl_ins on live_post_likes; create policy lpl_ins on live_post_likes for insert with check(auth.uid()=user_id);
drop policy if exists lpl_del on live_post_likes; create policy lpl_del on live_post_likes for delete using(auth.uid()=user_id);

-- Trim, rate limit (1 post per 3 seconds per user), replies must target a top-level post of the same game
create or replace function live_posts_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.body := btrim(new.body);
  if length(new.body) < 1 then raise exception 'Empty post'; end if;
  if exists(select 1 from live_posts where user_id=new.user_id and created_at > now() - interval '3 seconds') then
    raise exception 'Slow down';
  end if;
  if new.parent_id is not null and not exists(select 1 from live_posts p where p.id=new.parent_id and p.game_id=new.game_id and p.parent_id is null) then
    raise exception 'Invalid reply';
  end if;
  return new;
end $$;
drop trigger if exists live_posts_guard_t on live_posts;
create trigger live_posts_guard_t before insert on live_posts for each row execute function live_posts_guard();

do $$ begin alter publication supabase_realtime add table live_posts;
  exception when duplicate_object then null; when undefined_object then null; end $$;

-- 2) View counter (one row per game; no direct table access, only through the functions below)
create table if not exists game_views(
  game_id text primary key check(game_id ~ '^[A-Z0-9]+:[0-9]{3,}$'),
  views bigint not null default 0,
  updated_at timestamptz not null default now());
alter table game_views enable row level security;

create or replace function track_game_view(gid text) returns bigint language plpgsql security definer set search_path=public as $$
declare n bigint;
begin
  if gid is null or gid !~ '^[A-Z0-9]+:[0-9]{3,}$' then raise exception 'bad game id'; end if;
  insert into game_views(game_id, views) values (gid, 1)
    on conflict (game_id) do update set views = game_views.views + 1, updated_at = now()
    returning views into n;
  return n;
end $$;

create or replace function game_view_counts(ids text[]) returns table(game_id text, views bigint)
language sql stable security definer set search_path=public as $$
  select g.game_id, g.views from game_views g where g.game_id = any(ids);
$$;
grant execute on function track_game_view(text) to anon, authenticated;
grant execute on function game_view_counts(text[]) to anon, authenticated;

-- 3) Optional cleanup (run manually or schedule with pg_cron):
--   delete from live_posts where created_at < now() - interval '3 days';

notify pgrst,'reload schema';
