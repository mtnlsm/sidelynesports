-- Sidelyne Sports community (shared feed + live updates). Safe to re-run. Run in Supabase SQL Editor.
-- You do NOT need to re-run schema.sql / admin.sql for this.

create index if not exists idx_post_likes_post on post_likes(post_id);
create index if not exists idx_posts_user on posts(user_id);

-- Live updates: let the app subscribe to new/deleted posts and likes
do $$ begin alter publication supabase_realtime add table posts;
  exception when duplicate_object then null; when undefined_object then null; end $$;
do $$ begin alter publication supabase_realtime add table post_likes;
  exception when duplicate_object then null; when undefined_object then null; end $$;

-- Re-assert the social policies (everyone signed in sees the same feed; you edit only your own)
alter table posts enable row level security;
alter table post_likes enable row level security;
alter table reports enable row level security;
drop policy if exists po_sel on posts;       create policy po_sel on posts for select using(not_blocked(user_id));
drop policy if exists po_ins on posts;       create policy po_ins on posts for insert with check(auth.uid()=user_id);
drop policy if exists po_del on posts;       create policy po_del on posts for delete using(auth.uid()=user_id);
drop policy if exists pl_sel on post_likes;  create policy pl_sel on post_likes for select using(true);
drop policy if exists pl_ins on post_likes;  create policy pl_ins on post_likes for insert with check(auth.uid()=user_id);
drop policy if exists pl_del on post_likes;  create policy pl_del on post_likes for delete using(auth.uid()=user_id);
drop policy if exists rep_ins on reports;    create policy rep_ins on reports for insert with check(auth.uid()=reporter);

notify pgrst,'reload schema';
