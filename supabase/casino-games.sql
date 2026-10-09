-- Sidelyne Sports: CASINO extra games: COIN FLIP + 3 POKER GAMES. Free play only, chips have no cash value.
-- These games bet and pay in Sidelyne CHIPS (not SP). Run chips.sql first, then this file. Safe to re-run.
-- Every card and every flip is decided on the server. The deck and the dealer's hidden cards never reach the browser
-- until the hand is over, so nobody can peek or tamper with the odds. The app only draws what the server sends back.
--
-- THE GAMES   (all numbers marked <== TUNE can be changed, then re-run this file)
--   Coin Flip         coin_flip(bet, side)     Fair 50/50 coin. A win pays 1.95x your bet (house edge 2.5%). Min bet 10.
--   Video Poker       vp_deal(bet) -> vp_draw(holds)   Jacks or Better, 8/5 pay table, ~97.3% return with perfect play.
--                     Pays (x bet): Royal 800, Straight flush 50, Four of a kind 25, Full house 8, Flush 5, Straight 4,
--                     Three of a kind 3, Two pair 2, Jacks or better 1.
--   Three Card Poker  tc_deal(ante, pair_plus) -> tc_act('play'|'fold')   Beat the dealer. Play bet = your ante.
--                     Dealer needs Queen-high to qualify. Ante bonus: straight 1:1, trips 4:1, straight flush 5:1.
--                     Pair Plus (optional, pays whatever the dealer has): pair 1:1, flush 4:1, straight 6:1, trips 30:1, SF 40:1.
--   Texas Hold'em     hc_deal(ante) -> hc_act('call'|'fold')   Casino Hold'em vs the dealer. Ante, see your 2 cards and the flop,
--                     then call 2x your ante or fold. Dealer needs a pair of 4s to qualify. Ante pays 1:1 when you win.
--                     Call pays 1:1, flush 2:1, full house 3:1, quads 10:1, straight flush 20:1, royal flush 100:1.
--   NOTE: house edges are estimated from standard casino math, not simulated. Run a simulation before changing pay tables.

create table if not exists casino_rounds(
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  game text not null,
  wagered int not null,
  payout int not null,
  created_at timestamptz not null default now());
create index if not exists idx_casino_rounds_user on casino_rounds(user_id,created_at desc);
alter table casino_rounds enable row level security;
drop policy if exists czr_sel on casino_rounds;
create policy czr_sel on casino_rounds for select using(auth.uid()=user_id);
grant select on casino_rounds to authenticated;

-- hands in progress (no policies and no grants: the deck is never readable from the browser)
create table if not exists vp_active(
  user_id uuid primary key references profiles(id) on delete cascade,
  bet int not null, deck text[] not null, hand text[] not null,
  created_at timestamptz not null default now());
create table if not exists tc_active(
  user_id uuid primary key references profiles(id) on delete cascade,
  ante int not null, pp int not null default 0, p text[] not null, d text[] not null,
  created_at timestamptz not null default now());
create table if not exists hc_active(
  user_id uuid primary key references profiles(id) on delete cascade,
  ante int not null, p text[] not null, d text[] not null, b text[] not null,
  created_at timestamptz not null default now());
alter table vp_active enable row level security;
alter table tc_active enable row level security;
alter table hc_active enable row level security;
revoke all on vp_active from public,anon,authenticated;
revoke all on tc_active from public,anon,authenticated;
revoke all on hc_active from public,anon,authenticated;

-- ============ card helpers (a card is rank + suit, e.g. 'AS', 'TH', '7C'; T = ten) ============
create or replace function cz_rank(c text) returns int language sql immutable as $$
  select case substr(c,1,1) when 'T' then 10 when 'J' then 11 when 'Q' then 12 when 'K' then 13 when 'A' then 14 else substr(c,1,1)::int end $$;

create or replace function cz_deck() returns text[] language sql volatile as $$
  select array_agg(r||s order by random())
  from unnest(array['2','3','4','5','6','7','8','9','T','J','Q','K','A']) r
  cross join unnest(array['S','H','D','C']) s $$;

