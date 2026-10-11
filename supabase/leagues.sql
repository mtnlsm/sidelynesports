-- Sidelyne Sports: LEAGUES (you vs everyone in the league, pick-fantasy style). Safe to re-run.
-- Run in Supabase SQL Editor AFTER stake.sql and results.sql (needs sp_credit() and finished_games).
--
-- HOW IT WORKS
--   * Anyone can create a league (private with an invite code, or public) and pick a sport (or all sports).
--   * Leagues NEVER expire: they run until the owner deletes them. Owners can edit them any time and delete them any time.
--   * Leagues are customizable: picture, banner, bio and two league colors.
--   * Members make their league picks on upcoming games. League picks are FREE: no SP stake, no SP lost, separate from your normal picks.
--   * Each correct pick = 1 point. Ranking: most points, then fewest losses, then who joined first.
--   * Picks are scored automatically when a game goes final (trigger on finished_games).
--   * SEASONS: standings reset every 2 months (league_cfg 'season_months'). The old season's top players are saved in
--     league_seasons and shown as "Past seasons" in the league. Picks on games that haven't finished yet carry over.
--   * There is no end-of-league bonus because leagues have no end. (league_finalize() is kept only so leagues created before
--     this version that still had an end date close out cleanly; re-running this file converts active ones to permanent.)

do $$ begin
  if to_regprocedure('sp_credit(uuid,integer,integer,text,text)') is null then raise exception 'Run supabase/stake.sql first (it creates sp_credit).'; end if;
  if to_regclass('finished_games') is null then raise exception 'Run supabase/results.sql first (it creates finished_games).'; end if;
end $$;

-- ============ SETTINGS (edit here) ============
create or replace function league_cfg() returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'bonus',20000,        -- SP paid to the #1 player when a league ends
    'min_members',3,      -- league needs at least this many players for the bonus
    'min_picks',5,        -- winner needs at least this many graded (win/loss) picks for the bonus
    'max_members',100,    -- players per league
    'max_owned',3,        -- active leagues one person can run at once
    'max_joined',25,      -- active leagues one person can be in at once
    'season_months',2,    -- standings reset (new season) every this many months
    'grace_hours',24      -- after a league ends, wait for unfinished games up to this long before closing it
  ) $$;

