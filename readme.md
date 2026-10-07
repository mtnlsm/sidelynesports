# Sidelyne Sports
Free NFL/NBA/UFC prediction + community app. SP (Sidelyne Points) are free points. No gambling, no money.

## Hosting
This project now runs on Cloudflare Workers (see DEPLOY.md). Mentions of Netlify below mean the same settings in Cloudflare (Worker > Settings > Variables and Secrets).

## Status
- Live NFL/NBA/UFC/PFL scores via `netlify/functions/sports-data.js` (ESPN public scoreboard, no key needed), polled every 20s. Games without a confirmed date, upcoming games already past their start time, and old results are hidden.
- Favorite teams: every current NFL and NBA team, loaded live from ESPN (`sports-data?type=teams`, refreshed hourly), with LIVE / next-game status on each team.
- Favorite fighters: the top 100 current and former UFC fighters (`js/fighters.js`), with LIVE / next-fight status whenever they appear on the ESPN UFC scoreboard.
- Picks, favorites and SP for the current user are stored locally in the browser. Email sign-up/login (with email confirmation) and profile setup via Supabase.

## Run locally
1. `npm install`
2. Copy `.env.example` to `.env` and fill it in
3. `npm run dev` (Netlify CLI serves the site + functions)
Supabase is required: accounts are email sign-up only, and without the env vars the app shows a "Sign-up unavailable" screen.

## Supabase
1. Create a project. 2. SQL Editor: run `supabase/schema.sql` (safe to re-run on an existing project; it upgrades older tables). 3. Run `supabase/admin.sql` after it (adds the admin role; re-run it any time you re-run schema.sql). The account `officialdev222@outlook.com` becomes admin automatically once its email is confirmed. 4. Auth > Providers: enable Email (and Google if wanted). 5. Run `supabase/community.sql` (shared community feed + live updates). 5b. Run `supabase/social.sql` (profile links, follow, people search, comments). 6. Copy URL, anon key, service-role key.

## Netlify
Site settings > Environment variables, add everything in `.env.example`. Deploy by connecting the repo (publish dir `.`, functions `netlify/functions`) or `netlify deploy --prod`.

## Keys
| Variable | Where | Public? |
|---|---|---|
| SUPABASE_ANON_KEY | Netlify | yes |
| SUPABASE_URL (optional) | Netlify | no - falls back to SUPABASE_DATABASE_URL, then js/supabase.js |
| SUPABASE_SERVICE_ROLE_KEY | Netlify only | **never** |
| API_SPORTS_KEY (API_SPORTS_MMA_BASE optional) | Netlify only (UFC) | **never** |
| SPORTS_API_KEY, SPORTS_API_BASE | Netlify only (NFL/NBA) | **never** |
| SETTLE_SECRET | Netlify only | **never** |

## Architecture
Sports API -> Netlify Function -> `cached_sports_data` (fetched_at/updated_at/expires_at) -> clients. TTLs in `netlify/functions/_cache.js`. Stale cache is served if the provider fails.
SP, levels, streaks and results are only changed by `settle_event()` (service role); clients can't write them (column-level grants + RLS).

## Profile links, follow, search
Every profile lives at `/@username` (also `/username` and `/u/username`). Netlify serves `index.html` for those paths (`netlify.toml` catch-all). Tap any name or avatar on a post or comment to open it. Search people from the Discover tab; follow from their profile or the search results.

## Sign-up & login
Username is chosen at sign-up (run `supabase/signup.sql`). Log in with username or email; username login goes through `netlify/functions/login.js`, which needs `SUPABASE_SERVICE_ROLE_KEY` set in Netlify. Existing accounts that never finished setup still see the old profile-setup screen once.

## Saved data
Run `supabase/saves.sql`. Picks, favorites, badges and SP now live in your account (tables `user_picks`, `user_favs`, `user_achievements`, `profiles.novas`) and follow you across devices. Browser-only picks/favorites from before are imported once on first login.

## Sports
ESPN scoreboards for NFL, NBA, MLB, NHL, WNBA, CFL, college football/basketball/baseball, 12 soccer leagues, UFC and PFL (`netlify/functions/sports-data.js`, `LEAGUES` map). Run `supabase/sports.sql` so posts can be tagged with the new sports. A league with no games (off-season) or an ESPN endpoint that does not exist simply shows nothing.

