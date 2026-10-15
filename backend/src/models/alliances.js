const db = require('../config/db');

const COLUMNS = 'id, key, label, kingdom_id, tag, show_in_leaderboard, is_primary';

module.exports = {
  async listAll() {
    return db.prepare(`SELECT ${COLUMNS} FROM alliances ORDER BY is_primary DESC, id ASC`).all();
  },

  async findById(id) {
    return db.prepare(`SELECT ${COLUMNS} FROM alliances WHERE id = ?`).get(id);
  },

  async findByKey(key) {
    return db.prepare(`SELECT ${COLUMNS} FROM alliances WHERE key = ?`).get(key);
  },

  // The "main" alliance (SPB 1749). Used as the default wherever a single
  // alliance has to be picked without the caller specifying one.
  async findPrimary() {
    return db.prepare(`SELECT ${COLUMNS} FROM alliances WHERE is_primary = true LIMIT 1`).get();
  },

  async update(id, fields) {
    const allowed = ['label', 'kingdom_id', 'tag', 'show_in_leaderboard'];
    const entries = Object.entries(fields).filter(([k]) => allowed.includes(k));
    if (entries.length === 0) return this.findById(id);
    const set = entries.map(([k]) => `${k} = ?`).join(', ');
    await db.prepare(`UPDATE alliances SET ${set} WHERE id = ?`).run(...entries.map(([, v]) => v), id);
    return this.findById(id);
  },
};
