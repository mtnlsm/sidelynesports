-- Sidelyne Sports: FULL ADMIN POWERS. Run in Supabase SQL Editor AFTER admin.sql, stake.sql and daily.sql. Safe to re-run.
-- Every function checks is_admin() inside the database, so only real admins can use them (hiding buttons is not the security).

-- Edit any post
create or replace function admin_edit_post(p_id uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(length(trim(p_body)),0) not between 1 and 1000 then raise exception 'Post must be 1-1000 characters'; end if;
  update posts set body=trim(p_body) where id=p_id;
end $$;

-- Edit any comment
create or replace function admin_edit_comment(p_id uuid,p_body text) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(length(trim(p_body)),0) not between 1 and 500 then raise exception 'Comment must be 1-500 characters'; end if;
  update comments set body=trim(p_body) where id=p_id;
end $$;

-- Resolve every report on one target at once. p_delete=true also deletes the post/comment itself.
create or replace function admin_resolve_report(p_type text,p_target uuid,p_delete boolean default false) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_delete then
    if p_type='post' then delete from posts where id=p_target;
    elsif p_type='comment' then delete from comments where id=p_target;
    end if;
  end if;
  delete from reports where target_type=p_type and target_id=p_target;
  get diagnostics n=row_count;
  return n;
end $$;

-- Edit any profile (username, display name, bio) and wipe a bad avatar/banner
create or replace function admin_update_profile(p_user uuid,p_username text,p_display text,p_bio text,p_clear_avatar boolean default false,p_clear_banner boolean default false) returns void language plpgsql security definer set search_path=public as $$
declare u text:=lower(trim(coalesce(p_username,'')));
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if u !~ '^[a-z0-9_]{3,20}$' then raise exception 'Username must be 3-20 letters, numbers or underscores'; end if;
  if exists(select 1 from profiles where username=u and id<>p_user) then raise exception 'That username is taken'; end if;
  if length(coalesce(p_bio,''))>280 then raise exception 'Bio is too long (280 max)'; end if;
  update profiles set username=u,display_name=nullif(trim(coalesce(p_display,'')),''),bio=nullif(trim(coalesce(p_bio,'')),''),
    avatar_url=case when p_clear_avatar then null else avatar_url end,
    banner_url=case when p_clear_banner then null else banner_url end
  where id=p_user;
end $$;

-- Give or take SP (does not count toward level). Logged in the user's SP history.
create or replace function admin_adjust_sp(p_user uuid,p_delta int,p_reason text default null) returns int language plpgsql security definer set search_path=public as $$
declare nv int; ref text:=to_char(clock_timestamp() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.US'); why text:=left(coalesce(nullif(trim(p_reason),''),'Admin adjustment'),60);
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(p_delta,0)=0 then raise exception 'Enter an amount'; end if;
  if abs(p_delta)>1000000 then raise exception 'Amount too large'; end if;
  if p_delta>0 then
    perform sp_credit(p_user,p_delta,p_delta,why,ref);
  else
    update profiles set novas=greatest(0,novas+p_delta) where id=p_user;
    insert into nova_transactions(user_id,amount,reason,ref) values(p_user,p_delta,why,ref) on conflict do nothing;
  end if;
  select novas into nv from profiles where id=p_user;
  return nv;
end $$;

-- Delete a whole account (posts, comments, picks, everything). Can't delete yourself or another admin.
create or replace function admin_delete_user(p_user uuid) returns void language plpgsql security definer set search_path=public,auth as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if p_user=auth.uid() then raise exception 'You cannot delete yourself'; end if;
  if exists(select 1 from profiles where id=p_user and role='admin') then raise exception 'Remove their admin role first'; end if;
  delete from auth.users where id=p_user;
end $$;

-- Props: change the line on an open prop, or cancel it (everyone gets their stake back)
create or replace function admin_set_prop_line(p_id text,p_line numeric) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  update props set line=p_line where id=p_id and status='open';
  if not found then raise exception 'Only open props can be edited'; end if;
end $$;

create or replace function admin_void_prop(p_id text) returns int language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  return void_prop(p_id);
end $$;

-- Shop: rename, reprice, hide/show an item
create or replace function admin_update_shop_item(p_id text,p_name text,p_price int,p_active boolean) returns void language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 40 then raise exception 'Name must be 1-40 characters'; end if;
  if p_price<0 then raise exception 'Price cannot be negative'; end if;
  update shop_items set name=trim(p_name),price=p_price,active=p_active where id=p_id;
end $$;

-- Let admins read everything they need to manage (reports already allowed in admin.sql)
drop policy if exists a_shop_sel on shop_items; create policy a_shop_sel on shop_items for select using(is_admin());
grant select on shop_items to authenticated;

do $$ declare f text; begin
  foreach f in array array['admin_edit_post(uuid,text)','admin_edit_comment(uuid,text)','admin_resolve_report(text,uuid,boolean)','admin_update_profile(uuid,text,text,text,boolean,boolean)','admin_adjust_sp(uuid,int,text)','admin_delete_user(uuid)','admin_set_prop_line(text,numeric)','admin_void_prop(text)','admin_update_shop_item(text,text,int,boolean)'] loop
    execute format('revoke all on function %s from public,anon',f);
    execute format('grant execute on function %s to authenticated',f);
  end loop;
end $$;

notify pgrst,'reload schema';