## Profile banners & avatars
Run `supabase/banners.sql` (adds `profiles.banner_url`). In Edit profile, pick one of 6 preset banners / 6 preset avatars, or upload your own (stored in the `avatars` bucket).

## Pick payouts (stakes)
Run `supabase/settle_picks.sql` and `supabase/results.sql`, then **`supabase/stake.sql` last** (re-run it any time you re-run saves/results/props/shop). Every pick now costs SP up front: **25 SP by default, or put down more (50 / 100 / 250 / 500, max 1,000) for a bigger win**. You can raise a stake before the game starts, never lower it. When the game goes final (`settle-games-cron`, every 5 min): **right = stake x 2 back (profit = your stake), wrong = you lose the stake, draw / voided pick = stake refunded.** Picks saved or changed after the game started are voided. There is no longer a +25 for just picking. Streak is updated on every result. Picks made before `stake.sql` was run have no stake and still pay the old +250 / +50. Needs `SUPABASE_SERVICE_ROLE_KEY` in Netlify. Min / max stake and the win multiplier are the three `<== TUNE` lines in `stake.sql`.

## SP Shop (flair, highlights, team themes)
Run `supabase/shop.sql` once, after `schema.sql`, `admin.sql`, `saves.sql` and `settle_picks.sql` (safe to re-run; re-run it any time you re-run `schema.sql`). Open the shop by tapping the SP counter in the header or **SP Shop** on your profile.
- **Name flair** (Star 150, Bolt 200, Medal 250, Trophy 300, Flame 400, Crown 1,000 SP): a small colored badge next to your name on posts, comments and profiles.
- **Post highlights** (3 hours 400 SP, 6 hours 700 SP): pins one of your posts to the top of the community feed. One highlighted post per person, 12 hours max at a time. Use **Highlight** on your own post or from the shop.
- **Team themes** (500 SP per team, kept forever): recolors the whole app in a team's colors (light and dark mode). Colors come live from ESPN via `sports-data?type=teams`, so every listed team is available; your favorites are listed first.
- Prices are rows in `shop_items` (edit the INSERT in `shop.sql` and re-run). All purchases go through database functions (`shop_buy_flair`, `shop_pin_post`, `shop_buy_theme`, `shop_equip`) that lock your balance, so SP can't be overspent or double-charged, and every purchase is logged as a negative row in `nova_transactions`.
- Spending SP does **not** lower your level: level now follows `profiles.lifetime_novas` (total SP ever earned), and badges use it too.

## Seeded bot accounts
Run `supabase/bots.sql`, deploy, done. The scheduled `bots-cron` function (every 20 min; `bots-tick` is the secret-protected URL version) creates accounts one at a time (the first on the first run, then roughly one every 1-2 hours, up to 16), so they join gradually like real sign-ups, and keeps a few of them posting, picking upcoming games, liking and commenting.
Set `BOTS_ENABLED=false` in Netlify to pause. Accounts are tracked in the private `bot_accounts` table; remove them all with `delete from auth.users where id in (select user_id from bot_accounts);`

## Results & finished games
Run `supabase/results.sql` (fixes payouts if `settle_picks.sql` was missed, and adds `finished_games`). The `settle-games` function (every 5 min, and the app also triggers it within ~1 min of a game you picked going final; you can also open `/.netlify/functions/settle-games` to run it now) pays picks, and remembers finished games so the Home tab shows a "Finished" section for 36 hours.


## Higher / Lower picks (props)
Run `supabase/props.sql` (after `saves.sql` and `results.sql`). Picks tab > **Higher / Lower**: pick over/under on a player or fighter stat for an upcoming game. costs 25 SP by default (pick a bigger stake for a bigger win): right = win your stake, wrong = lose it; equal to the line or a cancelled prop is void and the stake is refunded (see `stake.sql`). `props-cron` (every 15 min; open `/.netlify/functions/props` to run it now) posts props for games in the next 7 days (NFL/CFB: passing, rushing, receiving; NBA/WNBA/CBB: points, rebounds, assists; UFC/PFL: significant strikes, takedowns, knockdowns, sub attempts) and settles team-sport props from ESPN box scores. UFC/PFL props settle by SQL: `select settle_prop('<id>', 52);` (or `void_prop`). Open props 5 days past the start are voided automatically.