-- ============ TABLES ============
create table if not exists leagues(
  id uuid primary key default gen_random_uuid(),
  name text not null check(length(name) between 3 and 40),
  code text not null unique,
  owner uuid not null references profiles on delete cascade,
  sport text not null default 'ALL',
  is_public boolean not null default false,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,   -- null = permanent (the normal case)
  status text not null default 'active' check(status in('active','finished')),
  winner uuid references profiles on delete set null,
  bonus_paid boolean not null default false,
  bonus int not null default 0,
  finished_at timestamptz,
  avatar_url text,
  banner_url text,
  bio text check(bio is null or length(bio)<=200),
  color text check(color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  color2 text check(color2 is null or color2 ~ '^#[0-9a-fA-F]{6}$'),
  season int not null default 1,
  season_start timestamptz not null default now(),
  created_at timestamptz not null default now());
create table if not exists league_members(
  league_id uuid not null references leagues on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  joined_at timestamptz not null default now(),
  points int not null default 0, wins int not null default 0, losses int not null default 0,
  primary key(league_id,user_id));
create table if not exists league_picks(
  league_id uuid not null,
  user_id uuid not null,
  game_id text not null,
  sport text, pick text not null, matchup text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  result text check(result in('win','loss','void')),
  settled_at timestamptz,
  primary key(league_id,user_id,game_id),
  foreign key(league_id,user_id) references league_members(league_id,user_id) on delete cascade);

-- Upgrade for databases that already had the old leagues table (no-ops on a fresh install).
alter table leagues alter column ends_at drop not null;
alter table leagues add column if not exists avatar_url text;
alter table leagues add column if not exists banner_url text;
alter table leagues add column if not exists bio text;
alter table leagues add column if not exists color text;
alter table leagues add column if not exists color2 text;
alter table leagues add column if not exists season int not null default 1;
alter table leagues add column if not exists season_start timestamptz not null default now();
do $$ begin
  if not exists(select 1 from pg_constraint where conname='leagues_bio_len') then
    alter table leagues add constraint leagues_bio_len check(bio is null or length(bio)<=200); end if;
  if not exists(select 1 from pg_constraint where conname='leagues_color_hex') then
    alter table leagues add constraint leagues_color_hex check((color is null or color ~ '^#[0-9a-fA-F]{6}$') and (color2 is null or color2 ~ '^#[0-9a-fA-F]{6}$')); end if;
end $$;
update leagues set ends_at=null where status='active' and ends_at is not null;   -- active leagues become permanent
drop function if exists league_create(text,text,int,boolean);
create table if not exists league_seasons(
  league_id uuid not null references leagues on delete cascade,
  season int not null,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  winner uuid references profiles on delete set null,
  standings jsonb not null default '[]'::jsonb,   -- top 10 at the end of the season
  primary key(league_id,season));
alter table league_seasons enable row level security;
revoke all on league_seasons from anon, authenticated;
create index if not exists idx_league_members_user on league_members(user_id);
create index if not exists idx_leagues_open on leagues(status,ends_at);
create index if not exists idx_league_picks_open on league_picks(game_id) where settled_at is null;

-- No direct table access from the browser: everything goes through the functions below.
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table league_picks enable row level security;
revoke all on leagues, league_members, league_picks from anon, authenticated;

-- ============ HELPERS ============
create or replace function league_new_code() returns text language plpgsql as $$
declare a constant text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; c text; i int;
begin
  loop
    c:='';
    for i in 1..6 loop c:=c||substr(a,1+floor(random()*32)::int,1); end loop;
    exit when not exists(select 1 from leagues where code=c);
  end loop;
  return c;
end $$;

-- ============ CREATE / EDIT / DELETE / JOIN / LEAVE / PICKS ============
drop function if exists league_create(text,text,int,boolean);
create or replace function league_create(
  p_name text,p_sport text,p_public boolean default false,
  p_bio text default null,p_color text default null,p_color2 text default null,
  p_avatar text default null,p_banner text default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); cfg jsonb:=league_cfg(); l leagues; nm text:=btrim(coalesce(p_name,'')); sp text:=upper(coalesce(nullif(btrim(p_sport),''),'ALL'));
        bi text:=nullif(btrim(coalesce(p_bio,'')),'');
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists(select 1 from profiles where id=uid and onboarded) then raise exception 'Finish setting up your profile first'; end if;
  if length(nm) not between 3 and 40 then raise exception 'League name must be 3 to 40 characters'; end if;
  if sp !~ '^[A-Z0-9]{2,10}$' then raise exception 'Invalid sport'; end if;
  if bi is not null and length(bi)>200 then raise exception 'Bio can be up to 200 characters'; end if;
  if p_color is not null and p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid color'; end if;
  if p_color2 is not null and p_color2 !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid color'; end if;
  if (select count(*) from leagues where owner=uid and status='active')>=(cfg->>'max_owned')::int then
    raise exception 'You can run up to % active leagues at once',cfg->>'max_owned'; end if;
  if (select count(*) from league_members m join leagues x on x.id=m.league_id where m.user_id=uid and x.status='active')>=(cfg->>'max_joined')::int then
    raise exception 'You are in too many active leagues'; end if;
  insert into leagues(name,code,owner,sport,is_public,ends_at,bio,color,color2,avatar_url,banner_url)
    values(nm,league_new_code(),uid,sp,coalesce(p_public,false),null,bi,p_color,p_color2,nullif(p_avatar,''),nullif(p_banner,'')) returning * into l;
  insert into league_members(league_id,user_id) values(l.id,uid);
  return jsonb_build_object('id',l.id,'code',l.code);
end $$;

-- ============ EDIT (owner only) ============
create or replace function league_update(
  p_id uuid,p_name text,p_bio text,p_color text,p_color2 text,p_avatar text,p_banner text,p_public boolean) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l leagues; nm text:=btrim(coalesce(p_name,'')); bi text:=nullif(btrim(coalesce(p_bio,'')),'');
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into l from leagues where id=p_id for update;
  if not found then raise exception 'League not found'; end if;
  if l.owner<>uid then raise exception 'Only the league owner can edit it'; end if;
  if length(nm) not between 3 and 40 then raise exception 'League name must be 3 to 40 characters'; end if;
  if bi is not null and length(bi)>200 then raise exception 'Bio can be up to 200 characters'; end if;
  if p_color is not null and p_color !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid color'; end if;
  if p_color2 is not null and p_color2 !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid color'; end if;
  update leagues set name=nm,bio=bi,color=p_color,color2=p_color2,avatar_url=nullif(p_avatar,''),banner_url=nullif(p_banner,''),
         is_public=coalesce(p_public,is_public)
   where id=p_id;
end $$;

-- ============ DELETE (owner only, any time) ============
create or replace function league_delete(p_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l leagues;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into l from leagues where id=p_id for update;
  if not found then raise exception 'League not found'; end if;
  if l.owner<>uid then raise exception 'Only the league owner can delete it'; end if;
  delete from leagues where id=p_id;   -- members and picks go with it (on delete cascade)
end $$;

-- ============ JOIN / LEAVE / PICKS (no end date any more) ============
create or replace function league_join(p_code text default null,p_id uuid default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); cfg jsonb:=league_cfg(); l leagues; cnt int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if not exists(select 1 from profiles where id=uid and onboarded) then raise exception 'Finish setting up your profile first'; end if;
  if p_id is not null then select * into l from leagues where id=p_id and is_public for update;
  elsif coalesce(btrim(p_code),'')<>'' then select * into l from leagues where code=upper(btrim(p_code)) for update;
  else raise exception 'Enter an invite code'; end if;
  if not found then raise exception 'League not found. Check the code and try again.'; end if;
  if exists(select 1 from league_members where league_id=l.id and user_id=uid) then return jsonb_build_object('id',l.id); end if;
  if l.status<>'active' or (l.ends_at is not null and l.ends_at<=now()) then raise exception 'This league has already ended'; end if;
  select count(*) into cnt from league_members where league_id=l.id;
  if cnt>=(cfg->>'max_members')::int then raise exception 'This league is full'; end if;
  if (select count(*) from league_members m join leagues x on x.id=m.league_id where m.user_id=uid and x.status='active')>=(cfg->>'max_joined')::int then
    raise exception 'You are in too many active leagues'; end if;
  insert into league_members(league_id,user_id) values(l.id,uid);
  return jsonb_build_object('id',l.id);
end $$;

-- Members can leave any time. The owner deletes the league instead (league_delete).
create or replace function league_leave(p_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l leagues;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into l from leagues where id=p_id for update;
  if not found then raise exception 'League not found'; end if;
  if l.owner=uid then raise exception 'You run this league. Delete it instead of leaving.'; end if;
  delete from league_members where league_id=p_id and user_id=uid;
end $$;

create or replace function league_save_pick(p_league uuid,p_game text,p_sport text,p_pick text,p_matchup text,p_start timestamptz default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); l leagues; sides text[];
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into l from leagues where id=p_league;
  if not found then raise exception 'League not found'; end if;
  if l.status<>'active' or (l.ends_at is not null and l.ends_at<=now()) then raise exception 'This league has ended'; end if;
  if not exists(select 1 from league_members where league_id=p_league and user_id=uid) then raise exception 'Join this league first'; end if;
  if coalesce(length(p_game),0) not between 3 and 80 or coalesce(length(p_pick),0) not between 1 and 100 or coalesce(length(p_matchup),0) not between 3 and 200 then
    raise exception 'Invalid pick'; end if;
  if l.sport<>'ALL' and split_part(p_game,':',1)<>l.sport then raise exception 'This league only counts % games',l.sport; end if;
  sides:=string_to_array(p_matchup,' vs ');
  if array_length(sides,1)<>2 or not (p_pick=any(sides)) then raise exception 'Invalid pick'; end if;
  if exists(select 1 from finished_games where game_id=p_game) then raise exception 'That game is already over'; end if;
  if p_start is not null and p_start<=now() then raise exception 'That game has already started'; end if;
  insert into league_picks(league_id,user_id,game_id,sport,pick,matchup) values(p_league,uid,p_game,left(p_sport,10),p_pick,p_matchup)
    on conflict(league_id,user_id,game_id) do update
      set pick=excluded.pick,matchup=excluded.matchup,
          updated_at=case when league_picks.pick<>excluded.pick then now() else league_picks.updated_at end
      where league_picks.settled_at is null;
  if not found then raise exception 'This pick is already settled'; end if;
  return jsonb_build_object('ok',true,'pick',p_pick);
end $$;


-- ============ SCORING (called when a game goes final) ============
create or replace function settle_league_game(p_game text,p_winner text,p_start timestamptz) returns int
language plpgsql security definer set search_path=public as $$
declare r record; n int:=0; ok boolean;
begin
  if coalesce(p_game,'')='' or coalesce(p_winner,'')='' then return 0; end if;
  for r in select p.* from league_picks p join leagues l on l.id=p.league_id
           where p.game_id=p_game and p.settled_at is null and l.status='active' for update of p loop
    if (p_start is not null and r.updated_at>p_start) or p_winner='Draw' then   -- picked/changed after kickoff, or a draw: no point either way
      update league_picks set result='void',settled_at=now() where league_id=r.league_id and user_id=r.user_id and game_id=r.game_id;
    else
      ok:=(r.pick=p_winner);
      update league_picks set result=case when ok then 'win' else 'loss' end,settled_at=now() where league_id=r.league_id and user_id=r.user_id and game_id=r.game_id;
      update league_members set points=points+(case when ok then 1 else 0 end),wins=wins+(case when ok then 1 else 0 end),losses=losses+(case when ok then 0 else 1 end)
        where league_id=r.league_id and user_id=r.user_id;
      n:=n+1;
    end if;
  end loop;
  return n;
end $$;

-- Every game the settle job marks final lands in finished_games: score the league picks right then.
-- (Wrapped so a league problem can never stop normal pick payouts.)
create or replace function league_on_final() returns trigger language plpgsql security definer set search_path=public as $$
begin
  begin
    perform settle_league_game(new.game_id,new.winner,case when new.game_id ~ '^(UFC|PFL):' then null else new.game_date end);
  exception when others then
    raise warning 'league scoring failed for %: %',new.game_id,sqlerrm;
  end;
  return new;
end $$;
drop trigger if exists league_final_trg on finished_games;
create trigger league_final_trg after insert on finished_games for each row execute function league_on_final();

-- ============ SEASONS: reset standings every season_months ============
-- Saves the top 10 of the finished season, zeroes everyone's points, clears settled picks, starts the next season.
-- Safe to call any time (league_finalize() calls it, and so does every league_my()/league_detail()).
create or replace function league_roll() returns int language plpgsql security definer set search_path=public as $$
declare mo int:=(league_cfg()->>'season_months')::int; l leagues; n int:=0; st jsonb; w uuid; ns timestamptz;
begin
  for l in select x.* from leagues x where x.status='active' and x.season_start+make_interval(months=>mo)<=now()
           order by x.season_start limit 50 for update of x skip locked loop
    if exists(select 1 from league_members where league_id=l.id and wins+losses>0) then
      select coalesce(jsonb_agg(jsonb_build_object('user_id',q.user_id,'username',q.username,'display_name',q.display_name,'avatar_url',q.avatar_url,
               'points',q.points,'wins',q.wins,'losses',q.losses,'rank',q.rn) order by q.rn),'[]'::jsonb) into st
        from (select m.user_id,p.username,p.display_name,p.avatar_url,m.points,m.wins,m.losses,
                     row_number() over (order by m.points desc,m.losses asc,m.joined_at asc) rn
              from league_members m join profiles p on p.id=m.user_id where m.league_id=l.id) q where q.rn<=10;
      select m.user_id into w from league_members m where m.league_id=l.id and m.points>0
        order by m.points desc,m.losses asc,m.joined_at asc limit 1;
      insert into league_seasons(league_id,season,started_at,ended_at,winner,standings)
        values(l.id,l.season,l.season_start,l.season_start+make_interval(months=>mo),w,st) on conflict do nothing;
      update league_members set points=0,wins=0,losses=0 where league_id=l.id;
      delete from league_picks where league_id=l.id and settled_at is not null;   -- unfinished games stay and count in the new season
    end if;
    ns:=l.season_start;
    while ns+make_interval(months=>mo)<=now() loop ns:=ns+make_interval(months=>mo); end loop;
    update leagues set season=season+1,season_start=ns where id=l.id;
    n:=n+1;
  end loop;
  return n;
end $$;

-- ============ FINISH ENDED LEAGUES + PAY THE WINNER (only old leagues that still have an end date) ============
-- Safe to call any time, as often as you like: each league closes once, and the bonus can only be paid once per league
-- (sp_credit's unique key). Returns how many leagues it closed.
create or replace function league_finalize() returns int language plpgsql security definer set search_path=public as $$
declare cfg jsonb:=league_cfg(); l leagues; w record; n int:=0; cnt int; ok boolean; paid boolean;
begin
  perform league_roll();
  for l in select x.* from leagues x
           where x.status='active' and x.ends_at<now()
             and (x.ends_at<now()-make_interval(hours=>(cfg->>'grace_hours')::int)
                  or not exists(select 1 from league_picks p where p.league_id=x.id and p.settled_at is null))
           order by x.ends_at limit 50 for update of x skip locked loop
    select count(*) into cnt from league_members where league_id=l.id;
    select m.user_id,m.points,m.wins,m.losses into w from league_members m where m.league_id=l.id
      order by m.points desc,m.losses asc,m.joined_at asc limit 1;
    ok:=w.user_id is not null and cnt>=(cfg->>'min_members')::int and w.points>0 and (w.wins+w.losses)>=(cfg->>'min_picks')::int;
    update league_picks set result='void',settled_at=now() where league_id=l.id and settled_at is null;   -- games that never finished
    paid:=false;
    if ok then paid:=sp_credit(w.user_id,(cfg->>'bonus')::int,0,'League win',l.id::text); end if;
    update leagues set status='finished',finished_at=now(),winner=w.user_id,bonus_paid=paid,bonus=case when paid then (cfg->>'bonus')::int else 0 end where id=l.id;
    n:=n+1;
  end loop;
  return n;
end $$;

-- ============ READ FUNCTIONS ============
create or replace function league_my() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then return '[]'::jsonb; end if;
  perform league_finalize();
  return coalesce((select jsonb_agg(to_jsonb(t) order by (t.status='active') desc,t.created_at desc) from (
    select l.id,l.name,l.code,l.sport,l.is_public,l.starts_at,l.ends_at,l.status,l.bonus_paid,l.bonus,l.winner,l.created_at,
           l.avatar_url,l.banner_url,l.bio,l.color,l.color2,l.season,l.season_start,
           (l.season_start+make_interval(months=>(league_cfg()->>'season_months')::int)) as season_ends,
           (l.owner=uid) as is_owner,
           (l.winner=uid and l.bonus_paid) as i_won,
           (select count(*) from league_members z where z.league_id=l.id)::int as members,
           m.points,m.wins,m.losses,
           (select count(*)+1 from league_members z where z.league_id=l.id and
              (z.points>m.points or (z.points=m.points and (z.losses<m.losses or (z.losses=m.losses and z.joined_at<m.joined_at)))))::int as rank
    from league_members m join leagues l on l.id=m.league_id
    where m.user_id=uid
    order by (l.status='active') desc,l.created_at desc limit 60) t),'[]'::jsonb);
end $$;

create or replace function league_public() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then return '[]'::jsonb; end if;
  return coalesce((select jsonb_agg(to_jsonb(t) order by t.members desc,t.created_at desc) from (
    select l.id,l.name,l.sport,l.ends_at,l.created_at,l.avatar_url,l.bio,l.color,l.color2,
           (select count(*) from league_members z where z.league_id=l.id)::int as members,
           (select username from profiles where id=l.owner) as owner_name,
           exists(select 1 from league_members z where z.league_id=l.id and z.user_id=uid) as joined
    from leagues l where l.is_public and l.status='active' and (l.ends_at is null or l.ends_at>now())
    order by l.created_at desc limit 40) t),'[]'::jsonb);
end $$;

create or replace function league_detail(p_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); cfg jsonb:=league_cfg(); l leagues; mem boolean; st jsonb; pk jsonb:='[]'::jsonb; own text; hist jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  perform league_finalize();
  select * into l from leagues where id=p_id;
  if not found then raise exception 'League not found'; end if;
  mem:=exists(select 1 from league_members where league_id=p_id and user_id=uid);
  if not mem and not l.is_public then raise exception 'League not found'; end if;
  select username into own from profiles where id=l.owner;
  select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'username',p.username,'display_name',p.display_name,'avatar_url',p.avatar_url,
           'flair',p.flair,'border',p.border,'points',m.points,'wins',m.wins,'losses',m.losses,'rank',m.rn,'is_owner',(p.id=l.owner)) order by m.rn),'[]'::jsonb) into st
    from (select x.*,row_number() over (order by x.points desc,x.losses asc,x.joined_at asc) rn from league_members x where x.league_id=p_id) m
    join profiles p on p.id=m.user_id;
  if mem then
    select coalesce(jsonb_agg(jsonb_build_object('game_id',game_id,'pick',pick,'matchup',matchup,'sport',sport,'result',result,'updated_at',updated_at)
             order by updated_at desc),'[]'::jsonb) into pk from league_picks where league_id=p_id and user_id=uid;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('season',h.season,'started_at',h.started_at,'ended_at',h.ended_at,'winner',h.winner,
           'top',(select coalesce(jsonb_agg(e order by i),'[]'::jsonb) from jsonb_array_elements(h.standings) with ordinality as t(e,i) where i<=3)) order by h.season desc),'[]'::jsonb) into hist
    from (select * from league_seasons where league_id=p_id order by season desc limit 8) h;
  return jsonb_build_object(
    'is_member',mem,
    'is_owner',(l.owner=uid),
    'history',hist,
    'league',jsonb_build_object('id',l.id,'name',l.name,'code',case when mem then l.code end,'sport',l.sport,'is_public',l.is_public,
       'starts_at',l.starts_at,'ends_at',l.ends_at,'created_at',l.created_at,'status',l.status,'owner',l.owner,'owner_username',own,
       'winner',l.winner,'bonus_paid',l.bonus_paid,'bonus',l.bonus,'members',jsonb_array_length(st),
       'avatar_url',l.avatar_url,'banner_url',l.banner_url,'bio',l.bio,'color',l.color,'color2',l.color2,
       'season',l.season,'season_start',l.season_start,
       'season_ends',l.season_start+make_interval(months=>(cfg->>'season_months')::int)),
    'cfg',cfg,'standings',st,'picks',pk);
