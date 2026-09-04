-- 001_initial_schema.sql
-- PostgreSQL schema: a 1:1 port of the SQLite schema that previously lived in
-- backend/src/config/db.js. Same tables, same constraints, same relationships.
--
-- Type mapping:
--   INTEGER PRIMARY KEY AUTOINCREMENT → BIGSERIAL PRIMARY KEY
--   TEXT timestamps (ISO-8601)        → TIMESTAMPTZ (app still reads/writes ISO strings)
--   INTEGER 0/1 flags                 → INTEGER (smallint domain), preserving 0/1 semantics
--   REAL                              → DOUBLE PRECISION
--   TEXT JSON blobs                   → TEXT (app parses them as strings)
--   members.join_date                 → TEXT 'YYYY-MM-DD' (displayed verbatim)

CREATE TABLE IF NOT EXISTS admins (
  id            BIGSERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS members (
  id            BIGSERIAL PRIMARY KEY,
  game_user_id  TEXT NOT NULL UNIQUE,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  avatar        TEXT,
  role          TEXT NOT NULL DEFAULT 'R1'
                CHECK (role IN ('R5','R4','R3','R2','R1')),
  status        TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','inactive','banned')),
  bio           TEXT NOT NULL DEFAULT '',
  contributions INTEGER NOT NULL DEFAULT 0,
  score         INTEGER NOT NULL DEFAULT 0,
  join_date     TEXT NOT NULL DEFAULT (CURRENT_DATE::TEXT),
  last_active   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'tournament'
              CHECK (category IN ('war','tournament','social','maintenance','other')),
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  location    TEXT NOT NULL DEFAULT '',
  image       TEXT NOT NULL DEFAULT '',
  priority    INTEGER NOT NULL DEFAULT 0,
  published   INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS news (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'alliance',
  cover         TEXT,
  summary       TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  published     INTEGER NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  author        TEXT NOT NULL DEFAULT 'SPB Command',
  featured      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS articles (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'beginner',
  body          TEXT NOT NULL DEFAULT '',
  tags          TEXT NOT NULL DEFAULT '',
  cover         TEXT,
  published     INTEGER NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gift_codes (
  id               BIGSERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  description      TEXT NOT NULL DEFAULT '',
  reward           TEXT NOT NULL DEFAULT '',
  max_uses         INTEGER NOT NULL DEFAULT 1,
  per_member_limit INTEGER NOT NULL DEFAULT 1,
  used_count       INTEGER NOT NULL DEFAULT 0,
  active           INTEGER NOT NULL DEFAULT 1,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gift_redemptions (
  id           BIGSERIAL PRIMARY KEY,
  gift_code_id INTEGER NOT NULL REFERENCES gift_codes(id) ON DELETE CASCADE,
  member_id    INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (gift_code_id, member_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_activity (
  id         BIGSERIAL PRIMARY KEY,
  admin_id   INTEGER NOT NULL,
  admin_name TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT,
  status     INTEGER NOT NULL,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_at ON admin_activity(at);

CREATE TABLE IF NOT EXISTS announcements (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  priority   INTEGER NOT NULL DEFAULT 0,
  published  INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media (
  id          BIGSERIAL PRIMARY KEY,
  url         TEXT NOT NULL UNIQUE,
  filename    TEXT NOT NULL,
  mime        TEXT NOT NULL,
  size        INTEGER NOT NULL DEFAULT 0,
  width       INTEGER,
  height      INTEGER,
  uploaded_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Kingshot Tools: one JSON document per key, admin-editable at runtime.
CREATE TABLE IF NOT EXISTS tool_data (
  key        TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-side session revocation: SHA-256 hash of a logged-out JWT until its
-- natural expiry. expires_at is epoch milliseconds.
CREATE TABLE IF NOT EXISTS revoked_tokens (
  token_hash TEXT PRIMARY KEY,
  expires_at BIGINT NOT NULL
);
