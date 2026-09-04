-- 002_gift_codes_discovery.sql
-- Automatic gift-code discovery (Kingshot fetcher).
--
-- Extends the EXISTING gift_codes table (additive only — no existing column
-- is altered or removed) and adds a gift_fetch_logs history table.
--
-- Design notes:
--   status          lifecycle state. Legacy rows default to 'approved' so they
--                   remain member-visible exactly as before. 'pending' rows are
--                   fetched-but-unreviewed and hidden from members.
--   code            unchanged meaning: the canonical redeem key (UPPERCASED),
--                   so existing `WHERE code = ?` redemption keeps working.
--   display_code    the form the source published (e.g. 'Kingshot888'); shown
--                   in UIs where the exact published form matters.
--   normalized_code uppercase/trimmed comparison key; UNIQUE prevents the same
--                   code being imported from different sites/cases/spaces.
--   expires_at      only set when a source explicitly states an expiry date;
--                   never invented (NULL = unknown expiry).

ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'invalid'));

-- display_code / normalized_code derive from `code` — PostgreSQL forbids
-- column references in DEFAULT expressions, so add them nullable, backfill,
-- then tighten to NOT NULL.
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS display_code TEXT;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS normalized_code TEXT;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS discovered_at TIMESTAMPTZ;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT 'unknown'
  CHECK (platform IN ('android', 'ios', 'unknown'));
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK (verification_status IN ('unverified', 'single-source', 'multi-source', 'verified'));
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE gift_codes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Backfill legacy rows so every constraint/index has complete data, then
-- tighten the two derived columns to NOT NULL (safe: the UPDATEs above just
-- populated every row; fresh INSERTs always set both explicitly).
UPDATE gift_codes SET display_code = code WHERE display_code IS NULL OR display_code = '';
UPDATE gift_codes SET normalized_code = UPPER(BTRIM(code)) WHERE normalized_code IS NULL OR normalized_code = '';
UPDATE gift_codes SET discovered_at = created_at WHERE discovered_at IS NULL;
UPDATE gift_codes SET updated_at = created_at WHERE updated_at IS NULL;

ALTER TABLE gift_codes ALTER COLUMN display_code SET NOT NULL;
ALTER TABLE gift_codes ALTER COLUMN normalized_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gift_codes_normalized_code ON gift_codes (normalized_code);
CREATE INDEX IF NOT EXISTS idx_gift_codes_status ON gift_codes (status);

-- Fetch run history. Detailed per-source errors live ONLY in `details`
-- (admin-facing); member-facing endpoints never read this table.
CREATE TABLE IF NOT EXISTS gift_fetch_logs (
  id              BIGSERIAL PRIMARY KEY,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at     TIMESTAMPTZ,
  triggered_by    TEXT NOT NULL DEFAULT 'manual',      -- manual | schedule | boot
  status          TEXT NOT NULL DEFAULT 'running',     -- running | completed | failed
  sources_checked INT NOT NULL DEFAULT 0,
  sources_failed  INT NOT NULL DEFAULT 0,
  new_codes       INT NOT NULL DEFAULT 0,
  duplicates      INT NOT NULL DEFAULT 0,
  expired_found   INT NOT NULL DEFAULT 0,
  expired_now     INT NOT NULL DEFAULT 0,
  pending_total   INT NOT NULL DEFAULT 0,
  duration_ms     INT,
  error_summary   TEXT,
  details         JSONB
);

CREATE INDEX IF NOT EXISTS idx_gift_fetch_logs_started ON gift_fetch_logs (started_at DESC);
