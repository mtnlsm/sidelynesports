-- Sidelyne Sports seeded accounts. Safe to re-run. Run AFTER schema.sql, saves.sql, social.sql, shop.sql.
-- The bot list lives in a private table (RLS on, no policies = only the service role / SQL Editor can read it),
-- so nothing in the public API or the app reveals which accounts are seeded.
create table if not exists bot_accounts(user_id uuid primary key references auth.users on delete cascade, created_at timestamptz not null default now());
alter table bot_accounts enable row level security;
revoke all on bot_accounts from anon, authenticated;

-- Migrate from the earlier version (profiles.is_bot) if you ran it
do $$ begin
  if exists(select 1 from information_schema.columns where table_name='profiles' and column_name='is_bot') then
    insert into bot_accounts(user_id) select id from profiles where is_bot on conflict do nothing;
    alter table profiles drop column is_bot;
  end if;
end $$;

-- Remove every seeded account and everything they made:
--   delete from auth.users where id in (select user_id from bot_accounts);
notify pgrst,'reload schema';
