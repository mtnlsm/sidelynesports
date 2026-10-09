-- Sidelyne Sports: CASINO BLACKJACK (5 table styles). Free play only, chips have no cash value.
-- Bets and payouts are in Sidelyne CHIPS (not SP). Run chips.sql first, then this file. Safe to re-run.
-- Every card is dealt on the server. The shoe and the dealer's face-down card never reach the browser until the hand is over,
-- so nobody can peek or tamper with the odds. The app only draws what the server sends back.
--
-- HOW A HAND WORKS
--   bj_start(variant, bet)  deals the hand and takes your bet (1 to 100,000 SP).
--   bj_act(action)          hit | stand | double | split | surrender, one call per decision.
--   bj_state()              returns the hand in progress (so a refresh or closed window never loses a hand), or null.
--   Doubling and splitting take an extra bet equal to the hand's bet. You can only have one hand in progress at a time.
--   A fresh shoe is shuffled for EVERY hand, so card counting does not work.
--
-- THE 5 TABLES (rules live in bj_rules below)   <== TUNE
--   classic   Classic 21      6 decks, dealer stands on all 17s, blackjack pays 3:2, double any two cards, double after split, split up to 2 hands.
--   original  Sidelyne 21     Our own rules: 6 decks, dealer hits soft 17, blackjack pays 7:5, FIVE-CARD CHARLIE (5 cards without busting
--                             wins 1:1 no matter what the dealer has), late surrender, no double after split.
--   exposed   Double Exposure Both dealer cards face up. Blackjack pays only 1:1 and the dealer wins ties (except blackjack vs blackjack, a push).
--   strip     Vegas Strip     4 decks, dealer stands on soft 17, blackjack pays 3:2, late surrender, split up to 4 hands.
--   single    Single Deck     1 deck, blackjack pays 7:5, you may only double on 9, 10 or 11.
--   Insurance and even money are not offered. Split aces get one card each. Dealer peeks for blackjack with an ace or ten showing.
--   NOTE: house edge per table is estimated from standard blackjack math, not simulated. Run a simulation before changing rules.

create table if not exists bj_active(
  user_id uuid primary key references profiles(id) on delete cascade,
  variant text not null,
  shoe text[] not null,
  pos int not null default 0,          -- how many cards of the shoe have been dealt
  dealer text[] not null,
  hands jsonb not null,                -- [{c:[cards],b:bet,d:done,x:doubled,sp:fromSplit,sr:surrendered,r:result,p:pay}]
  cur int not null default 0,          -- index of the hand being played
  created_at timestamptz not null default now());
alter table bj_active enable row level security;
revoke all on bj_active from public,anon,authenticated;   -- no policies: the shoe is never readable from the browser

create table if not exists bj_rounds(
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles(id) on delete cascade,
  variant text not null,
  wagered int not null,
  payout int not null,
  hands int not null default 1,
  created_at timestamptz not null default now());
create index if not exists idx_bj_rounds_user on bj_rounds(user_id,created_at desc);
alter table bj_rounds enable row level security;
drop policy if exists bjr_sel on bj_rounds;
create policy bjr_sel on bj_rounds for select using(auth.uid()=user_id);
grant select on bj_rounds to authenticated;

-- ============ rules ============
create or replace function bj_rules(p_v text) returns jsonb language sql immutable as $$
  select case p_v
    when 'classic'  then '{"decks":6,"h17":false,"bjn":3,"bjd":2,"charlie":0,"exposed":false,"tie_loses":false,"hands":2,"surr":false,"das":true,"d911":false}'::jsonb
    when 'original' then '{"decks":6,"h17":true,"bjn":7,"bjd":5,"charlie":5,"exposed":false,"tie_loses":false,"hands":2,"surr":true,"das":false,"d911":false}'::jsonb
    when 'exposed'  then '{"decks":6,"h17":true,"bjn":1,"bjd":1,"charlie":0,"exposed":true,"tie_loses":true,"hands":2,"surr":false,"das":true,"d911":false}'::jsonb
    when 'strip'    then '{"decks":4,"h17":false,"bjn":3,"bjd":2,"charlie":0,"exposed":false,"tie_loses":false,"hands":4,"surr":true,"das":true,"d911":false}'::jsonb
    when 'single'   then '{"decks":1,"h17":false,"bjn":7,"bjd":5,"charlie":0,"exposed":false,"tie_loses":false,"hands":2,"surr":false,"das":true,"d911":true}'::jsonb
    else null end $$;

