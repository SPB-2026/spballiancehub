const db = require('../config/db');

module.exports = {
  async publishedList(limit = 12) {
    return db.prepare(`SELECT * FROM news WHERE published = 1 ORDER BY COALESCE(published_at, created_at) DESC LIMIT ?`).all(limit);
  },
  publishedById: async (id) => db.prepare(`SELECT * FROM news WHERE id = ? AND published = 1`).get(id),
  async adminList() {
    return db.prepare(`SELECT * FROM news ORDER BY COALESCE(published_at, created_at) DESC`).all();
  },
  findById: async (id) => db.prepare(`SELECT * FROM news WHERE id = ?`).get(id),
  async create({ title, category, cover, summary, body, published, author, featured }) {
    const now = new Date().toISOString();
    const info = await db
      .prepare(
        `INSERT INTO news (title, category, cover, summary, body, published, published_at, author, featured)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(title, category, cover || null, summary, body, published ? 1 : 0, published ? now : null, author, featured ? 1 : 0);
    return db.prepare(`SELECT * FROM news WHERE id = ?`).get(info.lastInsertRowid);
  },
  async update(id, fields) {
    const allowed = ['title', 'category', 'cover', 'summary', 'body', 'published', 'published_at', 'author', 'featured'];
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
      await db.prepare(`UPDATE news SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return db.prepare(`SELECT * FROM news WHERE id = ?`).get(id);
  },
  async remove(id) {
    const row = await db.prepare(`SELECT id FROM news WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM news WHERE id = ?`).run(id);
    return true;
  },
  countPublished: async () => (await db.prepare(`SELECT COUNT(*) AS c FROM news WHERE published = 1`).get()).c,
};
