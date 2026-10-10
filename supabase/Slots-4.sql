-- SLOTS 4: OG Pinball. Run in the Supabase SQL editor after Slots-3.sql. Safe to re-run. Any future pinball tuning goes in THIS file.
--   1) BONUS: 6 shots on every bet. Each ball lands in one of 6 pockets (x2 to x9 your bet), or rarely in the DIAMOND chamber:
--      5 diamond slots that fill left to right and pay x25, x30, x40, x60 and x100 (each one is worth more than the biggest pocket).
--      A bonus is worth about x25 your bet on average and triggers about once in 150 spins.
--   2) PAIRS: 2 matching symbols next to each other (left two reels, or middle and right) pay x0.35 to x1.10 your bet (see slots_play_p).
--   3) 3 in a row pays slots_mult x c_k (c_k = 1.00).
--   4) Payback: raw return 0.744 (bonus 0.167 + line 0.420 + pairs 0.157), times the bet-size factor and the 1.02 machine factor =
--      about 92% on tiny bets up to about 98% at 9,000+ chips.
--   public/slots.js must match (PK, PAIR, PBX, PBC and the help text).
--   Everything is decided here; public/slots.js only plays the animation.

create or replace function slots_pb_shots(p_bet int) returns int language sql immutable as $$ select 6 $$;   -- <== TUNE: shots per bonus (the same on every bet)

-- slots_pb_ev = average total bonus pay (x bet) for 6 shots. If you change the numbers in slots_pb_play, recompute it (and the 0.1679 in slots_spin).
create or replace function slots_pb_ev(p_shots int) returns numeric language sql immutable as $$ select 25.0798::numeric $$;

create or replace function slots_pb_play(p_bet int,p_adj numeric,p_shots int) returns jsonb language plpgsql volatile as $$
declare
  pv  constant numeric[]:=array[2,3,4,5,7,9];     -- <== TUNE: the 6 pocket prizes (x your bet)
  pw  constant int[]:=array[28,24,20,14,9,5];       -- <== TUNE: chance of each pocket (out of 100, when the ball misses the diamond chamber)
  cv  constant numeric[]:=array[25,30,40,60,100];   -- <== TUNE: the 5 diamond slots, filled left to right
  c_pc constant numeric:=0.015;                     -- <== TUNE: chance per ball of landing in the diamond chamber
  i int; k int; sel int; acc int; r numeric; cnt int:=0; kind text; idx int; mult numeric; pay bigint; run bigint:=0; shots jsonb:='[]'::jsonb;
begin
  for i in 1..p_shots loop
    if cnt<5 and random()<c_pc then
      cnt:=cnt+1; kind:='c'; idx:=cnt-1; mult:=cv[cnt];
    else
      r:=random()*100; acc:=0; sel:=6;
      for k in 1..6 loop acc:=acc+pw[k]; if r<acc then sel:=k; exit; end if; end loop;
      kind:='u'; idx:=sel-1; mult:=pv[sel];
    end if;
    pay:=round(mult*p_bet*p_adj)::bigint; run:=run+pay;
    shots:=shots||jsonb_build_array(jsonb_build_object('n',i,'kind',kind,'idx',idx,'mult',mult,'pay',pay,'run',run));
  end loop;
  return jsonb_build_object('shots',shots,'pay',run);
end $$;

-- OG PINBALL grid: 3 reels x 1 row, ONE payline.
--   3 in a row pays slots_mult x c_k (c_k was 1.61, now 1.20: the line pays a bit less so that pairs and the bigger bonus fit in the same payback).
--   2 in a row (left two reels, or middle and right reels) pays the small pair prize below, x your bet.   <== TUNE c_k and the pair prizes
create or replace function slots_play_p(p_unit numeric,p_adj numeric,p_scat int,p_x int) returns jsonb language plpgsql volatile as $$
declare
  pool constant text[]:=array_fill('t1'::text,array[24])||array_fill('t2'::text,array[22])||array_fill('t3'::text,array[18])||array_fill('t4'::text,array[14])||array_fill('t5'::text,array[12])||array_fill('t6'::text,array[10]);
  c_k constant numeric:=1.00;
  g text[]:=array['x','x','x']; c int; lp numeric; pay numeric:=0; scat int:=0; pm numeric; fromc int;
  wins jsonb:='[]'::jsonb; reels jsonb:='[]'::jsonb;
