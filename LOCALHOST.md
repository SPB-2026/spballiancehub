# Running SPB Alliance Hub on your computer (localhost)

**Requirements:** [Node.js](https://nodejs.org) 18 or newer (20/22 recommended).
Check with: `node -v` and `npm -v`

---

## 1. Quick start

```bash
cd spb-alliance-hub
npm install
# Requires PostgreSQL. Create DB first (see README.md) or use Docker:
# docker run -d --name spb-pg -e POSTGRES_USER=spb -e POSTGRES_PASSWORD=spb%402026%23Local \
#   -e POSTGRES_DB=spb -p 5432:5432 postgres:16
cp .env.example .env   # then set DATABASE_URL
npm run migrate
npm run setup
npm run dev
```

Then open **http://localhost:5173** in your browser.

That's it. The terminal will show two streams:
- `API` — Express backend on http://localhost:4173
- `WEB` — Vite frontend on http://localhost:5173  ← **open this one**

Stop everything with `Ctrl+C` in the terminal.

> **Windows note:** the commands above work in PowerShell and CMD.
> If you ever need to copy the env file manually: `copy .env.example .env` (CMD)
> or `Copy-Item .env.example .env` (PowerShell). You can actually **skip** this —
> the app runs with safe defaults and only warns about the dev JWT secret.

## 2. Direct admin access

The public site at `http://localhost:5173` (or `http://localhost:4173` in production) is open — no login required.

The Admin Panel is at **`http://localhost:5173/spballiancehubadministrator2026`** (or `http://localhost:4173/spballiancehubadministrator2026` in production) and opens directly with no password.

> **Game User ID rule:** member IDs must be **exactly 9 digits** (numbers only) — the admin panel enforces this when creating members.

## 3. Admin panel

Open **`http://localhost:5173/spballiancehubadministrator2026`** (dev) or **`http://localhost:4173/spballiancehubadministrator2026`** (prod). The command
center covers every piece of site content — all changes appear on the public
site instantly, with no code changes:

- **Dashboard** — live totals and recent activity (audit log).
- **Home Page** — hero title/description, action buttons, banner image.
- **Members** — add/edit/delete, profile photos, roles, activate/deactivate.
- **News / Tips & Tricks / Events & Calendar** — full CRUD with cover images;
  events have priority + publish toggles; news can be marked ★ featured.
- **Leaderboard** — rankings are driven by member score/contributions.
- **Announcements** — prioritized board with expiration, shown on the Home page.
- **Gift Codes** — issue, activate/deactivate, expiry.
- **Media Library** — upload once, reuse anywhere; images still referenced by
  content can't be deleted (no broken images).
- **Site Settings** — alliance name/logo/favicon/description/contact/footer,
  social links, timezone, and **maintenance mode** (members see a notice
  page while you keep full admin access).
- **Admin Profile / Admin Accounts / Activity Log** — your account, extra
  admins, and the full audit trail (logins, logouts, every edit/delete).

## 4. Production mode (single server)

```bash
npm start
```

This builds the frontend automatically, then serves the whole site from
**http://localhost:4173** (no separate dev server needed).

## 5. Configuration (.env)

Optional, but recommended before sharing the app:

```bash
cp .env.example .env        # Windows: copy .env.example .env
```

- `JWT_SECRET` — set a long random string (`openssl rand -hex 32` or any 32+ char string)
- `SEED_ADMIN_PASSWORD` — your admin password (first setup only)

## 6. Troubleshooting

**"npm is not recognized" / "node is not found"**
Install Node.js 18+ from https://nodejs.org (LTS), then reopen the terminal.

**"Port 5173 / 4173 already in use"**
Another program is using the port. Either close it, or pick another port:
- API: set `PORT=4174` in `.env`, and update `proxy` target in `frontend/vite.config.js`
- Or just wait — the Vite dev server auto-increments (5174, …) and prints the real URL.

**Site opens but shows "Loading…" forever**
Make sure **both** streams (API and WEB) are running from `npm run dev`, and that you
opened the URL Vite printed (usually http://localhost:5173).

**Blank page at http://localhost:4173 in dev mode**
Expected — in dev mode the site lives on **:5173**. Port 4173 only serves the full
site in production mode (`npm start`).

**Database connection refused (ECONNREFUSED 127.0.0.1:5432)**
PostgreSQL is not running or `DATABASE_URL` is wrong. Start Postgres, verify `DATABASE_URL` in `.env`, and check `PGSSLMODE` (local = `disable`).

**Reset everything to a fresh state**
Stop the server, drop the PostgreSQL `spb` database (`dropdb spb` or via Docker), recreate it (`createdb -O spb spb`), then run `npm run migrate` and `npm run setup` and `npm run dev` again. Uploads are in `uploads/` (not the database).
