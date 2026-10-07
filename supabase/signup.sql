-- Sidelyne Sports signup upgrade: username is chosen at sign-up (no second onboarding step). Safe to re-run.
-- Run in Supabase SQL Editor. Run supabase/social.sql too if you haven't yet.

create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare un text:=lower(coalesce(new.raw_user_meta_data->>'username',''));
        dn text:=nullif(trim(coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'name','')),'');
begin
 if un ~ '^[a-z0-9_]{3,20}$' then
  begin
   insert into profiles(id,username,display_name,onboarded) values(new.id,un,coalesce(dn,'Fan'),true) on conflict(id) do nothing;
  exception when unique_violation or raise_exception then
   insert into profiles(id,username,display_name) values(new.id,'user_'||substr(replace(new.id::text,'-',''),1,10),coalesce(dn,'Fan')) on conflict(id) do nothing;
  end;
 else
  insert into profiles(id,username,display_name) values(new.id,'user_'||substr(replace(new.id::text,'-',''),1,10),coalesce(dn,'Fan')) on conflict(id) do nothing;
 end if;
 insert into user_preferences(user_id) values(new.id) on conflict do nothing;
 return new;
end $$;
drop trigger if exists on_auth_user on auth.users;
create trigger on_auth_user after insert on auth.users for each row execute function handle_new_user();

-- Needed so the sign-up form can check "username taken" before the account exists
grant select on profiles to anon, authenticated;
notify pgrst,'reload schema';
