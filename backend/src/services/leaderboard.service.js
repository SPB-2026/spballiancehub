// Leaderboard is derived live from real stored member data (score & contributions
// are maintained by admins in the admin panel). Nothing is fabricated.
const db = require('../config/db');

async function rows(metric = 'score') {
  const key = metric === 'contributions' ? 'contributions' : 'score';
  return (
    await db
      .prepare(
        `SELECT m.id, m.name, m.avatar, m.role, m.status, m.contributions, m.score, m.join_date
       FROM members m
       WHERE m.status = 'active'
       ORDER BY ${key} DESC, m.contributions DESC, m.name ASC
       LIMIT 50`
      )
      .all()
  ).map((r, i) => ({ ...r, rank: i + 1 }));
}

module.exports = { rows };
