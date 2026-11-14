# Dinners (web app)

The household meal planner website. See [`../docs/PLAN.md`](../docs/PLAN.md) for the full plan.

**Built so far:** passphrase login, recipe library (search, tags, last cooked), the standard
recipe page (servings scaling, cooking mode, view original), adding recipes by hand, and
AI import from photos, links and pasted text with a review screen.

**Also built:** the Saturday–Friday week planner (pick or skip each night, ½/1/2/3 sizing for the household, drag and drop on desktop).

**Next:** shopping list, staples settings.

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
