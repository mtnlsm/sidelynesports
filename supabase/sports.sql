-- Sidelyne Sports sports expansion: lets posts be tagged with the new sports. Safe to re-run. Run in Supabase SQL Editor.
-- (The old sports table only allowed NFL/NBA/UFC, which would make tagged posts fail.)
do $$ declare c record; begin
  for c in select conname from pg_constraint where conrelid='public.sports'::regclass and contype='c' loop
    execute format('alter table public.sports drop constraint %I',c.conname);
  end loop;
end $$;
insert into sports(code,name) values
 ('NFL','NFL'),('NBA','NBA'),('UFC','UFC'),('PFL','PFL'),('MLB','MLB'),('NHL','NHL'),('WNBA','WNBA'),
 ('CFB','College Football'),('CBB','College Basketball'),('CBASE','College Baseball'),('CFL','CFL'),('SOCCER','Soccer')
on conflict(code) do update set name=excluded.name;
notify pgrst,'reload schema';
