# Atelier

An AI content studio for fashion brands. Users paste their website, get a brand bible, build on-model product shots and 9:16 reels from a product photo, and track what travels on Instagram. **Generations are billed to each user's own Higgsfield API balance (bring-your-own-key).** You charge a flat subscription for the studio.

## What's inside

- **The House** – brand bible (written by Claude from the website), quote bank, moodboard with library tags.
- **Library** – 74 cards: shot types, lenses, light source/direction/quality/temperature, composition, materials, camera moves, aesthetics, poses. Each card has a real reference photo (or a looping clip for camera moves) shot with the same model, outfit and studio so only that variable changes, plus a diagram, the prompt line, and the brand's own examples. "Shoot yours" generates one with the user's garments. The reference set lives in `public/library/` and the prompts that produced it in `scripts/library-examples.json`.
- **Models** – house models with a fixed DNA and a reference photo so the same face runs across the feed. "Write DNA from the photo" uses Claude vision.
- **Shoot** – fill-in-the-blanks builder: drop the product photo of the top and/or pants, set fit, pose, background and the camera layer. Queued shots are submitted to Higgsfield immediately on the user's key; results are copied into the user's own storage.
- **Hooks** – Context Lean → Scroll Stop → Contrarian Snapback hook bank, extendable by Claude.
- **Reels** – direction → 3 concepts (hook, beats with one camera line each, caption, sound, video prompt); generate the first beat; Claude pre-score; log Instagram results; post-mortem.
- **Reach** – weekly snapshots, follower chart, predicted vs real, page diagnosis.
- **Settings** – Higgsfield key (verified with a free read-only call, AES-256-GCM encrypted at rest), Stripe subscription with trial.

## Stack

Next.js 16 (App Router) · Supabase (auth, Postgres with RLS, private storage) · Anthropic API (drafting, onboarding, post-mortems) · Higgsfield API (generation, per user) · Stripe (subscriptions) · Vercel.

## Setup (about 30 minutes)

1. **Supabase**: create a project. In the SQL editor run `supabase/migrations/0001_init.sql`. In Authentication → URL configuration set the Site URL to your app URL and add `<app>/auth/callback` to the redirect list. Enable Email provider (password + magic link).
2. **Anthropic**: create an API key at console.anthropic.com.
3. **Stripe** (optional at first): create a product "Atelier Studio" with a monthly price; copy the price id. Add a webhook endpoint `<app>/api/stripe/webhook` for `customer.subscription.*` events and copy its signing secret. Leave `STRIPE_*` unset to run without billing (the studio is open).
4. **Env**: copy `.env.example` to `.env.local` and fill it. `APP_SECRET` must be a long random string and must never change after users save keys.
5. **Run**: `npm install && npm run dev`.
6. **Deploy**: push to GitHub, import in Vercel, set the same env vars. `vercel.json` registers a 1-minute cron on `/api/cron/poll` (Vercel Pro); on Hobby, point a free pinger (cron-job.org) at `https://<app>/api/cron/poll?secret=<CRON_SECRET>` every minute instead. Open tabs poll their own shots regardless, so the cron is only a safety net.

## How a generation runs

1. The user queues a shot. `/api/shots` builds the prompt (blanks filled from the brand's visual rules), checks the user has a key and an active trial/plan, inserts the rows, and calls `submitShot`.
2. `submitShot` decrypts the user's key, pushes reference images (garments, model, style looks) to Higgsfield's file store, picks the model (`grok-image-2` with references, `soul-2` without; `seedance-2.5` or `kling-o3` for reels), and POSTs with an `Idempotency-Key`. Failures go on the card ("balance empty", "content filter", …) and are never charged.
3. The browser polls `/api/shots/:id` every 6 s; `syncShot` checks Higgsfield's status and, on completion, copies the file into the user's Supabase storage (Higgsfield links expire after 7 days). The cron does the same for shots nobody is watching.

## Where users' money goes

- Higgsfield API: prepaid balance, per-image / per-second rates published on each model page. The app never marks this up and never touches it.
- Atelier subscription: your Stripe price (`STRIPE_PRICE_STUDIO`). Claude calls are your cost (cents per draft) and are covered by the subscription.

## Things to know

- The "pre-score" is Claude's creative review of the hook and script, not Higgsfield's virality predictor (that tool is not in Higgsfield's public API). The UI says so.
- Model ids and request fields come from docs.higgsfield.ai as of October 2026; check `src/lib/higgsfield.ts` if Higgsfield renames an endpoint.
- Garment accuracy depends on references: the builder sends the product photo first ("image 1"), the model reference next, then style looks.
- Everything is per-brand; a user can run as many brands as they like.