-- ============ card helpers (a card is rank + suit, e.g. 'AS', 'TH', '7C'; T = ten) ============
create or replace function bj_val(c text) returns int language sql immutable as $$
  select case substr(c,1,1) when 'A' then 11 when 'T' then 10 when 'J' then 10 when 'Q' then 10 when 'K' then 10 else substr(c,1,1)::int end $$;

create or replace function bj_total(cards text[]) returns int language plpgsql immutable as $$
declare t int:=0; a int:=0; c text;
begin
  foreach c in array cards loop
    t:=t+bj_val(c);
    if substr(c,1,1)='A' then a:=a+1; end if;
  end loop;
  while t>21 and a>0 loop t:=t-10; a:=a-1; end loop;
  return t;
end $$;

create or replace function bj_is_soft(cards text[]) returns boolean language plpgsql immutable as $$
declare t int:=0; a int:=0; c text;
begin
  foreach c in array cards loop
    t:=t+bj_val(c);
    if substr(c,1,1)='A' then a:=a+1; end if;
  end loop;
  return a>0 and (t-10*a)+10<=21;   -- hard total + 10 still fits, so one ace counts as 11
end $$;

-- shuffled shoe (only the first 104 cards are kept, far more than any hand can use)
create or replace function bj_shoe(p_decks int) returns text[] language sql volatile as $$
  select (array_agg(r||s order by random()))[1:least(p_decks*52,104)]
  from unnest(array['A','2','3','4','5','6','7','8','9','T','J','Q','K']) r
  cross join unnest(array['S','H','D','C']) s
  cross join generate_series(1,p_decks) d $$;

create or replace function bj_cards(h jsonb) returns text[] language sql immutable as $$
  select coalesce(array(select jsonb_array_elements_text(h->'c')),'{}'::text[]) $$;

-- ============ what the browser is allowed to see ============
create or replace function bj_render(g bj_active,p_done boolean) returns jsonb language plpgsql stable as $$
declare
  rl jsonb:=bj_rules(g.variant); hv jsonb:='[]'::jsonb; hnd jsonb; cards text[]; i int; n int; t int; bal int;
  show boolean; acts jsonb:='[]'::jsonb; dl jsonb;
begin
  n:=jsonb_array_length(g.hands);
  for i in 0..n-1 loop
    hnd:=g.hands->i; cards:=bj_cards(hnd);
    hv:=hv||jsonb_build_array(jsonb_build_object('cards',hnd->'c','bet',hnd->'b','total',bj_total(cards),'soft',bj_is_soft(cards),
      'done',hnd->'d','doubled',hnd->'x','split',hnd->'sp','result',hnd->'r','pay',hnd->'p'));
  end loop;
  show:=p_done or (rl->>'exposed')::boolean;
  dl:=case when show then to_jsonb(g.dealer) else jsonb_build_array(g.dealer[1]) end;
  if not p_done then
    hnd:=g.hands->g.cur; cards:=bj_cards(hnd); t:=bj_total(cards);
    select chips into bal from profiles where id=g.user_id;
    acts:=jsonb_build_array('hit','stand');
    if array_length(cards,1)=2 then
      if ((hnd->>'sp')::boolean=false or (rl->>'das')::boolean)
         and (not (rl->>'d911')::boolean or t between 9 and 11) and bal>=(hnd->>'b')::int then
        acts:=acts||jsonb_build_array('double');
      end if;
      if bj_val(cards[1])=bj_val(cards[2]) and n<(rl->>'hands')::int and bal>=(hnd->>'b')::int then
        acts:=acts||jsonb_build_array('split');
      end if;
      if (rl->>'surr')::boolean and n=1 and (hnd->>'sp')::boolean=false then
        acts:=acts||jsonb_build_array('surrender');
      end if;
    end if;
  end if;
  return jsonb_build_object('variant',g.variant,'done',p_done,'dealer',dl,'hidden',not show,
    'dealer_total',case when show then bj_total(g.dealer) else null end,'hands',hv,'cur',g.cur,'actions',acts);
