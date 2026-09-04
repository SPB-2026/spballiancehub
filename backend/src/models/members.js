const db = require('../config/db');

// Fields safe for other members to see. Private fields (game_user_id, email)
// are only returned by the admin-facing queries in admin.service.
const PUBLIC = `id, name, avatar, role, status, bio, contributions, score, join_date, last_active`;

// Display order: rank first (R5 → R1), then power (score) high → low within
// the rank, then name.
const RANK_ORDER = `CASE role WHEN 'R5' THEN 1 WHEN 'R4' THEN 2 WHEN 'R3' THEN 3 WHEN 'R2' THEN 4 ELSE 5 END`;

module.exports = {
  findById: async (id) => db.prepare(`SELECT * FROM members WHERE id = ?`).get(id),
  publicById: async (id) => db.prepare(`SELECT ${PUBLIC} FROM members WHERE id = ?`).get(id),
  async listPublic() {
    return db.prepare(`SELECT ${PUBLIC} FROM members ORDER BY ${RANK_ORDER}, score DESC, name`).all();
  },
  async listAll() {
    return db.prepare(`SELECT * FROM members ORDER BY ${RANK_ORDER}, score DESC, name`).all();
  },
  async create({ game_user_id, email, name, role, status, bio, contributions, score, join_date }) {
    const info = await db
      .prepare(
        `INSERT INTO members (game_user_id, email, name, role, status, bio, contributions, score, join_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(game_user_id, email, name, role || 'R1', status || 'active', bio || '', contributions || 0, score || 0, join_date);
    return db.prepare(`SELECT * FROM members WHERE id = ?`).get(info.lastInsertRowid);
  },
  async update(id, fields) {
    const allowed = ['name', 'avatar', 'role', 'status', 'bio', 'contributions', 'score', 'join_date', 'game_user_id', 'email', 'last_active'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (sets.length === 0) return module.exports.findById(id);
    values.push(id);
    await db.prepare(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return db.prepare(`SELECT * FROM members WHERE id = ?`).get(id);
  },
  async remove(id) {
    const row = await db.prepare(`SELECT id FROM members WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM members WHERE id = ?`).run(id);
    return true;
  },
  count: async () => (await db.prepare(`SELECT COUNT(*) AS c FROM members`).get()).c,
  countByStatus: async (status) => (await db.prepare(`SELECT COUNT(*) AS c FROM members WHERE status = ?`).get(status)).c,
  findRole: async (role) => db.prepare(`SELECT id, name FROM members WHERE role = ?`).all(role),
};
