-- Sidelyne Sports SP Shop: name flair, post highlights, team themes. Safe to re-run.
-- Run in Supabase SQL Editor AFTER schema.sql, admin.sql, saves.sql and settle_picks.sql.
-- (If you ever re-run schema.sql, run this file again: schema.sql drops all public policies.)
-- Prices live in the INSERT near the bottom of section 2. Edit them and re-run to change them.
-- Prices are set high on purpose so big wins feel rewarding (daily SP is 500, a default pick costs 25).

-- ============ 1) PROFILE + POST COLUMNS ============
alter table profiles add column if not exists flair text;
alter table profiles add column if not exists team_theme jsonb;
-- Lifetime SP earned. Level is based on this, so spending SP in the shop never lowers your level.
alter table profiles add column if not exists lifetime_novas int not null default 0;
alter table posts    add column if not exists pinned_until timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='profiles_flair_check') then
    alter table profiles add constraint profiles_flair_check check(flair is null or flair ~ '^[a-z_]{1,20}$');
  end if;
end $$;

create index if not exists idx_posts_pinned on posts(pinned_until) where pinned_until is not null;

-- ============ 2) CATALOG + OWNERSHIP ============
create table if not exists shop_items(
  id text primary key,
  kind text not null check(kind in('flair','pin','theme')),
  name text not null,
  price int not null check(price>=0),
  sort int not null default 0,
  active boolean not null default true,
  data jsonb not null default '{}'::jsonb);

create table if not exists user_items(
  user_id uuid not null references profiles(id) on delete cascade,
  item_id text not null check(length(item_id) between 3 and 80),
  data jsonb not null default '{}'::jsonb,
  acquired_at timestamptz not null default now(),
  primary key(user_id,item_id));
create index if not exists idx_user_items_user on user_items(user_id);

insert into shop_items(id,kind,name,price,sort,data) values
 ('flair:star',  'flair','Star',   1500,10,'{}'),
 ('flair:bolt',  'flair','Bolt',   2500,20,'{}'),
 ('flair:medal', 'flair','Medal',  4000,30,'{}'),
 ('flair:trophy','flair','Trophy', 6000,40,'{}'),
 ('flair:flame', 'flair','Flame',  10000,50,'{}'),
 ('flair:crown', 'flair','Crown', 25000,60,'{}'),
 ('pin:3h','pin','Highlight 3 hours',3000,10,'{"hours":3}'),
 ('pin:6h','pin','Highlight 6 hours',5000,20,'{"hours":6}'),
 ('theme:team','theme','Team theme',7500,10,'{}')
on conflict(id) do update set kind=excluded.kind,name=excluded.name,price=excluded.price,sort=excluded.sort,data=excluded.data;

-- ============ 3) SECURITY (read-only from the app; every write goes through the functions below) ============
alter table shop_items enable row level security;
alter table user_items enable row level security;
drop policy if exists shop_items_sel on shop_items; create policy shop_items_sel on shop_items for select using(true);
drop policy if exists user_items_sel on user_items; create policy user_items_sel on user_items for select using(auth.uid()=user_id);
revoke insert,update,delete on shop_items from anon,authenticated;
revoke insert,update,delete on user_items from anon,authenticated;
grant select on shop_items to anon,authenticated;
grant select on user_items to authenticated;

-- Profiles: users may edit only these columns. flair / team_theme / lifetime_novas / novas / level are server-controlled.
revoke update on profiles from authenticated;
grant update(username,display_name,avatar_url,banner_url,bio,onboarded) on profiles to authenticated;

-- ============ 4) LEVEL FOLLOWS LIFETIME SP (so spending never de-levels) ============
create or replace function profiles_track_lifetime() returns trigger language plpgsql as $$
begin
  if new.novas>old.novas then
    new.lifetime_novas:=greatest(coalesce(old.lifetime_novas,0),old.novas)+(new.novas-old.novas);
  end if;
  new.lifetime_novas:=greatest(coalesce(new.lifetime_novas,0),new.novas);
  new.level:=level_for(new.lifetime_novas);
  return new;