end $$;

-- ============ finish the hand: dealer plays, every hand is paid, the round is logged ============
create or replace function bj_settle(uid uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  g bj_active; rl jsonb; hs jsonb; hnd jsonb; cards text[]; dl text[]; i int; n int; t int; dt int; b int; nat boolean; dbj boolean;
  live boolean:=false; pay bigint; tot_pay bigint:=0; tot_bet bigint:=0; res text; nv int; charlie int; bjn int; bjd int;
begin
  select * into g from bj_active where user_id=uid for update;
  if not found then raise exception 'No hand in progress'; end if;
  rl:=bj_rules(g.variant); hs:=g.hands; dl:=g.dealer; n:=jsonb_array_length(hs);
  charlie:=(rl->>'charlie')::int; bjn:=(rl->>'bjn')::int; bjd:=(rl->>'bjd')::int;
  dbj:=array_length(dl,1)=2 and bj_total(dl)=21;

  -- does the dealer even need to draw? only if some hand is still alive
  for i in 0..n-1 loop
    hnd:=hs->i; cards:=bj_cards(hnd); t:=bj_total(cards);
    if not (hnd->>'sr')::boolean and t<=21
       and not (array_length(cards,1)=2 and t=21 and not (hnd->>'sp')::boolean)
       and not (charlie>0 and array_length(cards,1)>=charlie) then live:=true; end if;
  end loop;

  if live and not dbj then
    loop
      dt:=bj_total(dl);
      exit when not (dt<17 or (dt=17 and bj_is_soft(dl) and (rl->>'h17')::boolean));
      g.pos:=g.pos+1; dl:=dl||g.shoe[g.pos];
    end loop;
  end if;
  dt:=bj_total(dl); dbj:=array_length(dl,1)=2 and dt=21;

  for i in 0..n-1 loop
    hnd:=hs->i; cards:=bj_cards(hnd); b:=(hnd->>'b')::int; t:=bj_total(cards);
    nat:=array_length(cards,1)=2 and t=21 and not (hnd->>'sp')::boolean;
    if (hnd->>'sr')::boolean then res:='surrender'; pay:=b/2;
    elsif t>21 then res:='bust'; pay:=0;
    elsif nat and dbj then res:='push'; pay:=b;
    elsif nat then res:='blackjack'; pay:=b+floor(b::numeric*bjn/bjd)::bigint;
    elsif dbj then res:='lose'; pay:=0;
    elsif charlie>0 and array_length(cards,1)>=charlie then res:='charlie'; pay:=2::bigint*b;
    elsif dt>21 then res:='win'; pay:=2::bigint*b;
    elsif t>dt then res:='win'; pay:=2::bigint*b;
    elsif t=dt then
      if (rl->>'tie_loses')::boolean then res:='lose'; pay:=0; else res:='push'; pay:=b; end if;
    else res:='lose'; pay:=0;
    end if;
    hnd:=jsonb_set(jsonb_set(jsonb_set(hnd,'{r}',to_jsonb(res)),'{p}',to_jsonb(pay)),'{d}','true'::jsonb);
    hs:=jsonb_set(hs,array[i::text],hnd);
    tot_pay:=tot_pay+pay; tot_bet:=tot_bet+b;
  end loop;

  update bj_active set dealer=dl,hands=hs,pos=g.pos where user_id=uid returning * into g;
  if tot_pay>0 then perform chip_credit(uid,least(tot_pay,1000000000)); end if;
  insert into bj_rounds(user_id,variant,wagered,payout,hands) values(uid,g.variant,tot_bet::int,least(tot_pay,1000000000)::int,n);
  select chips into nv from profiles where id=uid;
  hnd:=bj_render(g,true);
  delete from bj_active where user_id=uid;
  return hnd||jsonb_build_object('chips',nv,'payout',tot_pay,'wagered',tot_bet);
end $$;

-- ============ deal ============
create or replace function bj_start(p_variant text,p_bet int) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); rl jsonb:=bj_rules(p_variant);
  c_min constant int:=1;        -- <== TUNE: smallest bet
  c_max constant int:=100000;   -- <== TUNE: biggest bet
  bal int; sh text[]; g bj_active; hnd jsonb; nv int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if rl is null then raise exception 'Unknown table, reload the page'; end if;
  if p_bet is null or p_bet<c_min or p_bet>c_max then raise exception 'Bet must be between % and % chips',c_min,c_max; end if;
  select chips into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_bet then raise exception 'Not enough chips: you have %, you need %',bal,p_bet; end if;
  if exists(select 1 from bj_active where user_id=uid) then raise exception 'Finish your current hand first'; end if;

  sh:=bj_shoe((rl->>'decks')::int);
  hnd:=jsonb_build_object('c',jsonb_build_array(sh[1],sh[3]),'b',p_bet,'d',false,'x',false,'sp',false,'sr',false,'r',null,'p',0);
  update profiles set chips=chips-p_bet where id=uid;
  insert into bj_active(user_id,variant,shoe,pos,dealer,hands,cur)
    values(uid,p_variant,sh,4,array[sh[2],sh[4]],jsonb_build_array(hnd),0) returning * into g;

  -- player blackjack, or the dealer peeks an ace / ten and has blackjack: the hand is over right away
  if bj_total(array[sh[1],sh[3]])=21 or (bj_val(sh[2])>=10 and bj_total(array[sh[2],sh[4]])=21) then
    return bj_settle(uid);
  end if;
  select chips into nv from profiles where id=uid;
  return bj_render(g,false)||jsonb_build_object('chips',nv);