begin
  for c in 1..3 loop g[c]:=pool[1+floor(random()*array_length(pool,1))::int]; end loop;
  if p_scat>0 then g[3]:='S'; end if;   -- the diamond only ever shows on the RIGHT reel
  if g[1]<>'S' and g[2]=g[1] and g[3]=g[1] then
    lp:=slots_mult(g[1],3)*p_unit*p_adj*p_x*c_k; pay:=lp;
    wins:=jsonb_build_array(jsonb_build_object('line',0,'sym',g[1],'count',3,'from',0,'pay',round(lp)::bigint));
  elsif g[1]<>'S' and g[2]=g[1] then fromc:=0;
  elsif g[3]<>'S' and g[3]=g[2] then fromc:=1;
  end if;
  if fromc is not null then
    pm:=case g[2] when 't1' then 0.35 when 't2' then 0.45 when 't3' then 0.55 when 't4' then 0.65 when 't5' then 0.85 else 1.10 end;   -- <== TUNE: pair prize x your bet
    lp:=pm*p_unit*p_adj*p_x; pay:=lp;
    wins:=jsonb_build_array(jsonb_build_object('line',0,'sym',g[2],'count',2,'from',fromc,'pay',round(lp)::bigint));
  end if;
  for c in 1..3 loop
    reels:=reels||jsonb_build_array(jsonb_build_array(g[c]));
    if g[c]='S' then scat:=scat+1; end if;
  end loop;
  return jsonb_build_object('reels',reels,'wins',wins,'pay',least(round(pay)::bigint,1000000000),'scatters',scat);
end $$;

