const db = require('../config/db');

module.exports = {
  // Admin view: everything, newest first.
  async list() {
    return db.prepare(`SELECT * FROM announcements ORDER BY priority DESC, id DESC`).all();
  },

  // Member-facing: published, not expired, highest priority first.
  async active(limit = 10) {
    return db
      .prepare(
        `SELECT * FROM announcements
         WHERE published = 1 AND (expires_at IS NULL OR expires_at > ?)
         ORDER BY priority DESC, id DESC LIMIT ?`
      )
      .all(new Date().toISOString(), limit);
  },

  findById: async (id) => db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(id),

  async create({ title, body, priority, published, expires_at }) {
    const info = await db
      .prepare(`INSERT INTO announcements (title, body, priority, published, expires_at) VALUES (?, ?, ?, ?, ?)`)
      .run(title, body, priority, published ? 1 : 0, expires_at || null);
    return db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(info.lastInsertRowid);
  },

  async update(id, fields) {
    const allowed = ['title', 'body', 'priority', 'published', 'expires_at'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (sets.length > 0) {
      values.push(id);
      await db.prepare(`UPDATE announcements SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return db.prepare(`SELECT * FROM announcements WHERE id = ?`).get(id);
  },

  async remove(id) {
    const row = await db.prepare(`SELECT id FROM announcements WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM announcements WHERE id = ?`).run(id);
    return true;
  },

  countActive: async () =>
    (await db.prepare(`SELECT COUNT(*) AS c FROM announcements WHERE published = 1 AND (expires_at IS NULL OR expires_at > ?)`)
      .get(new Date().toISOString())).c,
};
