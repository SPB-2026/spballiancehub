const db = require('../config/db');

// The `tags` column is a comma-separated string, but the API must always
// expose tags as a clean array. This normalizes ANY stored value — CSV
// string, JSON-encoded array string, null, empty, number, object — into a
// safe array of trimmed, non-empty tag strings, so rendering code can never
// crash on malformed legacy data.
function normalizeTags(raw) {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t === null || t === undefined ? '' : t).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const s = raw.trim();
    if (s === '') return [];
    if (s.startsWith('[')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return normalizeTags(parsed);
      } catch { /* not JSON — treat as CSV below */ }
    }
    return s.split(',').map((t) => t.trim()).filter(Boolean);
  }
  return [];
}

// Canonical storage form: "Tag One, Tag Two"
function toTagCsv(raw) {
  return normalizeTags(raw).join(', ');
}

const withTags = (row) => (row ? { ...row, tags: normalizeTags(row.tags) } : row);

module.exports = {
  normalizeTags,
  async publishedList(category = null, limit = 50) {
    if (category) {
      return (await db.prepare(`SELECT * FROM articles WHERE published = 1 AND category = ? ORDER BY published_at DESC LIMIT ?`).all(category, limit)).map(withTags);
    }
    return (await db.prepare(`SELECT * FROM articles WHERE published = 1 ORDER BY published_at DESC LIMIT ?`).all(limit)).map(withTags);
  },
  publishedById: async (id) => withTags(await db.prepare(`SELECT * FROM articles WHERE id = ? AND published = 1`).get(id)),
  async adminList() {
    return (await db.prepare(`SELECT * FROM articles ORDER BY published_at DESC`).all()).map(withTags);
  },
  findById: async (id) => withTags(await db.prepare(`SELECT * FROM articles WHERE id = ?`).get(id)),
  async create({ title, category, body, tags, published, cover }) {
    const now = new Date().toISOString();
    const info = await db
      .prepare(`INSERT INTO articles (title, category, body, tags, published, published_at, cover) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(title, category, body, toTagCsv(tags), published ? 1 : 0, published ? now : null, cover || null);
    return withTags(await db.prepare(`SELECT * FROM articles WHERE id = ?`).get(info.lastInsertRowid));
  },
  async update(id, fields) {
    const allowed = ['title', 'category', 'body', 'tags', 'published', 'published_at', 'cover'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(key === 'tags' ? toTagCsv(fields[key]) : fields[key]);
      }
    }
    if (sets.length > 0) {
      values.push(id);
      await db.prepare(`UPDATE articles SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return withTags(await db.prepare(`SELECT * FROM articles WHERE id = ?`).get(id));
  },
  async remove(id) {
    const row = await db.prepare(`SELECT id FROM articles WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM articles WHERE id = ?`).run(id);
    return true;
  },
  async categories() {
    return (await db.prepare(`SELECT DISTINCT category FROM articles WHERE published = 1 ORDER BY category`).all()).map((r) => r.category);
  },
};