-- Hand score. score = category * 15^5 + tie-break ranks (grouped by count, highest first), so a bigger score is a better hand.
--   5 cards: 0 high card, 1 pair, 2 two pair, 3 trips, 4 straight, 5 flush, 6 full house, 7 quads, 8 straight flush
--   3 cards: 0 high card, 1 pair, 2 flush, 3 straight, 4 trips, 5 straight flush
create or replace function cz_score(cards text[],p_three boolean) returns bigint language plpgsql immutable as $$
declare n int:=array_length(cards,1); rk int[]; key int[]; mx int; grp int; fl boolean; st boolean; cat int; sc bigint:=0; k int;
begin
  select array_agg(cz_rank(c) order by cz_rank(c) desc) into rk from unnest(cards) c;
  select array_agg(x.r order by x.n desc,x.r desc),max(x.n),count(*) into key,mx,grp
    from (select cz_rank(c) r,count(*) n from unnest(cards) c group by 1) x;
  fl:=(select count(distinct substr(c,2,1)) from unnest(cards) c)=1;
  st:=grp=n and (rk[1]-rk[n]=n-1 or (rk[1]=14 and rk[2]=n and rk[n]=2));   -- the second test is the ace-low straight (A-2-3 or A-2-3-4-5)
  if st then key:=array[case when rk[1]=14 and rk[2]=n then n else rk[1] end]; end if;
  if p_three then
    cat:=case when st and fl then 5 when mx=3 then 4 when st then 3 when fl then 2 when mx=2 then 1 else 0 end;
  else
    cat:=case when st and fl then 8 when mx=4 then 7 when mx=3 and grp=2 then 6 when fl then 5 when st then 4
              when mx=3 then 3 when mx=2 and grp=3 then 2 when mx=2 then 1 else 0 end;
  end if;
  for k in 1..coalesce(array_length(key,1),0) loop sc:=sc+key[k]*power(15,5-k)::bigint; end loop;
  return cat*759375::bigint+sc;
end $$;

-- best 5-card hand out of 7 cards
create or replace function cz_best7(cards text[]) returns bigint language plpgsql immutable as $$
declare i int; j int; k int; sub text[]; s bigint; best bigint:=-1;
begin
  for i in 1..6 loop
    for j in i+1..7 loop
      sub:='{}'; for k in 1..7 loop if k<>i and k<>j then sub:=sub||cards[k]; end if; end loop;
      s:=cz_score(sub,false); if s>best then best:=s; end if;
    end loop;
  end loop;
  return best;
end $$;

create or replace function cz_name(p_score bigint,p_three boolean) returns text language sql immutable as $$
  select case
    when p_three then (array['High card','Pair','Flush','Straight','Three of a kind','Straight flush'])[(p_score/759375)::int+1]
    when p_score/759375=8 and (p_score%759375)/50625=14 then 'Royal flush'
    else (array['High card','Pair','Two pair','Three of a kind','Straight','Flush','Full house','Four of a kind','Straight flush'])[(p_score/759375)::int+1]
  end $$;

