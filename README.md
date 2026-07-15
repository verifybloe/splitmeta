# SplitMeta

**Know what's actually fast in *your* split — this week.**

SplitMeta is a subscription service ($8/mo) for iRacing drivers. Drivers opt in to share
their setup + session results after races. SplitMeta aggregates that data and ranks what is
*actually working* per series, per week, per rating band — not what a 6000 iR alien runs,
but what wins in **your** SOF range.

## Why this beats existing tools

- **Garage 61 / Coach Dave**: pro reference laps and pro setup packs. Great for aliens,
  intimidating and often undrivable for a 1800 iR driver.
- **SplitMeta**: peer-band crowd data. "In 2000–2500 iR splits this week at Spa, setup
  fingerprint X finished P1–P5 in 61% of races with 2.1 avg incidents."

## How it works (data flow)

1. **Companion uploader (Windows, later milestone)** watches the iRacing telemetry/setup
   export folder. After a session it uploads: setup file fingerprint + parameters, series,
   track, SOF, finish position, incidents, best/avg lap, iRating before/after.
2. **API** ingests results, groups identical setups by fingerprint hash.
3. **Nightly job** computes the weekly meta per (series week × rating band): a ranked list
   scored by lap pace vs band median, finish performance, and sample-size confidence.
4. **Web app** shows the meta board. Free users see the public weekly top 3 per series.
   Pro users see full rankings for their band, setup parameter deltas, and their private
   history/trends.

## Free vs Pro ($8/mo)

| Feature | Free | Pro |
|---|---|---|
| Weekly top-3 teaser per series | Yes | Yes |
| Full ranked meta board for your rating band | — | Yes |
| Setup parameter deltas ("what the fast band runs differently") | — | Yes |
| One-click setup download/install | — | Yes |
| Personal history & trend tracking | — | Yes |

## MVP scope (ship in ~2 weeks)

- [x] Next.js app scaffold (TypeScript, Tailwind)
- [x] Prisma schema: users, cars, tracks, series weeks, setups, session results, weekly meta
- [x] Landing page with pitch + mock weekly top-3 teaser
- [x] Meta board page (mock data, wired to the real schema shape)
- [ ] Auth (email magic link) + Stripe subscription
- [ ] Ingest API endpoint (accepts uploader payloads)
- [ ] Meta computation job (score + rank per band)
- [ ] Windows companion uploader (reads iRacing exports, posts to ingest API)

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite for development (swap to Postgres for production)
- Stripe for billing (later milestone)

## Development

```bash
npm install
npx prisma migrate dev   # create/update local dev.db
npm run dev              # http://localhost:3000
```
