# Deploy on Cloudflare (replaces Netlify)

Layout: `public/` = the website, `src/worker.js` + `src/functions/` = the server code and the 3 scheduled jobs, `wrangler.jsonc` = config.
The URLs did not change (`/.netlify/functions/...` still works), so the app code is the same.

## Easiest: connect GitHub (like Netlify)
1. Put this folder in a GitHub repo.
2. Cloudflare dashboard > Workers & Pages > Create > Import a repository (Workers Builds). Pick the repo.
   Build command: leave empty. Deploy command: `npx wrangler deploy`.
3. After the first deploy: Worker > Settings > Variables and Secrets. Add the same variables you had on Netlify:
   SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (secret), SETTLE_SECRET (secret), API_SPORTS_KEY (secret, if you use UFC),
   optional SUPABASE_URL, BOTS_ENABLED=false to pause the bots.
4. Open `https://<name>.<you>.workers.dev/status.html` to check it.
5. Supabase > Authentication > URL Configuration: add the new site URL (login/confirm emails use it).

## Or from your computer
`npm install`, `npx wrangler login`, `npx wrangler deploy`. Local test: `npx wrangler dev`.

## Free-plan limits to know
- 100,000 function requests/day (static files are unlimited). Open the cron jobs by hand to test: they run on their own schedule.
- Each function run: about 10 ms CPU and 50 outgoing requests (free). If /status.html or a job shows "Worker exceeded CPU time limit"
  (error 1102) or "Too many subrequests", the free limit is too tight for that job: pause the bots, or use Workers Paid ($5/month).
- Cron schedules: settle every 5 min, props every 15 min, bots every 20 min (edit `triggers.crons` in wrangler.jsonc AND the CRON map in src/worker.js together).
