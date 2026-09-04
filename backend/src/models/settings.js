const db = require('../config/db');

const DEFAULTS = {
  alliance_name: 'SPB Alliance',
  tagline: 'Your Alliance Command Center',
  alliance_rank: '',
  announcement: '',
  discord_url: '',
  youtube_url: '',
  timezone: 'UTC',
  logo: '',
};

module.exports = {
  DEFAULTS,
  async all() {
    const rows = await db.prepare(`SELECT key, value FROM settings`).all();
    const out = { ...DEFAULTS };
    for (const r of rows) out[r.key] = r.value;
    return out;
  },
  async get(key, fallback = null) {
    const row = await db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key);
    return row ? row.value : fallback !== null ? fallback : DEFAULTS[key];
  },
  async set(key, value) {
    await db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(key, value);
  },
  async setMany(pairs) {
    const stmt = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
    await db.transaction(async (entries) => {
      for (const [k, v] of entries) await stmt.run(k, v);
    })(pairs);
  },
};
