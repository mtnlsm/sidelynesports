-- Sidelyne Sports schema (idempotent: safe to run on a fresh project OR on top of an older version).
-- Paste the whole file into Supabase SQL Editor and Run. Free predictions only: no money anywhere.
create extension if not exists pgcrypto;

-- ============ TABLES ============
create table if not exists sports(code text primary key,name text not null);
insert into sports values('NFL','NFL'),('NBA','NBA'),('UFC','UFC'),('PFL','PFL'),('MLB','MLB'),('NHL','NHL'),('WNBA','WNBA'),('CFB','College Football'),('CBB','College Basketball'),('CBASE','College Baseball'),('CFL','CFL'),('SOCCER','Soccer') on conflict do nothing;

create table if not exists profiles(id uuid primary key references auth.users on delete cascade,
 username text unique not null check(username ~ '^[a-z0-9_]{3,20}$'),display_name text,avatar_url text,bio text check(length(bio)<=280),
 novas int not null default 0 check(novas>=0),level int not null default 1,streak int not null default 0,best_streak int not null default 0,
 onboarded boolean not null default false,created_at timestamptz not null default now());
-- Upgrade older profiles tables (this is what fixes "Could not find the 'onboarded' column")
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_url text;
alter table profiles add column if not exists banner_url text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists novas int not null default 0;
alter table profiles add column if not exists level int not null default 1;
alter table profiles add column if not exists streak int not null default 0;
alter table profiles add column if not exists best_streak int not null default 0;
alter table profiles add column if not exists onboarded boolean not null default false;
alter table profiles add column if not exists created_at timestamptz not null default now();

create table if not exists teams(id uuid primary key default gen_random_uuid(),sport text not null references sports,ext_id text,name text not null,city text,logo_url text,unique(sport,ext_id));
create table if not exists players(id uuid primary key default gen_random_uuid(),team_id uuid references teams,sport text not null references sports,ext_id text,name text not null,position text,unique(sport,ext_id));
create table if not exists fighters(id uuid primary key default gen_random_uuid(),ext_id text unique,name text not null,weight_class text,record text,photo_url text);
create table if not exists events(id uuid primary key default gen_random_uuid(),sport text not null references sports,ext_id text,title text not null,starts_at timestamptz not null,
 status text not null default 'scheduled' check(status in('scheduled','live','final')),unique(sport,ext_id));
create table if not exists games(event_id uuid primary key references events on delete cascade,home_team uuid references teams,away_team uuid references teams,home_score int,away_score int,clock text,stats jsonb);
create table if not exists fights(id uuid primary key default gen_random_uuid(),event_id uuid not null references events on delete cascade,fighter_a uuid references fighters,fighter_b uuid references fighters,
 winner uuid references fighters,method text,round int,stats jsonb);
create table if not exists user_favorites(user_id uuid references profiles on delete cascade,kind text check(kind in('team','fighter')),ref_id uuid not null,primary key(user_id,kind,ref_id));
create table if not exists predictions(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles on delete cascade,event_id uuid not null references events on delete cascade,
 pick text not null,method text,round int,created_at timestamptz default now(),updated_at timestamptz default now(),unique(user_id,event_id));
create table if not exists prediction_results(prediction_id uuid primary key references predictions on delete cascade,correct boolean not null,novas_awarded int not null default 0,settled_at timestamptz default now());
create table if not exists nova_transactions(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles on delete cascade,amount int not null,reason text not null,ref text,created_at timestamptz default now(),unique(user_id,reason,ref));
create table if not exists achievements(id text primary key,name text not null,description text,novas int default 0);
create table if not exists user_achievements(user_id uuid references profiles on delete cascade,achievement_id text references achievements,earned_at timestamptz default now(),primary key(user_id,achievement_id));
create table if not exists follows(follower uuid references profiles on delete cascade,followee uuid references profiles on delete cascade,created_at timestamptz default now(),primary key(follower,followee),check(follower<>followee));
create table if not exists blocks(blocker uuid references profiles on delete cascade,blocked uuid references profiles on delete cascade,created_at timestamptz default now(),primary key(blocker,blocked),check(blocker<>blocked));
create table if not exists posts(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles on delete cascade,body text not null check(length(body) between 1 and 1000),
 image_url text,sport text references sports,team_id uuid references teams,player_id uuid references players,fighter_id uuid references fighters,event_id uuid references events,created_at timestamptz default now());
