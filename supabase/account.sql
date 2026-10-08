-- Sidelyne Sports: let users change their username (they confirm their password in the app first).
-- Safe to re-run. Run in the Supabase SQL Editor.
-- Replaces the old guard_username() that locked usernames forever. Format + reserved names are still enforced.
create or replace function guard_username() returns trigger language plpgsql as $$
begin
  if (tg_op='INSERT' or new.username is distinct from old.username) then
    if new.username !~ '^[a-z0-9_]{3,20}$' then
      raise exception 'Username must be 3-20 letters, numbers or underscores';
    end if;
    if new.username in ('you','me','u','admin','fanova','sidelyne','sidelynesports','sidelyne_sports','support','mod','api','login','signup','settings','index') then
      raise exception 'That username is reserved';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists profiles_guard_username on profiles;
create trigger profiles_guard_username before insert or update of username on profiles
  for each row execute function guard_username();
notify pgrst,'reload schema';
