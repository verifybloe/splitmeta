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
| One-click setup download/install | — | Yes |
| Personal history & trend tracking | — | Yes |

## MVP checklist

- [x] Next.js app + landing + meta board (mock data)
- [x] Prisma schema (Postgres) + Auth.js Google login + Stripe Checkout
- [x] Neon DB + env vars configured in Vercel
- [x] Ingest API (`POST /api/ingest/session`) + account upload API keys
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
```

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

Upload race + setup data used later by the meta ranking job.

1. Sign in at `/account` → **Generate API key** (copy once)
2. `POST https://www.splitmeta.net/api/ingest/session`
3. Header: `Authorization: Bearer sm_...`

Example body:

```json
{
  "externalId": "iracing-sub-12345",
  "series": "GT3 Fixed — Falken Tyre Sports Car Challenge",
  "car": "Ferrari 296 GT3",
  "track": "Circuit de Spa-Francorchamps",
  "trackConfig": "Grand Prix",
  "seasonYear": 2026,
  "seasonQuarter": 3,
  "weekNum": 4,
  "sof": 2400,
  "iratingBefore": 2310,
  "iratingAfter": 2335,
  "finishPos": 4,
  "fieldSize": 18,
  "incidents": 2,
  "bestLapMs": 137821,
  "avgLapMs": 139040,
  "racedAt": "2026-07-14T22:15:00.000Z",
  "setupParams": {
    "rearWing": 8,
    "frontARB": 5,
    "LFColdPressure": 26.4
  }
}
```

Identical `setupParams` in the same series week share one setup fingerprint. Re-sending the same `externalId` is a no-op (idempotent).

## Meta computation

Rankings are recomputed:

- automatically after each successful ingest (that series week)
- nightly via Vercel Cron → `GET /api/cron/compute-meta` (06:00 UTC)
- manually: open/post `https://www.splitmeta.net/api/cron/compute-meta`

Optional env: `CRON_SECRET` — if set, send `Authorization: Bearer CRON_SECRET`.

## Windows companion uploader

See [`companion/README.md`](companion/README.md). Quick start:

1. Sign in at `/download` on the site
2. Download the zip, extract, run `install.bat`, paste your API key
3. Run `START.bat` before racing

Developers can still run from source:

```powershell
cd companion
npm install
npm run setup
npm start
```