end $$;

-- ============ PERMISSIONS ============
revoke all on function league_cfg() from public,anon;
revoke all on function league_new_code() from public,anon,authenticated;
revoke all on function league_create(text,text,boolean,text,text,text,text,text) from public,anon;
revoke all on function league_update(uuid,text,text,text,text,text,text,boolean) from public,anon;
revoke all on function league_delete(uuid) from public,anon;
revoke all on function league_join(text,uuid) from public,anon;
revoke all on function league_leave(uuid) from public,anon;
revoke all on function league_save_pick(uuid,text,text,text,text,timestamptz) from public,anon;
revoke all on function league_my() from public,anon;
revoke all on function league_public() from public,anon;
revoke all on function league_detail(uuid) from public,anon;
revoke all on function league_roll() from public,anon,authenticated;
revoke all on function league_finalize() from public,anon;
revoke all on function settle_league_game(text,text,timestamptz) from public,anon,authenticated;
revoke all on function league_on_final() from public,anon,authenticated;
grant execute on function league_cfg() to authenticated,service_role;
grant execute on function league_create(text,text,boolean,text,text,text,text,text) to authenticated;
grant execute on function league_update(uuid,text,text,text,text,text,text,boolean) to authenticated;
grant execute on function league_delete(uuid) to authenticated;
grant execute on function league_join(text,uuid) to authenticated;
grant execute on function league_leave(uuid) to authenticated;
grant execute on function league_save_pick(uuid,text,text,text,text,timestamptz) to authenticated;
grant execute on function league_my() to authenticated;
grant execute on function league_public() to authenticated;
grant execute on function league_detail(uuid) to authenticated;
grant execute on function league_finalize() to authenticated,service_role;
grant execute on function league_roll() to service_role;
grant execute on function settle_league_game(text,text,timestamptz) to service_role;

notify pgrst,'reload schema';

-- ============ CHECK (run on its own after the file above; all should say true) ============
-- select to_regprocedure('league_finalize()') is not null as functions_ok,
--        to_regprocedure('league_delete(uuid)') is not null as delete_ok,
--        to_regprocedure('league_roll()') is not null as seasons_ok,
--        exists(select 1 from pg_trigger where tgname='league_final_trg') as trigger_ok,
--        to_regclass('league_picks') is not null as tables_ok;
