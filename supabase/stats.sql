-- Sidelyne Sports: PROFILE STATS (game picks, stat picks, FULL CASINO, community, overall). Safe to re-run.
-- Run in Supabase SQL Editor AFTER chips.sql, stake.sql, slots.sql, blackjack.sql and casino-games.sql
-- (needs user_picks, prop_picks, props, slot_spins, bj_rounds, casino_rounds, post_likes, follows and profiles.chips / hide_stats).
-- Casino stats cover every game: slots, blackjack (all tables), coin flip, video poker, three card poker, hold'em. Amounts are in chips.
-- If the player turned on "Hide my stats" in Settings, everyone except the player gets {hidden:true} and nothing else.
-- One call returns every stat for a profile. It is read-only and security definer so that OTHER people's profiles can show stats
-- even though user_picks / prop_picks / slot_spins are private tables. It only returns totals (no pick-by-pick data, no balances beyond the profile's public SP).

-- profit of one settled pick: win = payout - stake, loss = -stake, void = 0. Old pre-stake picks (stake 0) count what they paid.
create or replace function stat_net(p_result text,p_stake int,p_awarded int) returns int language sql immutable as $$
  select case
    when p_result='win'  then case when coalesce(p_stake,0)>0 then coalesce(p_awarded,0)-p_stake else coalesce(p_awarded,0) end
    when p_result='loss' then case when coalesce(p_stake,0)>0 then -p_stake else coalesce(p_awarded,0) end
    else 0 end $$;

create or replace function profile_stats(p_user uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare
  pr profiles; rk int; players int;
  picks jsonb; picks_sport jsonb; picks_top jsonb; picks_best jsonb;
  props jsonb; props_sport jsonb; props_top jsonb;
  slots jsonb; slots_theme jsonb; slots_fav jsonb; casino jsonb; casino_games jsonb;
  soc jsonb; form jsonb;
begin
  if p_user is null then return null; end if;
  select * into pr from profiles where id=p_user and onboarded;
  if not found then return null; end if;
  -- hidden stats: only the owner can see them
  if pr.hide_stats and auth.uid() is distinct from p_user then
    return jsonb_build_object('hidden',true,'level',pr.level);
  end if;

  select count(*)+1 into rk from profiles where onboarded and lifetime_novas>pr.lifetime_novas;
  select count(*) into players from profiles where onboarded;

  -- ===== game picks =====
  select jsonb_build_object(
    'total',count(*),
    'wins',count(*) filter(where result='win'),
    'losses',count(*) filter(where result='loss'),
    'voids',count(*) filter(where result='void'),
    'pending',count(*) filter(where settled_at is null),
    'staked',coalesce(sum(stake) filter(where result in('win','loss')),0),
    'net',coalesce(sum(stat_net(result,stake,awarded)),0),
    'biggest_win',coalesce(max(stat_net(result,stake,awarded)) filter(where result='win'),0),
    'biggest_loss',coalesce(-min(stat_net(result,stake,awarded)) filter(where result='loss' and stat_net(result,stake,awarded)<0),0),
    'biggest_stake',coalesce(max(stake),0),
    'avg_stake',coalesce(round(avg(stake) filter(where stake>0)),0),
    'week',count(*) filter(where created_at>now()-interval '7 days')
  ) into picks from user_picks where user_id=p_user;

  select coalesce(jsonb_agg(jsonb_build_object('sport',sp,'n',n,'w',w,'l',l,'net',net) order by n desc),'[]'::jsonb) into picks_sport
  from (select upper(coalesce(sport,'?')) sp,count(*) n,count(*) filter(where result='win') w,count(*) filter(where result='loss') l,
               coalesce(sum(stat_net(result,stake,awarded)),0) net
        from user_picks where user_id=p_user group by 1) s;

  select jsonb_build_object('name',pick,'n',n,'w',w) into picks_top
  from (select pick,count(*) n,count(*) filter(where result='win') w from user_picks where user_id=p_user group by pick order by n desc,w desc limit 1) t;

  select jsonb_build_object('name',pick,'n',n,'w',w) into picks_best
  from (select pick,count(*) n,count(*) filter(where result='win') w from user_picks where user_id=p_user group by pick
        having count(*) filter(where result='win')>0 order by w desc,n asc limit 1) t;

  -- ===== stat picks (higher / lower) =====
  select jsonb_build_object(
    'total',count(*),
    'wins',count(*) filter(where pp.result='win'),
    'losses',count(*) filter(where pp.result='loss'),
    'voids',count(*) filter(where pp.result='void'),
    'pending',count(*) filter(where pp.settled_at is null),
    'staked',coalesce(sum(pp.stake) filter(where pp.result in('win','loss')),0),
    'net',coalesce(sum(stat_net(pp.result,pp.stake,pp.awarded)),0),
    'biggest_win',coalesce(max(stat_net(pp.result,pp.stake,pp.awarded)) filter(where pp.result='win'),0),
    'biggest_stake',coalesce(max(pp.stake),0),
    'higher',count(*) filter(where pp.choice='higher'),
    'higher_w',count(*) filter(where pp.choice='higher' and pp.result='win'),
    'higher_l',count(*) filter(where pp.choice='higher' and pp.result='loss'),
    'lower',count(*) filter(where pp.choice='lower'),
    'lower_w',count(*) filter(where pp.choice='lower' and pp.result='win'),
    'lower_l',count(*) filter(where pp.choice='lower' and pp.result='loss')
  ) into props from prop_picks pp where pp.user_id=p_user;

  select coalesce(jsonb_agg(jsonb_build_object('sport',sp,'n',n,'w',w,'l',l,'net',net) order by n desc),'[]'::jsonb) into props_sport
  from (select upper(p.sport) sp,count(*) n,count(*) filter(where pp.result='win') w,count(*) filter(where pp.result='loss') l,
               coalesce(sum(stat_net(pp.result,pp.stake,pp.awarded)),0) net
        from prop_picks pp join props p on p.id=pp.prop_id where pp.user_id=p_user group by 1) s;

  select jsonb_build_object('name',subject,'n',n,'w',w) into props_top
  from (select p.subject,count(*) n,count(*) filter(where pp.result='win') w
        from prop_picks pp join props p on p.id=pp.prop_id where pp.user_id=p_user group by p.subject order by n desc,w desc limit 1) t;

  -- ===== slots =====
  select jsonb_build_object(
    'spins',count(*),
    'wagered',coalesce(sum(bet),0),
    'won',coalesce(sum(payout),0),
    'hits',count(*) filter(where payout>0),
    'profit_spins',count(*) filter(where payout>bet),
    'biggest_win',coalesce(max(payout),0),
    'best_mult',coalesce(round(max(payout::numeric/nullif(bet,0)),1),0),
    'bonuses',count(*) filter(where kind='bonus'),
    'bonus_won',coalesce(sum(payout) filter(where kind='bonus'),0),
    'biggest_bet',coalesce(max(bet),0),
    'avg_bet',coalesce(round(avg(bet)),0),
    'day_net',coalesce(sum(payout-bet) filter(where created_at>now()-interval '24 hours'),0),
    'week',count(*) filter(where created_at>now()-interval '7 days')
  ) into slots from slot_spins where user_id=p_user;

  select coalesce(jsonb_agg(jsonb_build_object('theme',theme,'n',n,'net',net,'best',best) order by n desc),'[]'::jsonb) into slots_theme
  from (select upper(theme) theme,count(*) n,sum(payout-bet) net,max(payout) best from slot_spins where user_id=p_user and theme is not null group by 1) s;

  select jsonb_build_object(
    'denom',(select denom from slot_spins where user_id=p_user and denom is not null group by denom order by count(*) desc,denom desc limit 1),
    'lines',(select lines from slot_spins where user_id=p_user and lines is not null group by lines order by count(*) desc,lines desc limit 1),
    'big_theme',(select upper(theme) from slot_spins where user_id=p_user and payout>0 order by payout desc limit 1)
  ) into slots_fav;

  -- ===== casino (all games together, then per game) =====
  with r as (
    select bet::bigint wag,payout::bigint pay,created_at at from slot_spins where user_id=p_user
    union all select wagered::bigint,payout::bigint,created_at from bj_rounds where user_id=p_user
    union all select wagered::bigint,payout::bigint,created_at from casino_rounds where user_id=p_user)
  select jsonb_build_object(
    'rounds',count(*),
    'wagered',coalesce(sum(wag),0),
    'won',coalesce(sum(pay),0),
    'net',coalesce(sum(pay-wag),0),
    'wins',count(*) filter(where pay>wag),
    'biggest_win',coalesce(max(pay-wag),0),
    'biggest_payout',coalesce(max(pay),0),
    'biggest_bet',coalesce(max(wag),0),
    'day_net',coalesce(sum(pay-wag) filter(where at>now()-interval '24 hours'),0),
    'week',count(*) filter(where at>now()-interval '7 days')
  ) into casino from r;

  select coalesce(jsonb_agg(jsonb_build_object('game',g,'n',n,'wins',w,'wagered',wg,'won',pw,'net',pw-wg,'best',best) order by n desc),'[]'::jsonb) into casino_games
  from (
    with r as (
      select 'slots'::text g,bet::bigint wag,payout::bigint pay from slot_spins where user_id=p_user
      union all select 'blackjack',wagered::bigint,payout::bigint from bj_rounds where user_id=p_user
      union all select game,wagered::bigint,payout::bigint from casino_rounds where user_id=p_user)
    select g,count(*) n,count(*) filter(where pay>wag) w,sum(wag) wg,sum(pay) pw,max(pay-wag) best from r group by g) q;

  -- ===== community =====
  select jsonb_build_object(
    'followers',(select count(*) from follows where followee=p_user),
    'following',(select count(*) from follows where follower=p_user),
    'posts',(select count(*) from posts where user_id=p_user),
    'likes',(select count(*) from post_likes l join posts po on po.id=l.post_id where po.user_id=p_user),
    'comments',(select count(*) from comments where user_id=p_user),
    'badges',(select count(*) from user_achievements where user_id=p_user)
  ) into soc;

  -- last 10 settled results across game picks + stat picks (newest first)
  select coalesce(jsonb_agg(result order by at desc),'[]'::jsonb) into form from (
    select result,at from (
      select result,settled_at at from user_picks where user_id=p_user and result in('win','loss')
      union all
      select result,settled_at from prop_picks where user_id=p_user and result in('win','loss')
    ) u order by at desc nulls last limit 10) f;

  return jsonb_build_object(
    'sp',pr.novas,'lifetime',pr.lifetime_novas,'level',pr.level,'streak',pr.streak,'best_streak',pr.best_streak,
    'rank',rk,'players',players,'joined',pr.created_at,
    'picks',picks,'picks_sport',picks_sport,'picks_top',picks_top,'picks_best',picks_best,
    'props',props,'props_sport',props_sport,'props_top',props_top,
    'slots',slots,'slots_theme',slots_theme,'slots_fav',slots_fav,
    'chips',pr.chips,'casino',casino,'casino_games',casino_games,'hide_stats',pr.hide_stats,
    'social',soc,'form',form);
end $$;

revoke all on function stat_net(text,int,int) from public,anon;
revoke all on function profile_stats(uuid) from public;
grant execute on function profile_stats(uuid) to anon, authenticated;
notify pgrst,'reload schema';
