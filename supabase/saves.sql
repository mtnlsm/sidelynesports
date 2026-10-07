-- Sidelyne Sports saves: picks, favorites, badges and SP are stored in your account (not the browser).
-- Safe to re-run. Run in Supabase SQL Editor (after schema.sql; social.sql / signup.sql are separate).

-- ============ TABLES ============
create table if not exists user_picks(
  user_id uuid not null references profiles(id) on delete cascade,
  game_id text not null check(length(game_id) between 1 and 80),
  sport text check(sport is null or length(sport)<=10),
  pick text not null check(length(pick) between 1 and 100),
  matchup text check(matchup is null or length(matchup)<=200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(user_id,game_id));
create table if not exists user_favs(
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null check(kind in('team','fighter')),
  name text not null check(length(name) between 1 and 100),
  created_at timestamptz not null default now(),
  primary key(user_id,kind,name));
create index if not exists idx_user_picks_user on user_picks(user_id,updated_at desc);
create index if not exists idx_user_favs_user on user_favs(user_id);

-- ============ SECURITY ============
alter table user_picks enable row level security;
alter table user_favs  enable row level security;
drop policy if exists up_sel on user_picks; create policy up_sel on user_picks for select using(auth.uid()=user_id);
-- (no insert/update policy on user_picks: picks are written only through save_pick() below)
drop policy if exists uf_sel on user_favs; create policy uf_sel on user_favs for select using(auth.uid()=user_id);
drop policy if exists uf_ins on user_favs; create policy uf_ins on user_favs for insert with check(auth.uid()=user_id);
drop policy if exists uf_del on user_favs; create policy uf_del on user_favs for delete using(auth.uid()=user_id);

-- ============ BADGES (uses your existing achievements / user_achievements tables) ============
insert into achievements(id,name,description,novas) values
 ('first_pick','First Pick','Make your first prediction',0),
 ('picks_5','5 Picks','Make 5 predictions',0),
 ('picks_25','25 Picks','Make 25 predictions',0),
 ('level_2','Level 2','Reach Level 2',0),
 ('level_5','Level 5','Reach Level 5',0),
 ('fan_club','Fan Club','Favorite 3 teams or fighters',0)
on conflict(id) do update set name=excluded.name,description=excluded.description;

create or replace function sync_badges() returns text[] language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); np int; nf int; lv int;
begin
 if uid is null then raise exception 'Not signed in'; end if;
 select count(*) into np from user_picks where user_id=uid;
 select count(*) into nf from user_favs where user_id=uid;
 select level_for(novas) into lv from profiles where id=uid;
 insert into user_achievements(user_id,achievement_id)
  select uid,b from (values('first_pick',np>=1),('picks_5',np>=5),('picks_25',np>=25),('level_2',coalesce(lv,1)>=2),('level_5',coalesce(lv,1)>=5),('fan_club',nf>=3)) v(b,ok)
  where ok on conflict do nothing;
 return array(select achievement_id from user_achievements where user_id=uid);
end $$;

-- ============ SAVE A PICK (+25 SP the first time per game, max 20 rewarded picks/day) ============
create or replace function save_pick(p_game text,p_sport text,p_pick text,p_matchup text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); is_new boolean; awarded int:=0; todays int; nv int;
begin
 if uid is null then raise exception 'Not signed in'; end if;
 if coalesce(length(p_game),0) not between 1 and 80 or coalesce(length(p_pick),0) not between 1 and 100 then raise exception 'Invalid pick'; end if;
 insert into user_picks(user_id,game_id,sport,pick,matchup) values(uid,p_game,left(p_sport,10),p_pick,left(p_matchup,200))
  on conflict(user_id,game_id) do update set pick=excluded.pick,updated_at=now()
  returning (xmax=0) into is_new;
 if is_new then
  select count(*) into todays from nova_transactions where user_id=uid and reason='Pick submitted' and created_at>=date_trunc('day',now());
  if todays<20 then
   insert into nova_transactions(user_id,amount,reason,ref) values(uid,25,'Pick submitted',p_game) on conflict do nothing;
   if found then awarded:=25; update profiles set novas=novas+25 where id=uid; end if;
  end if;
 end if;
 update profiles set level=level_for(novas) where id=uid returning novas into nv;
 perform sync_badges();
 return jsonb_build_object('novas',nv,'awarded',awarded);
end $$;

-- ============ +10 SP per community post (max 10 rewarded posts/day) ============
create or replace function reward_post() returns trigger language plpgsql security definer set search_path=public as $$
declare todays int;
begin
 select count(*) into todays from nova_transactions where user_id=new.user_id and reason='Community post' and created_at>=date_trunc('day',now());
 if todays<10 then
  insert into nova_transactions(user_id,amount,reason,ref) values(new.user_id,10,'Community post',new.id::text) on conflict do nothing;
  if found then update profiles set novas=novas+10 where id=new.user_id; update profiles set level=level_for(novas) where id=new.user_id; end if;
 end if;
 return new;
end $$;
drop trigger if exists on_post_reward on posts;
create trigger on_post_reward after insert on posts for each row execute function reward_post();

-- ============ ONE-TIME IMPORT of picks/favorites that were saved in the browser ============
create or replace function import_local(p_picks jsonb,p_favs jsonb) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Not signed in'; end if;
 if exists(select 1 from user_picks where user_id=uid) or exists(select 1 from user_favs where user_id=uid) then return; end if;
 insert into user_picks(user_id,game_id,sport,pick,matchup)
  select uid,left(x->>'game_id',80),left(x->>'sport',10),left(x->>'pick',100),left(x->>'matchup',200)
  from jsonb_array_elements(coalesce(p_picks,'[]'::jsonb)) x
  where coalesce(x->>'game_id','')<>'' and coalesce(x->>'pick','')<>'' limit 200 on conflict do nothing;
 insert into user_favs(user_id,kind,name)
  select uid,x->>'kind',left(x->>'name',100)
  from jsonb_array_elements(coalesce(p_favs,'[]'::jsonb)) x
  where x->>'kind' in('team','fighter') and coalesce(x->>'name','')<>'' limit 200 on conflict do nothing;
 perform sync_badges();
end $$;

revoke all on function sync_badges() from public,anon;
revoke all on function save_pick(text,text,text,text) from public,anon;
revoke all on function import_local(jsonb,jsonb) from public,anon;
grant execute on function sync_badges() to authenticated;
grant execute on function save_pick(text,text,text,text) to authenticated;
grant execute on function import_local(jsonb,jsonb) to authenticated;

notify pgrst,'reload schema';
