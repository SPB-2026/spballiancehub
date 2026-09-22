const db = require('../config/db');

module.exports = {
  async listAll() {
    return db.prepare(`SELECT * FROM mp_pending_members ORDER BY detected_at DESC`).all();
  },
  async findById(id) {
    return db.prepare(`SELECT * FROM mp_pending_members WHERE id = ?`).get(id);
  },
  async findByGovernorId(governor_id) {
    return db.prepare(`SELECT * FROM mp_pending_members WHERE governor_id = ?`).get(governor_id);
  },
  async upsert({ governor_id, nick_name, power, town_center, kills, alliance_rank, avatar_url }) {
    await db
      .prepare(
        `INSERT INTO mp_pending_members (governor_id, nick_name, power, town_center, kills, alliance_rank, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (governor_id) DO UPDATE SET
           nick_name = excluded.nick_name, power = excluded.power, town_center = excluded.town_center,
           kills = excluded.kills, alliance_rank = excluded.alliance_rank, avatar_url = excluded.avatar_url`
      )
      .run(governor_id, nick_name, power || 0, town_center || null, kills || 0, alliance_rank || '', avatar_url || '');
  },
  async remove(id) {
    await db.prepare(`DELETE FROM mp_pending_members WHERE id = ?`).run(id);
  },
  async removeByGovernorId(governor_id) {
    await db.prepare(`DELETE FROM mp_pending_members WHERE governor_id = ?`).run(governor_id);
  },
  async count() {
    return (await db.prepare(`SELECT COUNT(*) AS c FROM mp_pending_members`).get()).c;
  },
};
