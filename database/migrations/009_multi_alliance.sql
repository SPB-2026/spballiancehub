-- 009_multi_alliance.sql
-- Supports tracking more than one alliance (e.g. SPB in Kingdom 1749 and SPB
-- in Kingdom 1660 — same tag, different kingdoms, so kingdom_id is what
-- actually distinguishes them). Each alliance has its own MightPulse sync
-- target and its own public/admin Members page. show_in_leaderboard lets an
-- alliance be tracked without appearing in the site-wide Leaderboard.
--
-- Members with no alliance_id are kept exactly as before — manually-added
-- individuals with no alliance tag (e.g. friends in other kingdoms) aren't
-- forced into either alliance and won't appear on either Members page.

CREATE TABLE IF NOT EXISTS alliances (
  id                   SERIAL PRIMARY KEY,
  key                  TEXT NOT NULL UNIQUE,   -- e.g. 'spb-1749', used in the UI/URLs
  label                TEXT NOT NULL,          -- e.g. 'SPB — Kingdom 1749'
  kingdom_id           TEXT NOT NULL,
  tag                  TEXT NOT NULL,
  show_in_leaderboard  BOOLEAN NOT NULL DEFAULT true,
  is_primary           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE members ADD COLUMN IF NOT EXISTS alliance_id INTEGER REFERENCES alliances(id);
ALTER TABLE mp_pending_members ADD COLUMN IF NOT EXISTS alliance_id INTEGER REFERENCES alliances(id);

-- Seed the existing alliance (today's whole roster) as the primary one, and
-- register the second. Kingdom/tag are editable afterwards in Admin → Settings
-- → Alliances, so nothing here needs a code change to correct later.
INSERT INTO alliances (key, label, kingdom_id, tag, show_in_leaderboard, is_primary)
VALUES ('spb-1749', 'SPB — Kingdom 1749', '1749', 'SPB', true, true)
ON CONFLICT (key) DO NOTHING;

INSERT INTO alliances (key, label, kingdom_id, tag, show_in_leaderboard, is_primary)
VALUES ('spb-1660', 'SPB — Kingdom 1660', '1660', 'SPB', false, false)
ON CONFLICT (key) DO NOTHING;

-- Every existing member today is part of the 1749 roster — tag them.
UPDATE members
SET alliance_id = (SELECT id FROM alliances WHERE key = 'spb-1749')
WHERE alliance_id IS NULL;
