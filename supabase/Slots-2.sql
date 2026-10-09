-- 4 new slot machines: pirate, magic, luau, racing (17 in total). Run this once in the Supabase SQL editor.
-- Every bonus is worth 12 (sum of multiplier x rows/3) so the payback stays the same as the other machines.
--   pirate Broadside 1,1,1,1,2,2,4 | magic Spellbound 2,2,3,5 | luau Lava Flow 1,1,1,1,1,1,3,3 | racing Checkered Flag 1,1,2,2,2,4

create or replace function slots_bonus_mults(p_theme text) returns int[] language sql immutable as $$
  select case p_theme
    when 'classic' then array[1,1,1,2,2,2,3]
    when 'gold'    then array[1,1,1,1,2]
    when 'ocean'   then array[1,1,1,1,1,2,2,3]
    when 'frozen'  then array[2,4,6]
    when 'west'    then array[1,1,1,1,4,4]
    when 'dragon'  then array[1,1,1,1,1,1,2,2,2]
    when 'cosmic'  then array[1,2,4,5]
    when 'candy'   then array[1,2,3,3,3]
    when 'viking'  then array[2,2,2,3]
    when 'egypt'   then array[1,1,1,1,1,1]
    when 'jungle'  then array[1,1,2,4,4]
    when 'neon'    then array[1,2,3,6]
    when 'spooky'  then array[1,1,1,1,1,1,1,1,2,2]
    when 'pirate'  then array[1,1,1,1,2,2,4]
    when 'magic'   then array[2,2,3,5]
    when 'luau'    then array[1,1,1,1,1,1,3,3]
    when 'racing'  then array[1,1,2,2,2,4]
    else null end $$;

create or replace function slots_bonus_rows(p_theme text) returns int[] language sql immutable as $$
  select case p_theme
    when 'classic' then array[3,3,3,3,3,3,3]
    when 'gold'    then array[6,6,6,6,6]
    when 'ocean'   then array[3,3,3,3,3,3,3,3]
    when 'frozen'  then array[3,3,3]
    when 'west'    then array[3,3,3,3,3,3]
    when 'dragon'  then array[3,3,3,3,3,3,3,3,3]
    when 'cosmic'  then array[3,3,3,3]
    when 'candy'   then array[3,3,3,3,3]
    when 'viking'  then array[3,3,3,6]
    when 'egypt'   then array[6,6,6,6,6,6]
    when 'jungle'  then array[3,3,3,3,3]
    when 'neon'    then array[3,3,3,3]
    when 'spooky'  then array[3,3,3,3,3,3,3,3,3,3]
    when 'pirate'  then array[3,3,3,3,3,3,3]
    when 'magic'   then array[3,3,3,3]
    when 'luau'    then array[3,3,3,3,3,3,3,3]
    when 'racing'  then array[3,3,3,3,3,3]
    else null end $$;

