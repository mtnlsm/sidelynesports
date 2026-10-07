-- Sidelyne Sports rebrand: reserve the new brand name as a username. Safe to re-run. Run in Supabase SQL Editor.
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
notify pgrst,'reload schema';
