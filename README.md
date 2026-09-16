# SPB Alliance Hub

A private **alliance management & gaming utility command center** for the **SPB Alliance in Kingshot**.
Built from zero: dark-navy + gold medieval command-center aesthetic, full-stack architecture, public
site + direct admin at `/spballiancehubadministrator2026`, events/calendar, news, tips, gift codes, leaderboard
and a complete admin panel.

> 100% original visual identity. No Kingshot UI, artwork or copyrighted assets are used.

---

## Features

| Area | What it does |
|---|---|
| **Auth** | Public site — no login. Admin dashboard at `/spballiancehubadministrator2026` (direct, no password, no JWT). |
| **Home** | Hero, live statistics (all from the DB — nothing fabricated), upcoming events with countdowns, latest news, quick links. |
| **Members** | Public profile grid (avatar, role, status, public stats, activity) — no profile pages. **Game User ID / email are admin-only.** |
| **Calendar** | Interactive month calendar with gold event indicators + Upcoming / Ongoing / Completed lists. |
| **Events** | Dedicated page with sections, countdowns, status, participation info. |
| **Gift Codes** | Members redeem codes (tied to their account, per-member & total limits, expiry). Admins create/edit/activate/delete and view redemption records. **Automatic fetcher** pulls new Kingshot codes from verified public sources into a pending-review queue (see below). |
| **Tips & Tricks** | 8 categories (Beginner → Growth), admin-managed knowledge base. |
| **News** | Admin-managed articles with cover uploads, publish/unpublish; shown on Home. |
| **Leaderboard** | Podium + table, ranked by Score or Contributions, from real stored data. |
| **Admin** | Dashboard, member management (roles, status, stats reset), event/calendar management, news, tips, gift codes, social links, website settings (name, tagline, rank, announcement, timezone, logo). |
| **Header** | Sticky: logo · nav · **UTC clock** · **local clock** · Discord → YouTube. |
| **Security** | CSRF double-submit tokens, rate limiting, strict CSP + security headers, input validation everywhere, upload validation (magic bytes + dimensions). No login required for public or admin (direct admin URL). |

## Tech stack

- **Frontend:** React 18 + Vite + React Router (no heavy UI frameworks — hand-built design system)
- **Backend:** Node.js + Express (routes → controllers → services → models layering)
- **Database:** PostgreSQL (`pg` driver, no ORM — hand-written SQL in the models layer). Versioned SQL migrations in `database/migrations/`.

## Project structure

```text
spb-alliance-hub/
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── admin/          # admin panel pages + layout
│       ├── components/     # Header, Footer, Emblem, icons, UI kit, Toast
│       ├── hooks/          # useAuth, useAsync, useClock, useCountdown
│       ├── layouts/        # member layout
│       ├── pages/          # Home, Members, Calendar, Events,
│       │                   # News, Tips, Leaderboard, GiftCodes
│       ├── services/       # api client (CSRF + errors)
│       ├── styles/         # global.css (design system), pages.css, admin.css
│       └── utils/          # date/countdown formatting
├── backend/
│   ├── server.js           # entry point
│   ├── scripts/setup.js    # schema + idempotent seed
│   └── src/
│       ├── app.js          # express wiring
│       ├── config/         # env loader, db + schema
│       ├── jobs/           # background jobs (gift-code fetch scheduler)
│       ├── middleware/     # auth, csrf, rate limit, security headers, errors
│       ├── models/         # SQL layer
│       ├── routes/         # thin API routes
│       ├── services/       # business logic
│       └── utils/          # validation, image checks, safe filenames
├── database/
│   ├── migrations/         # versioned SQL migrations (applied by npm run migrate)
│   └── migrate.js          # applies pending migrations (schema_migrations tracking)
├── uploads/                # avatars, news covers, logo
├── .env.example
└── package.json
```

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Create the PostgreSQL database (local example)
#    macOS (Homebrew) / Debian / Windows (native or Docker) all work.
sudo -u postgres createuser spb
sudo -u postgres createdb -O spb spb
#    Docker alternative:
#    docker run -d --name spb-pg -e POSTGRES_USER=spb -e POSTGRES_PASSWORD=*** \
#      -e POSTGRES_DB=spb -p 5432:5432 postgres:16

# 3. Configure environment
cp .env.example .env
#    → set JWT_SECRET (required in production; any long random string works)
#    → set DATABASE_URL (e.g. postgresql://spb:yourpassword@localhost:5432/spb)
#    → PGSSLMODE: disable (local) | require | verify-full (hosted PostgreSQL)

# 4. Apply the schema + seed (only when tables are empty)
npm run migrate
npm run setup

