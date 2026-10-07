-- Sidelyne Sports social upgrade: username profile links (/@username), follow, people search, comments.
-- Safe to re-run. Run in Supabase SQL Editor. Does NOT require re-running schema.sql / admin.sql.

-- 1) Fast people search (username / display name) + fast follow lookups
create extension if not exists pg_trgm;
create index if not exists idx_profiles_username_trgm on profiles using gin (username gin_trgm_ops);
create index if not exists idx_profiles_dname_trgm    on profiles using gin (display_name gin_trgm_ops);
create index if not exists idx_follows_followee on follows(followee);
create index if not exists idx_follows_follower on follows(follower);
create index if not exists idx_comments_post_created on comments(post_id, created_at);
create index if not exists idx_comments_user on comments(user_id);

-- 2) Live comment updates
do $$ begin alter publication supabase_realtime add table comments;
  exception when duplicate_object then null; when undefined_object then null; end $$;

-- 3) Username links must never break: lock usernames once a profile is set up, and block reserved names
create or replace function guard_username() returns trigger language plpgsql as $$
begin
  if tg_op='UPDATE' and new.username is distinct from old.username and old.onboarded then
    raise exception 'Username cannot be changed';
  end if;
  if (tg_op='INSERT' or new.username is distinct from old.username)
     and new.username in ('you','me','u','admin','fanova','sidelyne','sidelynesports','sidelyne_sports','support','mod','api','login','signup','settings','index') then
    raise exception 'That username is reserved';
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_username on profiles;
create trigger profiles_guard_username before insert or update of username on profiles
  for each row execute function guard_username();

-- 4) Make sure profiles/follows/comments are readable and writable the right way
grant select on profiles to anon, authenticated;
alter table profiles enable row level security;
alter table follows  enable row level security;
alter table comments enable row level security;
drop policy if exists r_prof on profiles;  create policy r_prof on profiles for select using(true);
drop policy if exists f_sel  on follows;   create policy f_sel  on follows  for select using(true);
drop policy if exists f_ins  on follows;   create policy f_ins  on follows  for insert with check(auth.uid()=follower);
drop policy if exists f_del  on follows;   create policy f_del  on follows  for delete using(auth.uid()=follower);
drop policy if exists c_sel  on comments;  create policy c_sel  on comments for select using(not_blocked(user_id));
drop policy if exists c_ins  on comments;  create policy c_ins  on comments for insert with check(auth.uid()=user_id);
drop policy if exists c_del  on comments;  create policy c_del  on comments for delete using(auth.uid()=user_id);

notify pgrst,'reload schema';
