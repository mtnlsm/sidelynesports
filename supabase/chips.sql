-- Sidelyne Sports: SIDELYNE CHIPS (casino currency) + SIDELYNE POINTS (SP, main currency), stats privacy, public favorites.
-- Free play only. Neither chips nor SP have any cash value.
--
-- RUN ORDER (safe to re-run):
--   1) this file (chips.sql)   after stake.sql / shop.sql / social.sql / saves.sql
--   2) slots.sql, blackjack.sql, casino-games.sql   (they now bet and pay in CHIPS)
--   3) stats.sql                                     (full casino stats + hidden stats)
--   If you ever re-run schema.sql / shop.sql / banners.sql (they reset column grants on profiles), run this file again.
--
-- HOW IT WORKS
--   * SP (profiles.novas) is the main currency: picks, stat picks, daily reward, shop, level, leaderboard.
--   * CHIPS (profiles.chips) are ONLY used in the casino (slots, blackjack, coin flip, poker).
--   * chips_exchange('to_chips'|'to_sp', amount) moves value between the two at 1 SP = 1 chip.   <== TUNE: c_rate_* below
--   * Levels and the leaderboard follow lifetime SP. Moving SP into chips and back does NOT level you up.
--     Only chips you cash out ABOVE everything you have ever converted in count as new SP earned (your casino profit).
--   * Nobody starts with chips: exchange some SP to play. Existing SP balances are not touched.

alter table profiles add column if not exists chips      int     not null default 0;
alter table profiles add column if not exists chips_in   bigint  not null default 0;   -- total SP ever converted into chips
alter table profiles add column if not exists chips_out  bigint  not null default 0;   -- total chips ever cashed out to SP
alter table profiles add column if not exists hide_stats boolean not null default false;
do $c$ begin
  alter table profiles add constraint profiles_chips_nonneg check(chips>=0);
exception when duplicate_object then null; end $c$;

-- users may change ONLY these columns (chips / chips_in / chips_out are server-controlled)
grant update(hide_stats) on profiles to authenticated;

-- ============ internal chip helpers (used by the casino functions, never callable from the browser) ============
create or replace function chip_credit(p_uid uuid,p_amt bigint) returns void language plpgsql security definer set search_path=public as $$
begin
  if coalesce(p_amt,0)<=0 then return; end if;
  update profiles set chips=least(chips::bigint+p_amt,2000000000)::int where id=p_uid;
end $$;

create or replace function chip_take(p_uid uuid,p_amt int) returns void language plpgsql security definer set search_path=public as $$
declare bal int;
begin
  select chips into bal from profiles where id=p_uid for update;   -- lock the balance so two taps can never overspend
  if bal is null then raise exception 'Profile not found'; end if;
  if bal<p_amt then raise exception 'Not enough chips: you have %, you need %',bal,p_amt; end if;
  update profiles set chips=chips-p_amt where id=p_uid;
end $$;
revoke all on function chip_credit(uuid,bigint) from public,anon,authenticated;
revoke all on function chip_take(uuid,int) from public,anon,authenticated;

-- ============ EXCHANGE: SP <-> chips ============
create or replace function chips_exchange(p_dir text,p_amount int) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  uid uuid:=auth.uid(); p profiles;
  c_max  constant int:=1000000000;      -- <== TUNE: biggest single exchange
  c_rate_to_chips constant int:=1;      -- <== TUNE: chips you get for 1 SP
  c_rate_to_sp    constant int:=1;      -- <== TUNE: chips you must hand in for 1 SP (keep both at 1 for a fair 1:1 exchange)
  got bigint; cost bigint; new_out bigint; credited bigint;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_dir is null or p_dir not in ('to_chips','to_sp') then raise exception 'Unknown exchange'; end if;
  if p_amount is null or p_amount<1 or p_amount>c_max then raise exception 'Enter an amount between 1 and %',c_max; end if;
  select * into p from profiles where id=uid for update;
  if not found then raise exception 'Profile not found'; end if;

  if p_dir='to_chips' then
    -- p_amount = SP you hand in
    got:=p_amount::bigint*c_rate_to_chips;
    if p.novas<p_amount then raise exception 'Not enough SP: you have %, you need %',p.novas,p_amount; end if;
    if p.chips::bigint+got>2000000000 then raise exception 'That would put you over the chip limit'; end if;
    update profiles set novas=novas-p_amount,chips=(chips+got)::int,chips_in=chips_in+got where id=uid;
    insert into nova_transactions(user_id,amount,reason,ref) values(uid,-p_amount,'Exchanged SP for chips',gen_random_uuid()::text);
  else
    -- p_amount = chips you hand in
    cost:=p_amount;
    if p.chips<cost then raise exception 'Not enough chips: you have %, you need %',p.chips,cost; end if;
    got:=cost/c_rate_to_sp;
    if got<1 then raise exception 'Hand in at least % chip(s) to get 1 SP',c_rate_to_sp; end if;
    if p.novas::bigint+got>2000000000 then raise exception 'That would put you over the SP limit'; end if;
    -- only chips cashed out above everything ever converted in count toward level (your casino profit)
    new_out:=p.chips_out+cost;
    credited:=greatest(0,new_out-greatest(p.chips_out,p.chips_in));
    perform set_config('sidelyne.life_skip',greatest(got-credited,0)::text,true);
    update profiles set novas=(novas+got)::int,chips=(chips-cost)::int,chips_out=new_out where id=uid;
    perform set_config('sidelyne.life_skip','0',true);
    insert into nova_transactions(user_id,amount,reason,ref) values(uid,got,'Exchanged chips for SP',gen_random_uuid()::text);
  end if;

  select * into p from profiles where id=uid;
  return jsonb_build_object('novas',p.novas,'chips',p.chips,'lifetime',p.lifetime_novas,'dir',p_dir,'got',got);
end $$;
revoke all on function chips_exchange(text,int) from public,anon;
grant execute on function chips_exchange(text,int) to authenticated;

-- ============ FAVORITES ARE PUBLIC (everyone can see anyone's favorite teams and fighters) ============
drop policy if exists uf_sel on user_favs;
create policy uf_sel on user_favs for select using(true);
grant select on user_favs to anon,authenticated;

notify pgrst,'reload schema';