# 5. Run (API :4173 + Vite dev server :5173)
npm run dev
#    → open http://localhost:5173
```

### Production

Configure these environment variables on the hosting platform — never hard-code or commit them:

```env
NODE_ENV=production
DATABASE_URL=<HOSTED_POSTGRESQL_CONNECTION_STRING>   # URL-encode special characters in the password
PGSSLMODE=require                                     # or verify-full, depending on the host
PORT=<HOSTING_PLATFORM_PORT>
JWT_SECRET=<LONG_RANDOM_STRING>
```

```bash
npm run build     # builds the SPA into frontend/dist
npm start         # Express serves the API + built SPA on the configured PORT
```

The source is identical for local development and hosted deployment — only the environment variables change.

## Initial accounts (seeded)

Public site is open — no login.

Admin dashboard at `/spballiancehubadministrator2026` (direct, no password).

Seeded members (visible at `/members`): `100234000 / commander@spb.hub`, `100317000 / ryder@spb.hub`, `100422000 / mora@spb.hub`, `100518000 / tarn@spb.hub`, `100609000 / ilva@spb.hub`, `100741000 / bren@spb.hub`, `100856000 / wren@spb.hub`, `100912000 / casper@spb.hub`.

Try gift code **`SPB-START-25`** at `/gift-codes`.

## Environment variables

See [`.env.example`](.env.example). Highlights:

- `JWT_SECRET` — session signing key (never in frontend code)
- `PORT` — API port (default 4173)
- `DATABASE_URL` — **required** PostgreSQL connection string (local + hosted)
- `PGSSLMODE` — SSL mode for hosted PostgreSQL: `disable` (local default) | `require` | `verify-full`
- `SEED_ADMIN_PASSWORD` — bootstrap admin password (used only on first setup)
- `GIFT_CODE_FETCH_INTERVAL` — how often the Kingshot gift-code fetcher checks its sources (seconds, default 21600 = 6h, min 3600). In-process scheduler; restart to apply.
- `IMGBB_API_KEY` — **required for image uploads.** Free key from [api.imgbb.com](https://api.imgbb.com). All uploaded images (avatars, news/event covers, logo, media library) are hosted on ImgBB rather than the local filesystem, so they survive redeploys on hosts with an ephemeral disk (e.g. Render's free tier).

## Automatic gift-code fetcher (Kingshot)

Admin → **Giftcodes** includes an automatic discovery pipeline for Kingshot gift codes:

- **Fetch control** — "Fetch new codes" starts a background run; the status card shows Idle / Fetching / Completed / Failed, the last run's counts (new / duplicates / expired / awaiting review), the last and next automatic run, and a per-run **fetch history** (time, sources checked/failed, new, duplicates, expired, duration, errors).
- **Scheduled runs** — *scheduling method: in-process scheduler.* An unref'd `setInterval` inside the API process fires a fetch every `GIFT_CODE_FETCH_INTERVAL` seconds (default **6h**, minimum 1h), plus one run shortly after boot. It needs no open browser and no external cron; a platform cron hitting the manual endpoint drives the same code path if preferred.
- **Sources** — a default set of real, verified public code pages (SuperCheats, Destructoid, Buffhub, Lootbar, GamesRadar, KingshotRewards, GamingOnPhone). Admins can add, remove, enable or disable sources in the panel (persisted in `settings`). Sources that block server-side fetchers (HTTP 403 / anti-bot) ship **disabled** — the fetcher never bypasses CAPTCHAs or access controls; a blocked source is logged as unavailable and the run continues with the rest.
- **Extraction & normalisation** — fetched HTML is treated as untrusted: tags are stripped, tokens must match the gift-code shape (3–32 chars, letters/digits/dashes), ordinary English words are rejected via a common-word blocklist, and a `normalized_code` (uppercase/trimmed) UNIQUE key dedupes the same code across sites, cases and whitespace.
- **Verification states** — every code carries `pending → approved / rejected / expired / invalid`, its source name + URL, a `platform` (only `android` when a source actually says so, otherwise `unknown`), and a `verification_status` (single-source / multi-source / verified). Expiry is stored **only when a source explicitly states one** in the same row/sentence as the code — never invented; otherwise it's `unknown`.
- **Approval gate** — fetched codes land in `pending` and are **invisible to members** until an admin chooses **Approve & publish**, **Reject**, **Mark expired**, or deletes them. Publishing uses the existing `active` flag + `status='approved'` mechanism.
- **Auto-expiry** — rows with a known `expires_at` that has passed are marked expired automatically at each run; `unknown`-expiry codes are never auto-expired.
- **Safety** — https-only fetches with an SSRF guard (private/internal hosts refused), 12s timeout, 3 MB size cap, at most 2 redirects, sequential per-source requests; all DB writes are parameterized; members can never see fetch logs, pending/rejected codes, notes or source config, and all fetch endpoints are admin-only via the existing middleware.

Manual trigger (admin, or cron): `POST /api/admin/gifts/fetch` (202, runs in background). Status: `GET /api/admin/gifts/fetch/status`.

## Security notes

- No secrets in the frontend bundle — only same-origin `/api` calls.
- Mutating requests require a CSRF token (double-submit, signed).
- Generic API limiter included.
- CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on all API routes.
- Uploads: MIME + magic-byte checks, 2 MB cap, dimension checks, random server-generated filenames.

## Database schema (summary)

`admins`, `members` (roles stored as a column — no duplicate roles table), `events` (drives both Events and Calendar), `news`, `articles`, `gift_codes`, `gift_redemptions`, `settings` (social links + website settings live here).
