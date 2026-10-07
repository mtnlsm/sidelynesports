-- Sidelyne Sports: Higher/Lower stat picks (props). Run AFTER saves.sql and results.sql. Safe to re-run.
create table if not exists props(
  id text primary key, game_id text not null, sport text not null, matchup text,
  subject text not null, stat text not null, stat_label text not null, line numeric not null,
  starts_at timestamptz not null, actual numeric,
  status text not null default 'open' check(status in('open','settled','void')), created_at timestamptz not null default now());
create index if not exists idx_props_start on props(starts_at);
create index if not exists idx_props_game on props(game_id);
create table if not exists prop_picks(
  user_id uuid not null references profiles(id) on delete cascade,
  prop_id text not null references props(id) on delete cascade,
  choice text not null check(choice in('higher','lower')),
  result text check(result in('win','loss','void')), awarded int, settled_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(user_id,prop_id));
create index if not exists idx_prop_picks_open on prop_picks(prop_id) where settled_at is null;
alter table props enable row level security; alter table prop_picks enable row level security;
drop policy if exists pr_sel on props; create policy pr_sel on props for select using(true);
drop policy if exists pp_sel on prop_picks; create policy pp_sel on prop_picks for select using(auth.uid()=user_id);
grant select on props to anon, authenticated; grant select on prop_picks to authenticated;

-- Make a pick: +25 SP the first time per prop (max 30/day). Locked once the game starts.
create or replace function save_prop_pick(p_prop text,p_choice text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); pr props; is_new boolean; awarded int:=0; todays int; nv int;
begin
 if uid is null then raise exception 'Not signed in'; end if;
 if p_choice not in('higher','lower') then raise exception 'Invalid pick'; end if;
 select * into pr from props where id=p_prop;
 if not found or pr.status<>'open' or pr.starts_at<=now() then raise exception 'This pick is locked'; end if;
 insert into prop_picks(user_id,prop_id,choice) values(uid,p_prop,p_choice)
  on conflict(user_id,prop_id) do update set choice=excluded.choice,updated_at=now() where prop_picks.settled_at is null
  returning (xmax=0) into is_new;
 if is_new then
  select count(*) into todays from nova_transactions where user_id=uid and reason='Prop pick submitted' and created_at>=date_trunc('day',now());
  if todays<30 then
   insert into nova_transactions(user_id,amount,reason,ref) values(uid,25,'Prop pick submitted',p_prop) on conflict do nothing;
   if found then awarded:=25; update profiles set novas=novas+25 where id=uid; end if;
  end if;
 end if;
 update profiles set level=level_for(novas) where id=uid returning novas into nv;
 return jsonb_build_object('novas',nv,'awarded',awarded);
end $$;

-- Settle one prop with the real stat. Correct +150 SP, wrong +25 SP. Equal to the line = void.
-- Called by the props function, or by you:  select settle_prop('<prop id>', 63);
create or replace function settle_prop(p_prop text,p_actual numeric) returns int language plpgsql security definer set search_path=public as $$
declare pr props; r record; n int:=0; ok boolean; amt int;
begin
 select * into pr from props where id=p_prop for update;
 if not found or pr.status<>'open' then return 0; end if;
 update props set actual=p_actual,status='settled' where id=p_prop;
 for r in select * from prop_picks where prop_id=p_prop and settled_at is null for update loop
  if r.updated_at>pr.starts_at or p_actual=pr.line then
   update prop_picks set result='void',awarded=0,settled_at=now() where user_id=r.user_id and prop_id=p_prop; continue;
  end if;
  ok:=(r.choice='higher')=(p_actual>pr.line); amt:=case when ok then 150 else 25 end;
  update prop_picks set result=case when ok then 'win' else 'loss' end,awarded=amt,settled_at=now() where user_id=r.user_id and prop_id=p_prop;
  insert into nova_transactions(user_id,amount,reason,ref) values(r.user_id,amt,case when ok then 'Correct prop' else 'Prop played' end,p_prop) on conflict do nothing;
  if found then
   update profiles set novas=novas+amt,streak=case when ok then streak+1 else 0 end,best_streak=greatest(best_streak,case when ok then streak+1 else streak end) where id=r.user_id;
   update profiles set level=level_for(novas) where id=r.user_id; n:=n+1;
  end if;
 end loop;
 return n;
end $$;

-- Cancel a prop (player did not play, fight cancelled): picks become void.  select void_prop('<prop id>');
create or replace function void_prop(p_prop text) returns int language plpgsql security definer set search_path=public as $$
declare n int;
begin
 update props set status='void' where id=p_prop and status='open';
 if not found then return 0; end if;
 update prop_picks set result='void',awarded=0,settled_at=now() where prop_id=p_prop and settled_at is null;
 get diagnostics n=row_count; return n;
end $$;
revoke all on function settle_prop(text,numeric) from public,anon,authenticated;
revoke all on function void_prop(text) from public,anon,authenticated;
grant execute on function settle_prop(text,numeric) to service_role;
grant execute on function void_prop(text) to service_role;
revoke all on function save_prop_pick(text,text) from public,anon;
grant execute on function save_prop_pick(text,text) to authenticated;
notify pgrst,'reload schema';