create or replace function slots_spin(p_bet int,p_theme text default 'classic') returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid();
  c_min     constant int:=1;           -- <== TUNE: smallest bet
  c_max     constant int:=100000;      -- <== TUNE: biggest bet
  c_bonus_p numeric:=0.012;            -- <== TUNE: base chance of the free spins bonus on any spin (for a bonus worth 12). Scaled below by 12/value so a richer bonus triggers less often and the payback stays the same
  c_tease   constant numeric:=0.12;    -- <== TUNE: how often a normal spin shows 2 scatters as a tease
  c_ret_tot constant numeric:=0.072;   -- <== TUNE: chance of a retrigger over one round of free spins (split across the spins so every machine gets the same)
  c_rounds  constant int:=4;           -- max rounds of free spins in one bonus (first round + 3 retriggers)
  mults int[]; rws int[]; len int; c_ret numeric; c_fsmax int; mx int; rw int; unit numeric; adj numeric;
  total int; bal int; last timestamptz; roll numeric:=random(); b jsonb; f jsonb; kind text; pay bigint:=0; lpay bigint:=0; run bigint:=0;
  sc int:=0; fs_total int:=0; n int:=0; ret boolean; spins jsonb:='[]'::jsonb; flat text:=''; c int; nv int; fr jsonb; free jsonb:=null;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_bet is null or p_bet<c_min or p_bet>c_max then raise exception 'Bet must be between % and % chips',c_min,c_max; end if;
  mults:=slots_bonus_mults(p_theme); rws:=slots_bonus_rows(p_theme);
  if mults is null or rws is null then raise exception 'Unknown machine, reload the page'; end if;
  len:=array_length(mults,1); c_ret:=c_ret_tot/len; c_fsmax:=len*c_rounds;
  c_bonus_p:=c_bonus_p*12.0/(select sum(tm*tr/3.0) from unnest(mults,rws) as t(tm,tr));
  if p_theme='pinball' then c_bonus_p:=0.1672/slots_pb_ev(slots_pb_shots(p_bet)); end if;   -- pinball: the bonus is worth about 25x your bet, so it triggers about once in 150 spins (0.1672 = the bonus share of the payback)   <== TUNE
  c_bonus_p:=c_bonus_p*slots_theme_bon(p_theme);   -- each machine has its own bonus frequency
  total:=p_bet; unit:=p_bet/case when p_theme='pinball' then 1.0 else 9.0 end; adj:=slots_adj_bet(p_bet)*slots_theme_pay(p_theme);   -- each machine has its own payback

  select chips into bal from profiles where id=uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<total then raise exception 'Not enough chips: you have %, you need %',bal,total; end if;
  select max(created_at) into last from slot_spins where user_id=uid;
  if last is not null and last>now()-interval '1 second' then raise exception 'Slow down'; end if;

  if roll<c_bonus_p then
    kind:='bonus'; sc:=3;
  elsif p_theme<>'pinball' and random()<c_tease then
    sc:=2;
  else
    sc:=0;
  end if;
  if p_theme='pinball' then b:=slots_play_p(unit,adj,sc,1); else b:=slots_play_b(9,unit,adj,sc,1,3); end if;
  lpay:=(b->>'pay')::bigint; pay:=lpay;

  if kind='bonus' and p_theme='pinball' then
    f:=slots_pb_play(p_bet,adj,slots_pb_shots(p_bet)); run:=(f->>'pay')::bigint; pay:=pay+run;
    free:=jsonb_build_object('theme',p_theme,'pinball',true,'start',slots_pb_shots(p_bet),'shots',f->'shots');
  elsif kind='bonus' then
    fs_total:=len;
    while n<fs_total loop
      n:=n+1;
      mx:=mults[1+((n-1)%len)]; rw:=case when p_theme='pinball' then 1 else rws[1+((n-1)%len)] end;
      ret:=fs_total<c_fsmax and random()<c_ret;
      if p_theme='pinball' then f:=slots_play_p(unit,adj,case when ret then 3 else 0 end,mx);
      else f:=slots_play_b(9,unit,adj,case when ret then 3 else 0 end,mx,rw); end if;
      if ret then fs_total:=fs_total+len; end if;
      run:=run+(f->>'pay')::bigint;
      spins:=spins||jsonb_build_array(jsonb_build_object('n',n,'x',mx,'rows',rw,'reels',f->'reels','wins',f->'wins','pay',(f->>'pay')::bigint,'run',run,'retrigger',ret,'total',fs_total));
    end loop;
    pay:=pay+run;
    free:=jsonb_build_object('start',len,'round',len,'theme',p_theme,'spins',spins);
  elsif pay>0 then kind:='lines'; else kind:='lose'; end if;
  pay:=least(pay,1000000000);

  update profiles set chips=chips-total where id=uid;
  if pay>0 then perform chip_credit(uid,pay); end if;

  fr:=b->'reels';
  select string_agg((select string_agg(v,',' order by o) from jsonb_array_elements_text(col) with ordinality as e(v,o)),'|' order by k) into flat from jsonb_array_elements(fr) with ordinality as cc(col,k);
  insert into slot_spins(user_id,bet,reels,kind,payout,denom,lines,cpl,theme) values(uid,total,flat,kind,pay::int,null,case when p_theme='pinball' then 1 else 9 end,null,p_theme);
  select chips into nv from profiles where id=uid;
  return jsonb_build_object('reels',b->'reels','kind',kind,'bet',total,'lines',case when p_theme='pinball' then 1 else 9 end,'theme',p_theme,'payout',pay,'line_pay',lpay,'wins',b->'wins','scatters',(b->>'scatters')::int,'free',free,'chips',nv);
end $$;

revoke all on function slots_play_p(numeric,numeric,int,int) from public,anon,authenticated;
revoke all on function slots_pb_play(int,numeric,int) from public,anon,authenticated;
revoke all on function slots_spin(int,text) from public,anon;
grant execute on function slots_spin(int,text) to authenticated;
notify pgrst,'reload schema';
