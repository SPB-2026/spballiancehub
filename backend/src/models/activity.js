const db = require('../config/db');

module.exports = {
  async recent(limit = 200) {
    return db
      .prepare(`SELECT id, admin_id, admin_name, action, target, status, at
                FROM admin_activity ORDER BY id DESC LIMIT ?`)
      .all(Math.min(Math.max(Number(limit) || 200, 10), 1000));
  },
  clear: async () => (await db.prepare(`DELETE FROM admin_activity`).run()).changes,
  count: async () => (await db.prepare(`SELECT COUNT(*) AS c FROM admin_activity`).get()).c,
};
