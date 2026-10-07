-- Sidelyne Sports: custom profile banners. Safe to re-run. Run in Supabase SQL Editor.
-- banner_url holds either an uploaded image URL or a preset id like 'preset:b3'.
-- avatar_url may also hold a preset id like 'preset:a2' (no change needed).
alter table profiles add column if not exists banner_url text;
grant update(username,display_name,avatar_url,banner_url,bio,onboarded) on profiles to authenticated;
notify pgrst,'reload schema';
