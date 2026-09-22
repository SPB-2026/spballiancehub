-- 007_mightpulse_sync.sql
-- Adds Town Center tracking to members, plus bookkeeping for syncing the
-- roster against the MightPulse API: a flag for members no longer seen in
-- the in-game roster, and a holding table for newly-detected members that
-- await admin approval before becoming real member records.

ALTER TABLE members ADD COLUMN town_center INTEGER;
ALTER TABLE members ADD COLUMN mp_missing BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE members ADD COLUMN mp_last_synced_at TIMESTAMPTZ;

CREATE TABLE mp_pending_members (
  id             SERIAL PRIMARY KEY,
  governor_id    TEXT NOT NULL UNIQUE,
  nick_name      TEXT NOT NULL,
  power          BIGINT,
  town_center    INTEGER,
  kills          BIGINT,
  alliance_rank  TEXT,
  avatar_url     TEXT,
  detected_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
