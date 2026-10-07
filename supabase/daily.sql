-- Sidelyne Sports: DAILY SP. Everyone can claim 500 SP once every 24 hours (so a busted account can always get back in).
-- Run in Supabase SQL Editor AFTER schema.sql, saves.sql and stake.sql. Safe to re-run.
-- Change the amount in c_amt below if you want a different daily gift.

alter table profiles add column if not exists last_daily_at timestamptz;

-- Claim once every 24 hours (counted from your last claim, not midnight). Returns new balance + status.
create or replace function claim_daily() returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_amt constant int:=500;           -- <== TUNE: daily SP
  l timestamptz; ok boolean; nv int; ref text:=to_char(clock_timestamp() at time zone 'utc','YYYY-MM-DD"T"HH24:MI:SS.US');
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select last_daily_at into l from profiles where id=uid for update;
  if l is not null and now()<l+interval '24 hours' then
    select novas into nv from profiles where id=uid;
    return jsonb_build_object('claimed',false,'novas',nv,'amount',0,'next',l+interval '24 hours');
  end if;
  ok:=sp_credit(uid,c_amt,0,'Daily SP',ref);
  update profiles set last_daily_at=now() where id=uid;
  select novas into nv from profiles where id=uid;
  return jsonb_build_object('claimed',ok,'novas',nv,'amount',case when ok then c_amt else 0 end,'next',now()+interval '24 hours');
end $$;

-- Is a claim available? (the app calls this to show the button)
create or replace function daily_status() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l timestamptz;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select last_daily_at into l from profiles where id=uid;
  return jsonb_build_object('available',l is null or now()>=l+interval '24 hours','next',case when l is null then now() else l+interval '24 hours' end);
end $$;

-- Clients may only call the functions; they can't write last_daily_at directly.
revoke all on function claim_daily() from public,anon;
grant execute on function claim_daily() to authenticated;
revoke all on function daily_status() from public,anon;
grant execute on function daily_status() to authenticated;

-- ============ MAX BET ============
-- Raise the per-pick cap so anyone can go all-in (the balance is still the real limit: you can never stake SP you don't have).
-- This just re-creates the two pick functions from stake.sql with a huge cap, so nothing else changes.
do $$
declare f text; def text;
begin
  for f in select unnest(array['save_pick','save_prop_pick']) loop
    select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname=f order by p.oid desc limit 1;
    if def is not null then
      def:=replace(def,'c_max constant int:=1000;','c_max constant int:=1000000;');
      execute def;
    end if;
  end loop;
end $$;

notify pgrst,'reload schema';
