const db = require('../config/db');

function withStatus(row) {
  const now = Date.now();
  const start = Date.parse(row.starts_at);
  const end = Date.parse(row.ends_at);
  row.status = now < start ? 'upcoming' : now > end ? 'completed' : 'ongoing';
  row.starts_ms = start;
  row.ends_ms = end;
  return row;
}

module.exports = {
  // Admin view: every event, highest priority first.
  async list() {
    return (await db.prepare(`SELECT * FROM events ORDER BY priority DESC, starts_at ASC`).all()).map(withStatus);
  },
  // Member-facing: published only (drives the Events page and the calendar).
  async publicList() {
    return (await db.prepare(`SELECT * FROM events WHERE published = 1 ORDER BY priority DESC, starts_at ASC`).all()).map(withStatus);
  },
  async listByStatus(status) {
    return (await module.exports.publicList()).filter((e) => e.status === status);
  },
  findById: async (id) => {
    const row = await db.prepare(`SELECT * FROM events WHERE id = ?`).get(id);
    return row ? withStatus(row) : null;
  },
  async create({ title, description, category, starts_at, ends_at, location, image, priority, published }) {
    const info = await db
      .prepare(`INSERT INTO events (title, description, category, starts_at, ends_at, location, image, priority, published)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(title, description, category, starts_at, ends_at, location || '', image || '', priority || 0, published === false ? 0 : 1);
    return module.exports.findById(info.lastInsertRowid);
  },
  async update(id, fields) {
    const allowed = ['title', 'description', 'category', 'starts_at', 'ends_at', 'location', 'image', 'priority', 'published'];
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
      await db.prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return module.exports.findById(id);
  },
  async remove(id) {
    const row = await db.prepare(`SELECT id FROM events WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM events WHERE id = ?`).run(id);
    return true;
  },
  count: async () => (await db.prepare(`SELECT COUNT(*) AS c FROM events`).get()).c,
};
