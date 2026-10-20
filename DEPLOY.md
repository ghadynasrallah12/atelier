# Deploy checklist

## 1. Supabase (10 min)
- supabase.com → New project. Note the Project URL, anon key and service_role key (Settings → API).
- SQL editor → paste `supabase/migrations/0001_init.sql` → Run.
- Authentication → Providers → Email: enabled (keep "Confirm email" on).
- Authentication → URL configuration: Site URL = your Vercel URL; Redirect URLs: add `https://<your-app>/auth/callback` and `http://localhost:3000/auth/callback`.

## 2. Anthropic (2 min)
- console.anthropic.com → API keys → create one. Model: `claude-sonnet-5-5` (default in `.env.example`).

## 3. Vercel (5 min)
- vercel.com → Add New → Project → import `atelier` from GitHub.
- Environment variables (copy from `.env.example`):
  NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_APP_URL (your vercel URL), APP_SECRET (long random; never change later),
  CRON_SECRET (random), ANTHROPIC_API_KEY, ANTHROPIC_MODEL.
- Deploy. Open the URL, create an account, add a brand from its website.

## 4. Higgsfield (user side, 3 min)
- open.higgsfield.ai → create API account → top up ($5 minimum) → create key → copy as KEY_ID:KEY_SECRET → paste in Atelier → Settings.

## 5. Queue safety net
- Vercel Pro: `vercel.json` already registers a 1-minute cron on `/api/cron/poll` (add `CRON_SECRET` as the Authorization bearer in Vercel's cron settings if prompted).
- Vercel Hobby: cron-job.org → new job → `https://<your-app>/api/cron/poll?secret=<CRON_SECRET>` every minute.

## 6. Stripe (when ready to charge)
- Products → add "Atelier Studio", recurring monthly price → copy price id → `STRIPE_PRICE_STUDIO`.
- Developers → Webhooks → endpoint `https://<your-app>/api/stripe/webhook`, events `customer.subscription.*` → copy signing secret → `STRIPE_WEBHOOK_SECRET`.
- `STRIPE_SECRET_KEY` from API keys. Redeploy. Until these are set, the studio runs without billing.

## Local
```
cp .env.example .env.local   # fill it
npm install
npm run dev                  # http://localhost:3000
```
