-- Sidelyne Sports admin setup. Safe to re-run. Run in Supabase SQL Editor AFTER schema.sql.
-- (If you ever re-run schema.sql, run this file again: schema.sql drops all public policies.)

-- 1) Role column (users can NOT edit it: schema.sql only grants update on safe columns)
alter table profiles add column if not exists role text not null default 'user';
do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_role_check') then
    alter table profiles add constraint profiles_role_check check(role in('user','admin'));
  end if;
end $$;
revoke update(role) on profiles from authenticated, anon;

-- 2) Admin check used by policies
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from profiles where id=auth.uid() and role='admin') $$;
grant execute on function is_admin() to authenticated;

-- 3) officialdev222@outlook.com becomes admin automatically when that email signs up
--    (only once the email is confirmed, so nobody can claim it without owning the inbox)
create or replace function promote_owner_admin() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if lower(new.email)='officialdev222@outlook.com' and new.email_confirmed_at is not null then
    update profiles set role='admin' where id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists on_auth_user_promote_admin on auth.users;
create trigger on_auth_user_promote_admin after insert or update of email_confirmed_at on auth.users
  for each row execute function promote_owner_admin();

-- If that account already exists, promote it now
update profiles set role='admin'
  where id in (select id from auth.users where lower(email)='officialdev222@outlook.com' and email_confirmed_at is not null);

-- 4) Admin-only powers (enforced by the database, not just hidden in the UI)
drop policy if exists a_rep_sel on reports;  create policy a_rep_sel on reports  for select using(is_admin());
drop policy if exists a_rep_del on reports;  create policy a_rep_del on reports  for delete using(is_admin());
drop policy if exists a_po_del  on posts;    create policy a_po_del  on posts    for delete using(is_admin());
drop policy if exists a_c_del   on comments; create policy a_c_del   on comments for delete using(is_admin());

create or replace function admin_set_role(p_user uuid, p_role text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_role not in('user','admin') then raise exception 'Invalid role'; end if;
  if p_user=auth.uid() then raise exception 'You cannot change your own role'; end if;
  update profiles set role=p_role where id=p_user;
end $$;
revoke all on function admin_set_role(uuid,text) from public, anon;
grant execute on function admin_set_role(uuid,text) to authenticated;

notify pgrst,'reload schema';
