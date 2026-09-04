const db = require('../config/db');
const Settings = require('./settings');

module.exports = {
  async list() {
    return db.prepare(`SELECT * FROM media ORDER BY id DESC`).all();
  },

  findById: async (id) => db.prepare(`SELECT * FROM media WHERE id = ?`).get(id),

  findByUrl: async (url) => db.prepare(`SELECT * FROM media WHERE url = ?`).get(url),

  async add({ url, filename, mime, size, width, height, uploaded_by }) {
    const info = await db
      .prepare(`INSERT INTO media (url, filename, mime, size, width, height, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(url, filename, mime, size, width || null, height || null, uploaded_by || null);
    return db.prepare(`SELECT * FROM media WHERE id = ?`).get(info.lastInsertRowid);
  },

  async remove(id) {
    const row = await db.prepare(`SELECT id FROM media WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM media WHERE id = ?`).run(id);
    return true;
  },

  // Content that currently references this URL — deleting it would leave broken
  // image links, so the service layer blocks the delete until it is cleared.
  async references(url) {
    const refs = [];
    for (const n of await db.prepare(`SELECT id, title FROM news WHERE cover = ?`).all(url)) refs.push(`news “${n.title}” (cover)`);
    for (const e of await db.prepare(`SELECT id, title FROM events WHERE image = ?`).all(url)) refs.push(`event “${e.title}”`);
    for (const a of await db.prepare(`SELECT id, title FROM articles WHERE cover = ?`).all(url)) refs.push(`tip “${a.title}”`);
    const s = await Settings.all();
    if (s.logo === url) refs.push('site logo');
    if (s.favicon === url) refs.push('site favicon');
    if (s.home_banner === url) refs.push('Home banner');
    return refs;
  },
};