## Mobile vs desktop UI
Two layouts share one codebase and one `app.js`:
- `style.css` is the **mobile** layout (phone column, bottom tab bar, bottom sheets). It also covers tablets under 900px.
- `desktop.css` is the **desktop** layout, loaded only at 900px and wider (`media="(min-width:900px)"` in `index.html`): full-width top bar, left sidebar nav, multi-column game grids, wrapped chip rows, centered dialogs.
Edit one file without touching the other. To move the breakpoint, change `900px` in `index.html` and nothing else.

## Daily SP + max bet
Run `supabase/daily.sql` (after stake.sql). Every account can claim 25 SP once every 24 hours (counted from your last claim) from the card on the Home tab, so someone who loses everything can always get back in. New accounts still start at 0 SP and claim their first 25 right away. The per-pick max is now effectively unlimited (1,000,000), so your balance is the only limit; the pick sheets have an "All-in" chip. If you ever re-run stake.sql it already has the new cap; re-run daily.sql only to change the daily amount (`c_amt`).

## Admin dashboard
Run `supabase/admin2.sql` (after admin.sql). The Admin tab now has Reports (grouped by what was reported, shows the actual post/comment, one-tap Keep / Edit / Delete), Posts (search, edit, delete, open comments), Users (search, edit username/name/bio, remove avatar/banner, give or take SP, make/remove admin, delete account), Props (edit line, cancel with refunds) and Shop (rename, reprice, hide). Admins also get an Edit button on every post and comment in the Community feed. All actions are enforced in the database by `is_admin()`.

## ESPN images
Team logos and player/fighter headshots come from ESPN's image links (added to the games/teams data in `netlify/functions/sports-data.js`). If an image is missing or fails to load, the app shows the old letter badge instead. No SQL needed; deploy and the new data appears once the cached feed refreshes.

## Settings & languages
The gear on your Profile opens Settings > Language (English, Español, Français, Português, Deutsch, Italiano). Phrases live in `i18n.js` (`D` map); add a phrase there to translate more UI text. The choice is saved in the browser (`fx-lang`).
Settings also has: theme (system/light/dark), text size, reduce motion, start page, SP pop-ups on/off, copy profile link, log out and reset. Stored in the browser (`fx-set`, `fx-theme`).

## Higher / Lower payouts
Run `supabase/stake.sql` last (re-run it any time you re-run props/saves/results/shop). UFC/PFL props are settled by hand with `settle_props_where(...)` (see section 5b in `stake.sql`). Tap your side again to raise a stake before the game starts.

## Rewards + Slots
The Home tab has a Rewards card: Daily SP (`supabase/daily.sql`) and Slots. Run `supabase/slots.sql` after `stake.sql`. Spins are decided in the database (`slots_spin`), the app only animates them. 3 Sidelynes = the pinball bonus, always 1,000 SP. Odds, bonus amount and return (~88%) are the `<== TUNE` lines in `slots.sql`.


## Home = Feed, Slots (5 reels, 9 paylines)
The old Home screen is gone: **Home is now the community feed**, with a category bar on top: **Feed**, **Daily SP** (claim your free 25 SP) and **Slots**. Live and finished games moved to the Live tab; every sport is in Picks.
Slots is now 5 reels x 3 rows with 9 paylines (middle, top and bottom rows, V, peak, step down, step up, arch, bowl). A line pays for 3, 4 or 5 matching symbols in a row from the left; your bet is split across the lines. 3+ Sidelynes anywhere still trigger the 1,000 SP pinball bonus. **Re-run `supabase/slots.sql`** (it replaces the old function; return to player is about 87%). Pay table, weights and bonus chance are the `<== TUNE` lines.
Logos no longer flicker on refresh: loaded team logos are remembered and shown instantly, and the feed only redraws when its content actually changed.