create table if not exists post_likes(post_id uuid references posts on delete cascade,user_id uuid references profiles on delete cascade,primary key(post_id,user_id));
create table if not exists comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references posts on delete cascade,user_id uuid not null references profiles on delete cascade,body text not null check(length(body) between 1 and 500),created_at timestamptz default now());
create table if not exists comment_likes(comment_id uuid references comments on delete cascade,user_id uuid references profiles on delete cascade,primary key(comment_id,user_id));
create table if not exists reports(id uuid primary key default gen_random_uuid(),reporter uuid not null references profiles on delete cascade,target_type text not null check(target_type in('user','post','comment')),target_id uuid not null,reason text,created_at timestamptz default now());
create table if not exists notifications(id uuid primary key default gen_random_uuid(),user_id uuid not null references profiles on delete cascade,type text not null,data jsonb,read boolean default false,created_at timestamptz default now());
create table if not exists user_preferences(user_id uuid primary key references profiles on delete cascade,theme text default 'system' check(theme in('system','light','dark')),notify jsonb default '{}');
create table if not exists cached_sports_data(cache_key text primary key,provider text,payload jsonb not null,fetched_at timestamptz not null default now(),updated_at timestamptz not null default now(),expires_at timestamptz not null);

create index if not exists idx_events_sport_start on events(sport,starts_at);
create index if not exists idx_pred_event on predictions(event_id);
create index if not exists idx_posts_created on posts(created_at desc);
create index if not exists idx_posts_sport on posts(sport);
create index if not exists idx_nova_user on nova_transactions(user_id,created_at desc);
create index if not exists idx_notif_user on notifications(user_id,read,created_at desc);
create index if not exists idx_comments_post on comments(post_id);

-- ============ FUNCTIONS & TRIGGERS ============
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

-- Backfill: accounts created before the trigger existed get a profile row
insert into profiles(id,username,display_name)
 select u.id,'user_'||substr(replace(u.id::text,'-',''),1,10),coalesce(u.raw_user_meta_data->>'name','Fan') from auth.users u
 where not exists(select 1 from profiles p where p.id=u.id) on conflict do nothing;
insert into user_preferences(user_id) select id from profiles on conflict do nothing;

-- Predictions lock once the event starts or is not scheduled
create or replace function lock_predictions() returns trigger language plpgsql as $$
begin
 if exists(select 1 from events e where e.id=new.event_id and (e.status<>'scheduled' or e.starts_at<=now())) then raise exception 'Predictions are locked'; end if;
 new.updated_at=now(); return new;
end $$;
drop trigger if exists lock_pred on predictions;
create trigger lock_pred before insert or update on predictions for each row execute function lock_predictions();

-- SP -> level: level n needs 250*(n-1)^2 SP
create or replace function level_for(n int) returns int language sql immutable as $$ select floor(sqrt(n/250.0))::int+1 $$;

-- Server-side settlement (service role only). 100 SP per correct pick, +250 streak bonus every 5.
create or replace function settle_event(p_event uuid,p_winner text) returns void language plpgsql security definer set search_path=public as $$
declare r record; ok boolean; s int; begin
 for r in select p.* from predictions p left join prediction_results x on x.prediction_id=p.id where p.event_id=p_event and x.prediction_id is null loop
  ok:=(r.pick=p_winner);
  insert into prediction_results values(r.id,ok,case when ok then 100 else 0 end);
  if ok then
   insert into nova_transactions(user_id,amount,reason,ref) values(r.user_id,100,'Correct prediction',p_event::text) on conflict do nothing;
   update profiles set novas=novas+100,streak=streak+1,best_streak=greatest(best_streak,streak+1) where id=r.user_id returning streak into s;
   if s%5=0 then insert into nova_transactions(user_id,amount,reason,ref) values(r.user_id,250,'Streak bonus',p_event::text) on conflict do nothing; update profiles set novas=novas+250 where id=r.user_id; end if;
  else update profiles set streak=0 where id=r.user_id; end if;
  update profiles set level=level_for(novas) where id=r.user_id;
 end loop;
 update events set status='final' where id=p_event;
end $$;
revoke all on function settle_event(uuid,text) from public,anon,authenticated;
grant execute on function settle_event(uuid,text) to service_role;

create or replace function not_blocked(owner uuid) returns boolean language sql stable security definer set search_path=public as $$
 select not exists(select 1 from blocks where (blocker=auth.uid() and blocked=owner) or (blocker=owner and blocked=auth.uid())) $$;

-- ============ RLS ============
do $$ declare t text; begin
 foreach t in array array['sports','profiles','teams','players','fighters','events','games','fights','user_favorites','predictions','prediction_results','nova_transactions','achievements','user_achievements','follows','blocks','posts','post_likes','comments','comment_likes','reports','notifications','user_preferences','cached_sports_data'] loop
  execute format('alter table %I enable row level security',t); end loop; end $$;

-- Drop every existing policy on our tables + storage so this file can be re-run cleanly
do $$ declare r record; begin
 for r in select schemaname,tablename,policyname from pg_policies where schemaname='public' loop
  execute format('drop policy if exists %I on %I.%I',r.policyname,r.schemaname,r.tablename); end loop;
 for r in select policyname from pg_policies where schemaname='storage' and tablename='objects' and policyname in('st_read','st_ins','st_upd','st_del') loop
  execute format('drop policy if exists %I on storage.objects',r.policyname); end loop;
