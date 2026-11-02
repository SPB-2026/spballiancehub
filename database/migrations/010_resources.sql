-- 010_resources.sql
-- Links to useful outside sites (scouting tools etc.), managed by admins in
-- Admin → Resources and shown to members on the Resources page. Seeded with
-- MightPulse and StratForge; the guards make re-running this harmless.

CREATE TABLE IF NOT EXISTS resources (
  id          SERIAL PRIMARY KEY,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  published   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO resources (title, url, description, category, sort_order)
SELECT 'MightPulse', 'https://www.mightpulse.com',
       'Look up any player by Governor ID: power, Town Center, hero lineup and governor gear, plus alliance and kingdom rankings.',
       'Player & alliance scouting', 10
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE url = 'https://www.mightpulse.com');

INSERT INTO resources (title, url, description, category, sort_order)
SELECT 'StratForge', 'https://stratforge.tools',
       'Player, alliance and kingdom intel, KvK records, gift code tools and more.',
       'Player & alliance scouting', 20
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE url = 'https://stratforge.tools');
