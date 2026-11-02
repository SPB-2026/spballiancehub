const db = require('../config/db');

const COLS = 'id, title, url, description, category, sort_order, published';

module.exports = {
  listPublished: async () => db.prepare(`SELECT ${COLS} FROM resources WHERE published = true ORDER BY sort_order ASC, id ASC`).all(),
  listAll: async () => db.prepare(`SELECT ${COLS} FROM resources ORDER BY sort_order ASC, id ASC`).all(),
  findById: async (id) => db.prepare(`SELECT ${COLS} FROM resources WHERE id = ?`).get(id),

  async create(f) {
    const row = await db
      .prepare('INSERT INTO resources (title, url, description, category, sort_order, published) VALUES (?, ?, ?, ?, ?, ?) RETURNING id')
      .get(f.title, f.url, f.description, f.category, f.sort_order, f.published);
    return module.exports.findById(row.id);
  },

  async update(id, f) {
    const allowed = ['title', 'url', 'description', 'category', 'sort_order', 'published'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (f[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(f[key]);
      }
    }
    if (sets.length === 0) return module.exports.findById(id);
    values.push(id);
    await db.prepare(`UPDATE resources SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    return module.exports.findById(id);
  },

  async remove(id) {
    await db.prepare('DELETE FROM resources WHERE id = ?').run(id);
  },
};
