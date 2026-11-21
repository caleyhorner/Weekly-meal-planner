# Weekly Meal Planner — Plan

A shared website (phone + desktop) for planning a week of family dinners and turning
the plan into a shopping list. Recipes come in from cookbook photos, Instagram, recipe
sites or pasted text, and are stored in one standard format.

This replaced the earlier Expo/React Native iPhone app, which has been removed.

---

## Decisions

### Platform
- **Mobile-first website**, works on desktop too. Replaces the Expo app (too finicky).
- **Next.js (App Router) + TypeScript**, deployed on **Vercel** (free tier).
- **Postgres via the Vercel Marketplace (Neon)** for data and **Vercel Blob** for photos,
  both added from inside the Vercel dashboard (no separate account).
- **One shared household passphrase**, no per-person accounts. Login sets a signed,
  httpOnly cookie. All database and AI calls happen server-side; no keys in the browser.

### Adding recipes
- One **"Add recipe"** input that accepts any of:
  - a **link** (recipe site or Instagram),
  - **pasted text** (e.g. an Instagram caption),
  - **one or more photos/screenshots** (cookbook pages, caption screenshots).
- Links: the server fetches the page. JSON-LD `Recipe` data is used if present; otherwise
  the page text goes to the AI. If Instagram blocks the fetch, the UI asks for a
  screenshot of the caption instead (an accepted fallback).
- Out of scope for v1: recipes that only exist in a video's audio/visuals.
- **AI extraction: Claude API (`claude-opus-5-5`)** with structured output, using our own
  API key (prepaid credit + monthly spend limit). Roughly 5c per import. The model is a
  single config value so it can be changed later.
