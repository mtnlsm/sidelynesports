// Cloudflare Worker: serves the site (static files from ./public) and runs the same functions the Netlify version had,
// at the same URLs (/.netlify/functions/<name>, or /api/<name>), plus the three scheduled jobs.
import sportsData from './functions/sports-data.js';
import gameDetail from './functions/game-detail.js';
import mma from './functions/mma.js';
import fighter from './functions/fighter.js';
import team from './functions/team.js';
import props from './functions/props.js';
import login from './functions/login.js';
import config from './functions/config.js';
import settle from './functions/settle.js';
import settleGames from './functions/settle-games.js';
import botsTick from './functions/bots-tick.js';
import botsCron from './functions/bots-cron.js';
import propsCron from './functions/props-cron.js';
import propsSettleCron from './functions/props-settle-cron.js';
import settleGamesCron from './functions/settle-games-cron.js';

const FN = { 'sports-data': sportsData, 'game-detail': gameDetail, mma, fighter, team, props, login, config, settle, 'settle-games': settleGames, 'bots-tick': botsTick };
const CRON = { '*/5 * * * *': settleGamesCron, '*/20 * * * *': botsCron, '*/15 * * * *': propsCron, '*/10 * * * *': propsSettleCron };

// Cloudflare passes secrets/variables in `env`; the functions read process.env, so copy them across (a no-op when nodejs_compat already did it).
const loadEnv = (env) => { for (const k of Object.keys(env || {})) if (typeof env[k] === 'string' && process.env[k] === undefined) process.env[k] = env[k]; };

export default {
  async fetch(req, env) {
    loadEnv(env);
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/(?:\.netlify\/functions|api)\/([a-z0-9_-]+)\/?$/i);
    if (!m) return env.ASSETS.fetch(req);
    const fn = FN[m[1]];
    if (!fn) return new Response('Not found', { status: 404 });
    const headers = {}; req.headers.forEach((v, k) => { headers[k] = v; });
    const event = { httpMethod: req.method, headers, path: url.pathname, rawUrl: req.url,
      queryStringParameters: Object.fromEntries(url.searchParams), body: req.method === 'GET' || req.method === 'HEAD' ? null : await req.text() };
    try {
      const r = await fn.handler(event);
      return new Response(r.body == null ? null : r.body, { status: r.statusCode || 200, headers: r.headers || {} });
    } catch (e) { return new Response(JSON.stringify({ error: String((e && e.message) || e) }), { status: 500, headers: { 'content-type': 'application/json' } }); }
  },
  async scheduled(event, env, ctx) {
    loadEnv(env);
    const job = CRON[event.cron];
    if (job) ctx.waitUntil(job.handler({}).catch((e) => console.error('cron failed', event.cron, e)));
  },
};
