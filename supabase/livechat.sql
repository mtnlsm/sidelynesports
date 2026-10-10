-- Sidelyne Sports: live game chat + view counter. Safe to re-run. Run in Supabase SQL Editor.
-- Needs the existing profiles table, not_blocked() and is_admin() (from schema.sql / admin.sql).

-- 1) Chat messages
create table if not exists live_chat(
  id bigint generated always as identity primary key,
  game_id text not null check(length(game_id) between 3 and 40),
  user_id uuid not null references profiles(id) on delete cascade,
  body text not null check(length(body) between 1 and 300),
  created_at timestamptz not null default now());
create index if not exists idx_live_chat_game on live_chat(game_id, id desc);
create index if not exists idx_live_chat_user on live_chat(user_id, created_at desc);

alter table live_chat enable row level security;
grant select on live_chat to anon, authenticated;
grant insert, delete on live_chat to authenticated;
drop policy if exists lc_sel on live_chat; create policy lc_sel on live_chat for select using(not_blocked(user_id));
drop policy if exists lc_ins on live_chat; create policy lc_ins on live_chat for insert with check(auth.uid()=user_id);
drop policy if exists lc_del on live_chat; create policy lc_del on live_chat for delete using(auth.uid()=user_id or is_admin());

-- Trim + 1 message per 2 seconds per user
create or replace function live_chat_guard() returns trigger language plpgsql security definer set search_path=public as $$
begin
  new.body := btrim(new.body);
  if length(new.body) < 1 then raise exception 'Empty message'; end if;
  if exists(select 1 from live_chat where user_id=new.user_id and created_at > now() - interval '2 seconds') then
    raise exception 'Slow down';
  end if;
  return new;
end $$;
drop trigger if exists live_chat_guard_t on live_chat;
create trigger live_chat_guard_t before insert on live_chat for each row execute function live_chat_guard();

do $$ begin alter publication supabase_realtime add table live_chat;
  exception when duplicate_object then null; when undefined_object then null; end $$;

-- 2) View counter (one row per game, no direct table access; only through the functions below)
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

-- 3) Optional cleanup of old chat (run manually, or schedule with pg_cron):
--   delete from live_chat where created_at < now() - interval '3 days';

notify pgrst,'reload schema';
