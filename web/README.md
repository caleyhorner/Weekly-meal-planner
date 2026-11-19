# Dinners (web app)

The household meal planner website. See [`../docs/PLAN.md`](../docs/PLAN.md) for the full plan.

**Built so far:** passphrase login, recipe library (search, tags, last cooked), the standard
recipe page (servings scaling, cooking mode, view original), adding recipes by hand, and
AI import from photos, links and pasted text with a review screen.

**Also built:** the Saturday–Friday week planner (pick or skip each night, ½/1/2/3 sizing for the household, drag and drop on desktop).

**And:** the shopping list (merged across the week's dinners at each night's size, staples left
off, "already have it" ticks, copy or share for Telegram) and settings for household size,
staples and "same thing" item names.

## Deploying to Vercel (one-time setup)

1. **Import the repo** at vercel.com → *Add New → Project*, pick `Weekly-meal-planner`.
   Set **Root Directory** to `web`. Leave the other build settings as they are.
2. **Add a database:** in the project, *Storage → Create → Neon (Postgres)*, and connect
   it to the project. This adds `DATABASE_URL` for you.
3. **Add photo storage:** *Storage → Create → Blob*, and connect it to the project. This adds
   `BLOB_READ_WRITE_TOKEN`.
4. **Add the remaining settings** under *Settings → Environment Variables*:
   - `HOUSEHOLD_PASSPHRASE`: the phrase you'll both type to sign in
   - `SESSION_SECRET`: a random string of 32+ characters
   - `ANTHROPIC_API_KEY`: from console.anthropic.com (set a monthly spend limit there)
5. **Redeploy.** Each build applies database migrations automatically before building.

Without `ANTHROPIC_API_KEY` everything works except automatic recipe reading. Recipes can
still be typed in by hand.

## Recipe feed ("For you")

The Recipes page shows suggestions from recipe websites listed in **Settings → Recipe websites**
(it starts with RecipeTin Eats and Jamie Oliver). Each site is checked every morning by a Vercel
cron job (`vercel.json`, `/api/cron/feed`, 18:00 UTC ≈ 5am in eastern Australia); **Check now** in
Settings runs it on demand. Suggestions are ranked without AI, by how alike they are to recipes you
cook and how many ingredients they share with this week's shopping list. Saving one uses the normal
AI import and marks it "To check".

Optional: set `CRON_SECRET` (any random string) in Vercel's environment variables. Vercel then sends
it with the daily call and the endpoint refuses anything else.

## Send to OpenClaw (optional)

The shopping list can send itself straight to your OpenClaw agent, which adds the items to
the Groceries list in Apple Reminders. Without this set up, use **Copy for Telegram**.

1. In OpenClaw's config, switch on webhooks with a dedicated token (not the gateway
   password): `hooks.enabled: true` and `hooks.token: <long random string>`.
2. Make the gateway's `/hooks` path reachable from the internet. If OpenClaw runs on a home
   computer, Tailscale Funnel or a Cloudflare Tunnel gives it an HTTPS address. Vercel has to
   be able to reach it.
3. In Vercel, add `OPENCLAW_HOOK_URL` (e.g. `https://<machine>.<tailnet>.ts.net/hooks/agent`)
   and `OPENCLAW_HOOK_TOKEN`, then redeploy. `/api/health` shows `openclaw: connected`.

The button appears on the shopping list once both settings exist. The app sends the list as
one message to `POST /hooks/agent` with `Authorization: Bearer <token>` and an
`Idempotency-Key`, so pressing it twice for the same list doesn't add items twice.

## Local development

```bash
cp .env.example .env.local   # fill in the values
npm install
npm run db:migrate
npm run dev
```

Checks: `npm test` (unit tests), `npm run typecheck`, `npm run lint`.

Schema changes: edit `src/db/schema.ts`, then `npm run db:generate` to create a migration
in `drizzle/`.
