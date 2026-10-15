-- 008_member_access_log.sql
-- Visit history for the member-facing access gate (magic link + Game ID).
-- Stores game_user_id and a name snapshot directly (not a foreign key to
-- members) so history survives even after a member is later removed from
-- the roster — useful for exactly that kind of audit trail.

CREATE TABLE IF NOT EXISTS access_log (
  id            BIGSERIAL PRIMARY KEY,
  game_user_id  TEXT NOT NULL,
  name          TEXT NOT NULL,
  visited_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_access_log_game_user_id ON access_log (game_user_id);
CREATE INDEX IF NOT EXISTS idx_access_log_visited_at ON access_log (visited_at DESC);
