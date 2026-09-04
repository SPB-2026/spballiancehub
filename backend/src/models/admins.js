const db = require('../config/db');

const PUBLIC = 'id, username, email, name, created_at';

module.exports = {
  list: async () => db.prepare(`SELECT ${PUBLIC} FROM admins ORDER BY id`).all(),
  findByLogin: async (value) =>
    db.prepare(`SELECT * FROM admins WHERE username = ? OR email = ?`).get(value.trim(), value.trim()),
  findById: async (id) => db.prepare(`SELECT ${PUBLIC} FROM admins WHERE id = ?`).get(id),
  async create({ username, email, name, password_hash }) {
    const info = await db
      .prepare(`INSERT INTO admins (username, email, name, password_hash) VALUES (?, ?, ?, ?)`)
      .run(username, email, name, password_hash);
    return db.prepare(`SELECT ${PUBLIC} FROM admins WHERE id = ?`).get(info.lastInsertRowid);
  },
  async update(id, { username, email, name, password_hash }) {
    if (username !== undefined) await db.prepare(`UPDATE admins SET username = ? WHERE id = ?`).run(username, id);
    if (email !== undefined) await db.prepare(`UPDATE admins SET email = ? WHERE id = ?`).run(email, id);
    if (name !== undefined) await db.prepare(`UPDATE admins SET name = ? WHERE id = ?`).run(name, id);
    if (password_hash !== undefined) await db.prepare(`UPDATE admins SET password_hash = ? WHERE id = ?`).run(password_hash, id);
    return module.exports.findById(id);
  },
  remove: async (id) => (await db.prepare(`DELETE FROM admins WHERE id = ?`).run(id)).changes > 0,
  count: async () => (await db.prepare(`SELECT COUNT(*) AS c FROM admins`).get()).c,
};
