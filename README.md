# SplitMeta

**Know what's actually fast in *your* split — this week.**

Crowd-sourced iRacing setup meta, ranked per series / week / rating band. **$8/mo Pro**.

Live: [https://www.splitmeta.net](https://www.splitmeta.net)

## Free vs Pro ($8/mo)

| Feature | Free | Pro |
|---|---|---|
| Weekly top-3 teaser per series | Yes | Yes |
| Full ranked meta board for your rating band | — | Yes |
| Setup parameter deltas | — | Yes |
| Setup parameter sheet (view / download) | — | Yes |
| Watchlist + meta-moved alerts | — | Yes |
| Post-race briefing (rank, pace vs band, deltas) | — | Yes |
| Recent race history & Your week home | — | Yes |

## MVP checklist

- [x] Next.js app + landing + meta board (mock data)
- [x] Prisma schema (Postgres) + Auth.js Google login + Stripe Checkout
- [x] Neon DB + env vars configured in Vercel
- [x] Ingest API (`POST /api/ingest/session`) + companion auto-connect on download
- [x] Meta computation job (`GET/POST /api/cron/compute-meta`, nightly cron)
- [x] Windows companion uploader (`companion/` — watches iRacing `.ibt` telemetry)

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + Neon Postgres
- Auth.js (Google)
- Stripe subscriptions

## Go-live setup (auth + billing)

You need three free/cheap accounts: **Neon**, **Google Cloud**, **Stripe**.

### 1. Neon database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string (`DATABASE_URL`)
3. Locally or via any machine with the env set: `npx prisma migrate deploy`
   (also runs automatically on Vercel builds once `DATABASE_URL` is set)

### 2. Google OAuth

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth client (Web)
2. Authorized redirect URIs:
   - `https://www.splitmeta.net/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (for local)
3. Copy Client ID + Secret → `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`

### 3. Stripe

1. [Stripe Dashboard](https://dashboard.stripe.com) → Product → **SplitMeta Pro** → Price **$8 / month**
2. Copy Price ID → `STRIPE_PRICE_ID`
3. Copy Secret key → `STRIPE_SECRET_KEY`
4. Developers → Webhooks → Add endpoint:
   - URL: `https://www.splitmeta.net/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### 4. Vercel environment variables

In the Vercel project → **Settings → Environment Variables**, add:

```
DATABASE_URL
AUTH_SECRET          # openssl rand -base64 32
AUTH_URL             # https://www.splitmeta.net
NEXT_PUBLIC_APP_URL  # https://www.splitmeta.net
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
STRIPE_WEBHOOK_SECRET
CRON_SECRET          # required on Vercel; Vercel Cron sends Authorization: Bearer …
ADMIN_GRANT_SECRET   # optional; protects POST /api/admin/grant-pro
```

Never commit real `.env` files — only `.env.example` (placeholders) belongs in git.

Redeploy after saving.

### 5. Stripe Customer Portal

Stripe → Settings → Billing → Customer portal → enable cancel/update so “Manage billing” works.

## Local development

```bash
cp .env.example .env
# fill in values (can use Stripe test keys)
npm install
npx prisma migrate deploy
npm run dev
```

## Ingest API

Race + setup data is uploaded by the **desktop app** after each session. Sign in inside the app with the same Google account as the website — credentials are stored locally and remembered between launches.

Identical `setupParams` in the same series week share one setup fingerprint. Re-sending the same `externalId` is a no-op (idempotent).

## Meta computation

Rankings are recomputed:

- automatically after each successful ingest (that series week)
- nightly via Vercel Cron → `GET /api/cron/compute-meta` (06:00 UTC)
- manually: open/post `https://www.splitmeta.net/api/cron/compute-meta`

Optional env: `CRON_SECRET` — if set, send `Authorization: Bearer CRON_SECRET`.

## Windows desktop app

See [`companion/README.md`](companion/README.md).

1. Download from `/download`
2. Run `install.bat`, sign in with Google in the app
3. Leave the app running while you race