- Photos are resized client-side before upload (cost + storage).
- Extraction is **faithful**: the author's wording is kept. Only formatting is cleaned
  up: numbered steps, consistent units, Instagram clutter (emoji, hashtags, "link in
  bio") removed.
- Each ingredient is split into: **item** (canonical, e.g. `onion`), **amount**, **unit**,
  **prep note** (`finely diced`), optional **group** (`For the pastry`), plus the
  original raw line.
- The AI suggests **tags** and reads **servings**, prep time and cook time. If servings
  are missing, the review screen requires them.
- Always an **editable review screen** before saving.
- On save, warn if the title looks like an existing recipe (possible duplicate).
- The original source (photos/screenshot/link) is always kept and viewable.

### Standard recipe view
Every recipe looks the same whatever the source:

1. Hero image, or a **coloured card with the recipe's initial** if there's no food photo
2. Title, prep/cook time
3. **Servings stepper**: changing it rescales ingredient amounts live
4. Tags, "last cooked" date
5. Ingredients, with groups kept
6. Method as numbered steps
7. Notes, source label, **View original**
8. Actions: Add to this week, Edit

**Cooking mode** (v1): larger text, screen kept awake (Screen Wake Lock API), tap to
tick off ingredients and steps.

### Library
- **Search** by title or ingredient.
- **Tags** (AI-suggested, editable).
- **Last cooked**: worked out from past week plans, not entered by hand.

### Weekly plan
- **7 dinners, Saturday to Friday** (Saturday is shopping day).
- Each day is a **recipe** or **skip**.
- Desktop: drag recipes onto days. Phone: tap a day and pick.
- **Scaling for a household of 4** (configurable):
  - Multiplier is the smallest of **x1/2, x1, x2, x3** where `servings x multiplier >= 4`.
    Examples: serves 2 → x2; serves 3 → x2 (6); serves 6 → x1 (leftovers);
    serves 8 → x1/2.
  - Can be overridden per meal.
  - Countable items (eggs, tins, sheets) always round **up**.
  - The recipe view opened from the plan shows that week's scaled amounts.

### Shopping list
- Built from the week's non-skipped dinners, using each meal's scaling.
- **Merge by canonical item.** Amounts add up when units are compatible
  (g/kg, ml/L, counts). Incompatible units sit side by side (`flour 200g + 1 cup`),
  no density guessing.
- **Aliases**: "same thing" merges two item names (e.g. `scallion` → `spring onion`),
  remembered for the future.
- **Staples**, editable in settings, never appear on the list.
  Seeded with: **salt, pepper, olive oil, water**.
- Weekly **"already have it" check**: every item starts ticked, and unticking one means
  it won't be copied. Saved per week.
- **Copy** button produces plain text for pasting into Telegram, where OpenClaw adds it
  to the Apple Reminders *Groceries* list:

  ```
  Add to Groceries:
  Onions ×3
  Chicken thighs 800g
  Plain flour 200g + 1 cup
  ```
- No in-app ticking at the shops, and no non-recipe extras: Apple Reminders stays the
  shopping list.

### Migration from the old app
- **None.** Recipes in the old app are re-added through the new **Add recipe** flow from
  the original photos, which also gets them properly extracted (the old app only stored
  the image).

---

## Data model (Postgres)

| Table | Key columns |
|---|---|
| `recipes` | id, title, description, servings, prep_min, cook_min, tags text[], notes, steps jsonb, source_type (`book`/`instagram`/`web`/`text`), source_label, source_url, hero_image_path, card_colour, created_at, updated_at |
| `recipe_ingredients` | id, recipe_id, position, group_label, raw_text, item, amount numeric null, amount_text, unit, prep_note, category |
| `recipe_sources` | id, recipe_id, storage_path, kind (`photo`/`screenshot`) |
| `item_aliases` | alias (pk), item |
| `staples` | item (pk) |
| `household_settings` | household_size (default 4), week_start_dow (default Saturday) |
| `plan_days` | date (pk), recipe_id null, status (`recipe`/`skip`), servings_override null |
| `shopping_have_it` | week_start, item, have_it bool |

`last_cooked` = latest past `plan_days.date` for that recipe.

---

## Build order

Each step is usable on its own and is deployed before moving on.
All six steps are done (see `web/README.md`).

1. **Skeleton**: Next.js app in `web/`, passphrase login, Postgres schema + migrations,
   deploy to Vercel.
2. **Import pipeline**: input box (link/text/photos), URL fetch + JSON-LD, Claude
   extraction to structured output, review/edit screen, save with originals.
   Test early on real cookbook pages and Instagram screenshots.
3. **Recipe view + library**: standard view, servings stepper, coloured card, View
   original, cooking mode, search, tags.
4. **Week planner**: Sat–Fri grid, pick or drag, skip, scaling rule, per-meal override.
5. **Shopping list**: merge, aliases, staples settings, "already have it" check, Copy.
6. ~~**Remove the Expo app**~~ (done).

## Recipe feed ("For you")

Agreed later: suggestions based on (a) the household's taste and (b) using up this week's shopping.

- **Sources:** recipe websites chosen in Settings (start: RecipeTin Eats, Jamie Oliver). Each site's
  RSS/Atom feed and sitemap are found automatically; new recipe pages are read for their
  schema.org data (title, picture, ingredients, time).
- **When:** checked daily (Vercel cron) plus **Check now** in Settings.
- **Ranking (no AI, free):** similarity to saved recipes, weighted by how often they're cooked, plus
  ingredients already on this week's list; new posts get a nudge; anything like a "Not for us"
  suggestion is pushed well down. Each card says why ("Like your …", "Uses leek and cream from
  this week's list").
- **Where:** a "For you" row at the top of the Recipes page, 10 at a time.
- **Actions:** **Save** (AI import, marked "To check"), **Plan it** (save and put on a night, or that
  week's snacks), **Not for us**. Tapping the card opens the original page.

## Dinner parties

Agreed later: plan ahead for a dinner party, separately from the week.

- **A party** has a name, an optional date and the number of people eating (hosts included).
- **Menu:** any number of dishes from the recipe library (dinners or snacks), as one plain list
  (no courses). A recipe goes on a menu once; to make more, change its size.
- **Sizing:** each dish is made to feed everyone, using the household rule with the party's
  head count (smallest of ½, 1, 2, 3 that's enough, or a bigger whole multiple for small
  recipes). Can be overridden per dish; changing the head count re-sizes only the dishes not
  changed by hand.
- **Shopping list:** per party, built the same way as the week's (aliases, staples, have-it
  ticks saved per party, Copy / Share / Send to OpenClaw).
- Party dishes don't count towards a recipe's "last cooked".

Tables: `dinner_parties` (id, name, date null, guests), `party_dishes` (party_id, recipe_id,
multiplier null), `party_have_it` (party_id, item).

## Later (not v1)
- **Send to OpenClaw** button (needs a check of what OpenClaw can receive: a webhook, or a
  Telegram bot posting into the chat).
- Favourites / ratings.
- "Fill my week" auto-suggest from tags + last cooked.
- Video-only Instagram recipes.

## Open questions
- Confirm current Neon and Vercel Blob free-tier limits.
- Confirm that pasting the copied text into Telegram works end to end with OpenClaw.