end $$;
drop trigger if exists profiles_lifetime on profiles;
create trigger profiles_lifetime before update on profiles for each row execute function profiles_track_lifetime();

-- Backfill existing accounts (the trigger above fixes lifetime_novas and level)
update profiles set lifetime_novas=novas where lifetime_novas<novas;

-- Badges (Level 2 / Level 5) now use lifetime SP too
create or replace function sync_badges() returns text[] language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); np int; nf int; lv int;
begin
 if uid is null then raise exception 'Not signed in'; end if;
 select count(*) into np from user_picks where user_id=uid;
 select count(*) into nf from user_favs where user_id=uid;
 select level_for(greatest(lifetime_novas,novas)) into lv from profiles where id=uid;
 insert into user_achievements(user_id,achievement_id)
  select uid,b from (values('first_pick',np>=1),('picks_5',np>=5),('picks_25',np>=25),('level_2',coalesce(lv,1)>=2),('level_5',coalesce(lv,1)>=5),('fan_club',nf>=3)) v(b,ok)
  where ok on conflict do nothing;
 return array(select achievement_id from user_achievements where user_id=uid);
end $$;
revoke all on function sync_badges() from public,anon;
grant execute on function sync_badges() to authenticated;

-- ============ 5) NOBODY CAN PIN A POST FOR FREE ============
create or replace function posts_guard_pin() returns trigger language plpgsql as $$
begin
  if tg_op='INSERT' then
    new.pinned_until:=null;
  elsif new.pinned_until is distinct from old.pinned_until and coalesce(current_setting('sidelyne.pin_ok',true),'')<>'1' then
    new.pinned_until:=old.pinned_until;
  end if;
  return new;
end $$;
drop trigger if exists posts_guard_pin on posts;
create trigger posts_guard_pin before insert or update on posts for each row execute function posts_guard_pin();

-- ============ 6) PURCHASE FUNCTIONS ============
-- Internal: take SP from a user (row-locked, so two taps can never overspend) and log it. Returns the new balance.
create or replace function shop_spend(p_uid uuid,p_amount int,p_reason text) returns int language plpgsql security definer set search_path=public as $$
declare bal int;
begin
  if p_amount is null or p_amount<0 then raise exception 'Invalid price'; end if;
  select novas into bal from profiles where id=p_uid for update;
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_amount then raise exception 'Not enough SP: you have %, you need %',bal,p_amount; end if;
  update profiles set novas=novas-p_amount where id=p_uid returning novas into bal;
  insert into nova_transactions(user_id,amount,reason,ref) values(p_uid,-p_amount,left(p_reason,80),gen_random_uuid()::text);
  return bal;
end $$;
revoke all on function shop_spend(uuid,int,text) from public,anon,authenticated;

-- Buy a name flair (and equip it right away)
create or replace function shop_buy_flair(p_item text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); it shop_items%rowtype; bal int; fl text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into it from shop_items where id=p_item and kind='flair' and active;
  if not found then raise exception 'Unknown flair'; end if;
  if exists(select 1 from user_items where user_id=uid and item_id=p_item) then raise exception 'You already own this flair'; end if;
  bal:=shop_spend(uid,it.price,'Shop: '||it.name||' flair');
  insert into user_items(user_id,item_id,data) values(uid,p_item,'{}'::jsonb);
  fl:=substr(p_item,7);
  update profiles set flair=fl where id=uid;
  return jsonb_build_object('novas',bal,'flair',fl);
end $$;