end $$;

-- ============ player decisions ============
create or replace function bj_act(p_action text) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); g bj_active; rl jsonb; hs jsonb; nh jsonb; hnd jsonb; h2 jsonb; cards text[]; c2 text[]; i int; k int; n int;
  b int; t int; bal int; nv int; nxt int:=-1; charlie int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into g from bj_active where user_id=uid for update;
  if not found then raise exception 'No hand in progress'; end if;
  rl:=bj_rules(g.variant); charlie:=(rl->>'charlie')::int; hs:=g.hands; n:=jsonb_array_length(hs); i:=g.cur;
  hnd:=hs->i; cards:=bj_cards(hnd); b:=(hnd->>'b')::int; t:=bj_total(cards);
  if (hnd->>'d')::boolean then raise exception 'That hand is finished'; end if;

  if p_action='hit' then
    g.pos:=g.pos+1; cards:=cards||g.shoe[g.pos];
    hnd:=jsonb_set(hnd,'{c}',to_jsonb(cards)); t:=bj_total(cards);
    if t>=21 or (charlie>0 and array_length(cards,1)>=charlie) then hnd:=jsonb_set(hnd,'{d}','true'::jsonb); end if;
    hs:=jsonb_set(hs,array[i::text],hnd);

  elsif p_action='stand' then
    hnd:=jsonb_set(hnd,'{d}','true'::jsonb);
    hs:=jsonb_set(hs,array[i::text],hnd);

  elsif p_action='double' then
    if array_length(cards,1)<>2 then raise exception 'You can only double on your first two cards'; end if;
    if (hnd->>'sp')::boolean and not (rl->>'das')::boolean then raise exception 'No doubling after a split at this table'; end if;
    if (rl->>'d911')::boolean and t not between 9 and 11 then raise exception 'This table only lets you double on 9, 10 or 11'; end if;
    select chips into bal from profiles where id=uid for update;
    if bal<b then raise exception 'Not enough chips to double'; end if;
    update profiles set chips=chips-b where id=uid;
    g.pos:=g.pos+1; cards:=cards||g.shoe[g.pos];
    hnd:=jsonb_set(jsonb_set(jsonb_set(hnd,'{c}',to_jsonb(cards)),'{b}',to_jsonb(b*2)),'{x}','true'::jsonb);
    hnd:=jsonb_set(hnd,'{d}','true'::jsonb);
    hs:=jsonb_set(hs,array[i::text],hnd);

  elsif p_action='split' then
    if array_length(cards,1)<>2 or bj_val(cards[1])<>bj_val(cards[2]) then raise exception 'You can only split a pair'; end if;
    if n>=(rl->>'hands')::int then raise exception 'You cannot split again at this table'; end if;
    select chips into bal from profiles where id=uid for update;
    if bal<b then raise exception 'Not enough chips to split'; end if;
    update profiles set chips=chips-b where id=uid;
    c2:=array[cards[2],g.shoe[g.pos+2]]; cards:=array[cards[1],g.shoe[g.pos+1]]; g.pos:=g.pos+2;
    hnd:=jsonb_build_object('c',to_jsonb(cards),'b',b,'d',false,'x',false,'sp',true,'sr',false,'r',null,'p',0);
    h2:=jsonb_build_object('c',to_jsonb(c2),'b',b,'d',false,'x',false,'sp',true,'sr',false,'r',null,'p',0);
    if bj_val(cards[1])=11 or bj_total(cards)=21 then hnd:=jsonb_set(hnd,'{d}','true'::jsonb); end if;   -- split aces get one card
    if bj_val(c2[1])=11 or bj_total(c2)=21 then h2:=jsonb_set(h2,'{d}','true'::jsonb); end if;
    nh:='[]'::jsonb;
    for k in 0..n-1 loop
      if k=i then nh:=nh||jsonb_build_array(hnd,h2); else nh:=nh||jsonb_build_array(hs->k); end if;
    end loop;
    hs:=nh;

  elsif p_action='surrender' then
    if not (rl->>'surr')::boolean then raise exception 'Surrender is not allowed at this table'; end if;
    if n<>1 or array_length(cards,1)<>2 or (hnd->>'sp')::boolean then raise exception 'You can only surrender on your first decision'; end if;
    hnd:=jsonb_set(jsonb_set(hnd,'{sr}','true'::jsonb),'{d}','true'::jsonb);
    hs:=jsonb_set(hs,array[i::text],hnd);

  else raise exception 'Unknown action';
  end if;

  -- next hand that still needs a decision
  for k in 0..jsonb_array_length(hs)-1 loop
    if not (hs->k->>'d')::boolean then nxt:=k; exit; end if;
  end loop;
  update bj_active set hands=hs,pos=g.pos,cur=greatest(nxt,0) where user_id=uid returning * into g;
  if nxt<0 then return bj_settle(uid); end if;
  select chips into nv from profiles where id=uid;
  return bj_render(g,false)||jsonb_build_object('chips',nv);
end $$;

-- ============ resume a hand in progress ============
create or replace function bj_state() returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); g bj_active; nv int;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into g from bj_active where user_id=uid;
  if not found then return null; end if;
  select chips into nv from profiles where id=uid;
  return bj_render(g,false)||jsonb_build_object('chips',nv);
end $$;

revoke all on function bj_rules(text) from public,anon;
revoke all on function bj_val(text) from public,anon;
revoke all on function bj_total(text[]) from public,anon;
revoke all on function bj_is_soft(text[]) from public,anon;
revoke all on function bj_shoe(int) from public,anon;
revoke all on function bj_cards(jsonb) from public,anon;
revoke all on function bj_render(bj_active,boolean) from public,anon,authenticated;
revoke all on function bj_settle(uuid) from public,anon,authenticated;
revoke all on function bj_start(text,int) from public,anon;
revoke all on function bj_act(text) from public,anon;
revoke all on function bj_state() from public,anon;
grant execute on function bj_start(text,int) to authenticated;
grant execute on function bj_act(text) to authenticated;
grant execute on function bj_state() to authenticated;
notify pgrst,'reload schema';