end $$;

-- Public read catalog (cached_sports_data: no policies = service role only)
create policy r_sports on sports for select using(true);
create policy r_teams on teams for select using(true);
create policy r_players on players for select using(true);
create policy r_fighters on fighters for select using(true);
create policy r_events on events for select using(true);
create policy r_games on games for select using(true);
create policy r_fights on fights for select using(true);
create policy r_ach on achievements for select using(true);
create policy r_uach on user_achievements for select using(true);

-- Profiles: public read; users edit only safe columns (novas/level/streak are server-controlled)
create policy r_prof on profiles for select using(true);
create policy u_prof on profiles for update using(auth.uid()=id) with check(auth.uid()=id);
revoke update on profiles from authenticated;
grant update(username,display_name,avatar_url,banner_url,bio,onboarded) on profiles to authenticated;
revoke insert,delete on profiles from authenticated,anon;

-- Predictions & private data: owner only
create policy p_sel on predictions for select using(auth.uid()=user_id);
create policy p_ins on predictions for insert with check(auth.uid()=user_id);
create policy p_upd on predictions for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy pr_sel on prediction_results for select using(exists(select 1 from predictions p where p.id=prediction_id and p.user_id=auth.uid()));
create policy n_sel on nova_transactions for select using(auth.uid()=user_id);
create policy fav_all on user_favorites for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy pref_all on user_preferences for all using(auth.uid()=user_id) with check(auth.uid()=user_id);
create policy notif_sel on notifications for select using(auth.uid()=user_id);
create policy notif_upd on notifications for update using(auth.uid()=user_id) with check(auth.uid()=user_id);
revoke update on notifications from authenticated;
grant update(read) on notifications to authenticated;

-- Social
create policy f_sel on follows for select using(true);
create policy f_ins on follows for insert with check(auth.uid()=follower);
create policy f_del on follows for delete using(auth.uid()=follower);
create policy b_all on blocks for all using(auth.uid()=blocker) with check(auth.uid()=blocker);
create policy po_sel on posts for select using(not_blocked(user_id));
create policy po_ins on posts for insert with check(auth.uid()=user_id);
create policy po_del on posts for delete using(auth.uid()=user_id);
create policy c_sel on comments for select using(not_blocked(user_id));
create policy c_ins on comments for insert with check(auth.uid()=user_id);
create policy c_del on comments for delete using(auth.uid()=user_id);
create policy pl_sel on post_likes for select using(true);
create policy pl_ins on post_likes for insert with check(auth.uid()=user_id);
create policy pl_del on post_likes for delete using(auth.uid()=user_id);
create policy cl_sel on comment_likes for select using(true);
create policy cl_ins on comment_likes for insert with check(auth.uid()=user_id);
create policy cl_del on comment_likes for delete using(auth.uid()=user_id);
create policy rep_ins on reports for insert with check(auth.uid()=reporter);

-- ============ LEADERBOARD VIEW ============
create or replace view leaderboard as select p.id,p.username,p.novas,p.level,p.streak,p.best_streak,
 count(r.prediction_id) filter(where r.correct) correct,count(r.prediction_id) total,
 round(100.0*count(r.prediction_id) filter(where r.correct)/nullif(count(r.prediction_id),0),1) accuracy
 from profiles p left join predictions pd on pd.user_id=p.id left join prediction_results r on r.prediction_id=pd.id group by p.id;
grant select on leaderboard to anon,authenticated;

-- ============ STORAGE (upload to <user_id>/<filename>) ============
insert into storage.buckets(id,name,public) values('avatars','avatars',true),('post-images','post-images',true) on conflict do nothing;
create policy st_read on storage.objects for select using(bucket_id in('avatars','post-images'));
create policy st_ins on storage.objects for insert to authenticated with check(bucket_id in('avatars','post-images') and (storage.foldername(name))[1]=auth.uid()::text);
create policy st_upd on storage.objects for update to authenticated using(bucket_id in('avatars','post-images') and (storage.foldername(name))[1]=auth.uid()::text);
create policy st_del on storage.objects for delete to authenticated using(bucket_id in('avatars','post-images') and (storage.foldername(name))[1]=auth.uid()::text);

-- ============ COMMUNITY LIVE UPDATES ============
create index if not exists idx_post_likes_post on post_likes(post_id);
do $$ begin alter publication supabase_realtime add table posts; exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table post_likes; exception when duplicate_object then null; when undefined_object then null; end $$;

-- ============ REFRESH API SCHEMA CACHE ============
notify pgrst,'reload schema';