-- Buy a team theme (and equip it right away). The colors are cosmetic and only ever applied to your own app.
create or replace function shop_buy_theme(p_key text,p_name text,p_c1 text,p_c2 text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); it shop_items%rowtype; bal int; iid text; d jsonb; th jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if coalesce(p_key,'') !~ '^[a-z0-9_]{2,40}$' then raise exception 'Invalid team'; end if;
  if coalesce(p_c1,'') !~ '^#[0-9a-fA-F]{6}$' or coalesce(p_c2,'') !~ '^#[0-9a-fA-F]{6}$' then raise exception 'Invalid team colors'; end if;
  if coalesce(length(trim(p_name)),0) not between 1 and 40 then raise exception 'Invalid team name'; end if;
  select * into it from shop_items where id='theme:team' and kind='theme' and active;
  if not found then raise exception 'Themes are not available'; end if;
  iid:='theme:'||p_key;
  if exists(select 1 from user_items where user_id=uid and item_id=iid) then raise exception 'You already own this theme'; end if;
  bal:=shop_spend(uid,it.price,'Shop: '||left(trim(p_name),40)||' theme');
  d:=jsonb_build_object('n',trim(p_name),'c1',lower(p_c1),'c2',lower(p_c2));
  insert into user_items(user_id,item_id,data) values(uid,iid,d);
  th:=jsonb_build_object('id',iid)||d;
  update profiles set team_theme=th where id=uid;
  return jsonb_build_object('novas',bal,'team_theme',th);
end $$;

-- Highlight (pin) one of your own posts at the top of the community feed
create or replace function shop_pin_post(p_post uuid,p_item text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); it shop_items%rowtype; hrs int; cur timestamptz; until_ts timestamptz; bal int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into it from shop_items where id=p_item and kind='pin' and active;
  if not found then raise exception 'Unknown highlight option'; end if;
  hrs:=coalesce((it.data->>'hours')::int,0);
  if hrs<=0 then raise exception 'Unknown highlight option'; end if;
  select pinned_until into cur from posts where id=p_post and user_id=uid for update;
  if not found then raise exception 'You can only highlight your own posts'; end if;
  if exists(select 1 from posts where user_id=uid and id<>p_post and pinned_until>now()) then
    raise exception 'You already have another highlighted post. Wait until it ends.';
  end if;
  until_ts:=greatest(now(),coalesce(cur,now()))+make_interval(hours=>hrs);
  if until_ts>now()+interval '12 hours' then raise exception 'A post can be highlighted for 12 hours at most at a time.'; end if;
  bal:=shop_spend(uid,it.price,'Shop: '||it.name);
  perform set_config('sidelyne.pin_ok','1',true);
  update posts set pinned_until=until_ts where id=p_post;
  perform set_config('sidelyne.pin_ok','',true);
  return jsonb_build_object('novas',bal,'pinned_until',until_ts);
end $$;

-- Equip something you own (or pass null / '' to remove it). p_kind is 'flair' or 'theme'.
create or replace function shop_equip(p_kind text,p_item text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); d jsonb; th jsonb; fl text;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_kind='flair' then
    if coalesce(p_item,'')='' then
      update profiles set flair=null where id=uid;
    else
      if p_item !~ '^flair:' or not exists(select 1 from user_items where user_id=uid and item_id=p_item) then raise exception 'You do not own that flair'; end if;
      fl:=substr(p_item,7);
      update profiles set flair=fl where id=uid;
    end if;
    return jsonb_build_object('flair',fl);
  elsif p_kind='theme' then
    if coalesce(p_item,'')='' then
      update profiles set team_theme=null where id=uid;
    else
      select data into d from user_items where user_id=uid and item_id=p_item and item_id like 'theme:%';
      if not found then raise exception 'You do not own that theme'; end if;
      th:=jsonb_build_object('id',p_item)||d;
      update profiles set team_theme=th where id=uid;
    end if;
    return jsonb_build_object('team_theme',th);
  end if;
  raise exception 'Unknown item type';
end $$;

revoke all on function shop_buy_flair(text) from public,anon;
revoke all on function shop_buy_theme(text,text,text,text) from public,anon;
revoke all on function shop_pin_post(uuid,text) from public,anon;
revoke all on function shop_equip(text,text) from public,anon;
grant execute on function shop_buy_flair(text) to authenticated;
grant execute on function shop_buy_theme(text,text,text,text) to authenticated;
grant execute on function shop_pin_post(uuid,text) to authenticated;
grant execute on function shop_equip(text,text) to authenticated;

notify pgrst,'reload schema';