-- ============ money helpers ============
create or replace function cz_take(p_uid uuid,p_amt int,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare bal int;
begin
  select chips into bal from profiles where id=p_uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_amt then raise exception 'Not enough chips: you have %, you need %',bal,p_amt; end if;
  update profiles set chips=chips-p_amt where id=p_uid;
end $$;

create or replace function cz_pay(p_uid uuid,p_pay bigint,p_wagered int,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare pay int:=least(p_pay,1000000000)::int;
begin
  if pay>0 then perform chip_credit(p_uid,pay); end if;
end $$;

create or replace function cz_nv(p_uid uuid) returns int language sql stable security definer set search_path=public as $$
  select chips from profiles where id=p_uid $$;

-- ============ COIN FLIP ============
create or replace function coin_flip(p_bet int,p_side text) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_min constant int:=10;        -- <== TUNE: smallest bet (must be 10 or more so a win always pays a profit)
  c_max constant int:=100000;    -- <== TUNE: biggest bet
  c_pct constant int:=95;        -- <== TUNE: a win returns bet + bet*95/100 (1.95x). 100 would be a fair 2x.
  res text; pay int:=0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_side is null or p_side not in ('heads','tails') then raise exception 'Pick heads or tails'; end if;
  if p_bet is null or p_bet<c_min or p_bet>c_max then raise exception 'Bet must be between % and % chips',c_min,c_max; end if;
  if exists(select 1 from casino_rounds where user_id=uid and game='coin' and created_at>now()-interval '1 second') then raise exception 'Slow down'; end if;
  perform cz_take(uid,p_bet,'Coin flip bet');
  res:=case when random()<0.5 then 'heads' else 'tails' end;
  if res=p_side then
    pay:=p_bet+floor(p_bet::numeric*c_pct/100)::int;
    perform cz_pay(uid,pay,p_bet,'Coin flip win');
  end if;
  insert into casino_rounds(user_id,game,wagered,payout) values(uid,'coin',p_bet,pay);
  return jsonb_build_object('result',res,'win',pay>0,'payout',pay,'chips',cz_nv(uid));
end $$;

-- ============ VIDEO POKER (Jacks or Better) ============
create or replace function vp_deal(p_bet int) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c_min constant int:=1; c_max constant int:=100000; dk text[];
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_bet is null or p_bet<c_min or p_bet>c_max then raise exception 'Bet must be between % and % chips',c_min,c_max; end if;
  if exists(select 1 from vp_active where user_id=uid) then raise exception 'Finish your current hand first'; end if;
  perform cz_take(uid,p_bet,'Video poker bet');
  dk:=cz_deck();
  insert into vp_active(user_id,bet,deck,hand) values(uid,p_bet,dk,dk[1:5]);
  return jsonb_build_object('hand',to_jsonb(dk[1:5]),'bet',p_bet,'chips',cz_nv(uid));
end $$;

create or replace function vp_draw(p_holds boolean[]) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g vp_active; hd text[]; i int; nx int:=5; s bigint; cat int; hi int; mult int:=0; pay bigint:=0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into g from vp_active where user_id=uid for update;
  if not found then raise exception 'No hand in progress'; end if;
  if p_holds is null or array_length(p_holds,1)<>5 then raise exception 'Invalid cards to hold'; end if;
  hd:=g.hand;
  for i in 1..5 loop
    if not coalesce(p_holds[i],false) then nx:=nx+1; hd[i]:=g.deck[nx]; end if;
  end loop;
  s:=cz_score(hd,false); cat:=(s/759375)::int; hi:=((s%759375)/50625)::int;
  mult:=case cat                                   -- <== TUNE: pay table (x bet)
    when 8 then case when hi=14 then 800 else 50 end
    when 7 then 25 when 6 then 8 when 5 then 5 when 4 then 4 when 3 then 3 when 2 then 2
    when 1 then case when hi>=11 then 1 else 0 end
    else 0 end;
  pay:=g.bet::bigint*mult;
  perform cz_pay(uid,pay,g.bet,'Video poker win');
  insert into casino_rounds(user_id,game,wagered,payout) values(uid,'vpoker',g.bet,least(pay,1000000000)::int);
  delete from vp_active where user_id=uid;
  return jsonb_build_object('hand',to_jsonb(hd),'holds',to_jsonb(p_holds),'name',cz_name(s,false),'mult',mult,
    'bet',g.bet,'payout',least(pay,1000000000)::int,'chips',cz_nv(uid));
end $$;

create or replace function vp_state() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g vp_active;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into g from vp_active where user_id=uid;
  if not found then return null; end if;
  return jsonb_build_object('hand',to_jsonb(g.hand),'bet',g.bet,'chips',cz_nv(uid));
end $$;

-- ============ THREE CARD POKER ============
create or replace function tc_deal(p_ante int,p_pp int) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c_min constant int:=1; c_max constant int:=100000; bal int; dk text[];
begin
  if uid is null then raise exception 'Not signed in'; end if;
  p_pp:=coalesce(p_pp,0);
  if p_ante is null or p_ante<c_min or p_ante>c_max then raise exception 'Ante must be between % and % chips',c_min,c_max; end if;
  if p_pp<0 or p_pp>c_max then raise exception 'Pair Plus must be between 0 and % chips',c_max; end if;
  if exists(select 1 from tc_active where user_id=uid) then raise exception 'Finish your current hand first'; end if;
  select chips into bal from profiles where id=uid for update;
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_ante*2+p_pp then raise exception 'Not enough chips: you need % (ante + play bet + Pair Plus), you have %',p_ante*2+p_pp,bal; end if;
  perform cz_take(uid,p_ante+p_pp,'Three card poker bet');
  dk:=cz_deck();
  insert into tc_active(user_id,ante,pp,p,d) values(uid,p_ante,p_pp,dk[1:3],dk[4:6]);
  return jsonb_build_object('p',to_jsonb(dk[1:3]),'ante',p_ante,'pp',p_pp,'chips',cz_nv(uid));
end $$;

create or replace function tc_act(p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g tc_active; sp bigint; sd bigint; cp int; cd int; qual boolean; ppay bigint:=0; pay bigint:=0;
  wag int; res text; bonus bigint:=0;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_action is null or p_action not in ('play','fold') then raise exception 'Unknown action'; end if;
  select * into g from tc_active where user_id=uid for update;
  if not found then raise exception 'No hand in progress'; end if;
  sp:=cz_score(g.p,true); sd:=cz_score(g.d,true); cp:=(sp/759375)::int; cd:=(sd/759375)::int;
  wag:=g.ante+g.pp;
  if g.pp>0 then   -- Pair Plus pays whatever the dealer has, even if you fold. <== TUNE (stake + win)
    ppay:=g.pp::bigint*case cp when 5 then 41 when 4 then 31 when 3 then 7 when 2 then 5 when 1 then 2 else 0 end;
  end if;
  pay:=ppay;
  if p_action='fold' then
    res:='fold';
  else
    perform cz_take(uid,g.ante,'Three card poker play bet'); wag:=wag+g.ante;
    qual:=cd>=1 or ((sd%759375)/50625)>=12;   -- pair or better, or Queen-high or better
    bonus:=g.ante::bigint*case cp when 5 then 5 when 4 then 4 when 3 then 1 else 0 end;   -- ante bonus, paid whatever the dealer has
    if not qual then res:='noqual'; pay:=pay+g.ante::bigint*3;      -- ante pays 1:1 (2x back), play bet is returned (1x)
    elsif sp>sd then res:='win'; pay:=pay+g.ante::bigint*4;         -- ante and play both pay 1:1
    elsif sp<sd then res:='lose';
    else res:='push'; pay:=pay+g.ante::bigint*2; end if;            -- ante and play are returned
    pay:=pay+bonus;
  end if;
  perform cz_pay(uid,pay,wag,'Three card poker win');
  insert into casino_rounds(user_id,game,wagered,payout) values(uid,'tcpoker',wag,least(pay,1000000000)::int);
  delete from tc_active where user_id=uid;
  return jsonb_build_object('done',true,'p',to_jsonb(g.p),'d',to_jsonb(g.d),'result',res,
    'p_name',cz_name(sp,true),'d_name',cz_name(sd,true),'qualified',case when p_action='fold' then null else qual end,
    'bonus',bonus,'pp_pay',ppay,'payout',least(pay,1000000000)::int,'wagered',wag,'chips',cz_nv(uid));
end $$;

create or replace function tc_state() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g tc_active;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into g from tc_active where user_id=uid;
  if not found then return null; end if;
  return jsonb_build_object('p',to_jsonb(g.p),'ante',g.ante,'pp',g.pp,'chips',cz_nv(uid));
end $$;

-- ============ TEXAS HOLD'EM (vs the dealer) ============
create or replace function hc_deal(p_ante int) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c_min constant int:=1; c_max constant int:=100000; bal int; dk text[];
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_ante is null or p_ante<c_min or p_ante>c_max then raise exception 'Ante must be between % and % chips',c_min,c_max; end if;
  if exists(select 1 from hc_active where user_id=uid) then raise exception 'Finish your current hand first'; end if;
  select chips into bal from profiles where id=uid for update;
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_ante*3 then raise exception 'Not enough chips: you need % (ante + the 2x call bet), you have %',p_ante*3,bal; end if;
  perform cz_take(uid,p_ante,'Hold em ante');
  dk:=cz_deck();
  insert into hc_active(user_id,ante,p,d,b) values(uid,p_ante,dk[1:2],dk[3:4],dk[5:9]);
  return jsonb_build_object('p',to_jsonb(dk[1:2]),'board',to_jsonb(dk[5:7]),'ante',p_ante,'chips',cz_nv(uid));
end $$;

create or replace function hc_act(p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g hc_active; sp bigint; sd bigint; cp int; cd int; qual boolean; pay bigint:=0; wag int; res text; cm int:=1;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_action is null or p_action not in ('call','fold') then raise exception 'Unknown action'; end if;
  select * into g from hc_active where user_id=uid for update;
  if not found then raise exception 'No hand in progress'; end if;
  sp:=cz_best7(g.p||g.b); sd:=cz_best7(g.d||g.b); cp:=(sp/759375)::int; cd:=(sd/759375)::int;
  wag:=g.ante;
  if p_action='fold' then
    res:='fold';
  else
    perform cz_take(uid,g.ante*2,'Hold em call bet'); wag:=g.ante*3;
    qual:=cd>=2 or (cd=1 and ((sd%759375)/50625)>=4);   -- dealer needs a pair of 4s or better
    cm:=case cp when 8 then case when (sp%759375)/50625=14 then 100 else 20 end when 7 then 10 when 6 then 3 when 5 then 2 else 1 end;  -- <== TUNE: call bet odds
    if not qual then res:='noqual'; pay:=g.ante::bigint*4;                         -- ante pays 1:1, call bet is returned
    elsif sp>sd then res:='win'; pay:=g.ante::bigint*2+(g.ante::bigint*2)*(1+cm);  -- ante pays 1:1, call pays by hand
    elsif sp<sd then res:='lose';
    else res:='push'; pay:=g.ante::bigint*3; end if;                               -- ante and call are returned
  end if;
  perform cz_pay(uid,pay,wag,'Hold em win');
  insert into casino_rounds(user_id,game,wagered,payout) values(uid,'holdem',wag,least(pay,1000000000)::int);
  delete from hc_active where user_id=uid;
  return jsonb_build_object('done',true,'p',to_jsonb(g.p),'d',to_jsonb(g.d),'board',to_jsonb(g.b),'result',res,
    'p_name',cz_name(sp,false),'d_name',cz_name(sd,false),'qualified',case when p_action='fold' then null else qual end,
    'call_mult',cm,'payout',least(pay,1000000000)::int,'wagered',wag,'chips',cz_nv(uid));
end $$;

create or replace function hc_state() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g hc_active;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into g from hc_active where user_id=uid;
  if not found then return null; end if;
  return jsonb_build_object('p',to_jsonb(g.p),'board',to_jsonb(g.b[1:3]),'ante',g.ante,'chips',cz_nv(uid));
end $$;

-- ============ permissions ============
revoke all on function cz_rank(text) from public,anon;
revoke all on function cz_deck() from public,anon;
revoke all on function cz_score(text[],boolean) from public,anon;
revoke all on function cz_best7(text[]) from public,anon;
revoke all on function cz_name(bigint,boolean) from public,anon;
revoke all on function cz_take(uuid,int,text) from public,anon,authenticated;
revoke all on function cz_pay(uuid,bigint,int,text) from public,anon,authenticated;
revoke all on function cz_nv(uuid) from public,anon,authenticated;
revoke all on function coin_flip(int,text) from public,anon;
revoke all on function vp_deal(int) from public,anon;
revoke all on function vp_draw(boolean[]) from public,anon;
revoke all on function vp_state() from public,anon;
revoke all on function tc_deal(int,int) from public,anon;
revoke all on function tc_act(text) from public,anon;
revoke all on function tc_state() from public,anon;
revoke all on function hc_deal(int) from public,anon;
revoke all on function hc_act(text) from public,anon;
revoke all on function hc_state() from public,anon;
grant execute on function coin_flip(int,text) to authenticated;
grant execute on function vp_deal(int) to authenticated;
grant execute on function vp_draw(boolean[]) to authenticated;
grant execute on function vp_state() to authenticated;
grant execute on function tc_deal(int,int) to authenticated;
grant execute on function tc_act(text) to authenticated;
grant execute on function tc_state() to authenticated;
grant execute on function hc_deal(int) to authenticated;
grant execute on function hc_act(text) to authenticated;
grant execute on function hc_state() to authenticated;
