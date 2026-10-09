-- Sidelyne Sports: OG BADGE. A gift-only name flair (gold crown + "OG") that only admins can give. It is not for sale in the SP Shop.
-- Run in Supabase SQL Editor AFTER shop.sql and admin.sql. Safe to re-run.
-- Giving it also adds it to the person's owned flair, so after that they can equip / remove it themselves in the SP Shop.
create or replace function admin_set_og(p_user uuid,p_on boolean) returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_admin() then raise exception 'Not authorized'; end if;
  if not exists(select 1 from profiles where id=p_user) then raise exception 'User not found'; end if;
  if p_on then
    insert into user_items(user_id,item_id,data) values(p_user,'flair:og','{"gift":true}'::jsonb) on conflict(user_id,item_id) do nothing;
    update profiles set flair='og' where id=p_user;
    return 'OG badge given';
  else
    delete from user_items where user_id=p_user and item_id='flair:og';
    update profiles set flair=null where id=p_user and flair='og';
    return 'OG badge removed';
  end if;
end $$;
revoke all on function admin_set_og(uuid,boolean) from public,anon;
grant execute on function admin_set_og(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
