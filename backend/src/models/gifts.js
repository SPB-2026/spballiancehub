const db = require('../config/db');

function withStats(row) {
  row.remaining = row.max_uses - row.used_count;
  row.expired = row.expires_at ? Date.parse(row.expires_at) < Date.now() : false;
  return row;
}

module.exports = {
  list: async () => (await db.prepare(`SELECT * FROM gift_codes ORDER BY created_at DESC`).all()).map(withStats),
  // Member-facing list: codes with a PUBLISHED lifecycle state.
  //   - status 'approved' → visible (existing behaviour, incl. admin-disabled
  //     rows, which the member page still shows as "off");
  //   - status 'expired'  → visible with the existing Expired badge
  //     (matches the pre-fetcher behaviour for date-expired codes);
  //   - 'pending' / 'rejected' / 'invalid' → never visible to members.
  // Redemption itself is still gated: only status='approved' AND active=1
  // rows can be redeemed (see activeForRedemption + service checks).
  listApproved: async () =>
    (
      await db
        .prepare(`SELECT * FROM gift_codes WHERE status IN ('approved', 'expired') ORDER BY created_at DESC`)
        .all()
    ).map(withStats),
  findByNormalized: async (normalized) => {
    const row = await db.prepare(`SELECT * FROM gift_codes WHERE normalized_code = ?`).get(normalized);
    return row || null;
  },
  pendingCount: async () => (await db.prepare(`SELECT COUNT(*) AS c FROM gift_codes WHERE status = 'pending'`).get()).c,
  statusCounts: async () => {
    const rows = await db.prepare(`SELECT status, COUNT(*) AS c FROM gift_codes GROUP BY status`).all();
    const out = { pending: 0, approved: 0, rejected: 0, expired: 0, invalid: 0 };
    for (const r of rows) out[r.status] = r.c;
    return out;
  },
  async insertDiscovered(row) {
    const info = await db
      .prepare(
        `INSERT INTO gift_codes
           (code, description, reward, max_uses, per_member_limit, active, expires_at,
            status, display_code, normalized_code, source, source_url, discovered_at,
            platform, verification_status, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, now(), ?, ?, ?, now())`
      )
      .run(
        row.code,
        row.description,
        row.reward,
        row.max_uses,
        row.per_member_limit,
        row.active ? 1 : 0,
        row.expires_at || null,
        row.status,
        row.display_code,
        row.code,
        row.source,
        row.source_url,
        row.platform,
        row.verification_status,
        row.notes || null
      );
    return info;
  },
  async touchChecked(id, sourceName, verificationStatus, notes) {
    if (notes !== undefined) {
      await db
        .prepare(`UPDATE gift_codes SET last_checked_at = now(), verification_status = ?, notes = ?, updated_at = now() WHERE id = ?`)
        .run(verificationStatus, notes, id);
    } else {
      await db
        .prepare(`UPDATE gift_codes SET last_checked_at = now(), verification_status = ?, updated_at = now() WHERE id = ?`)
        .run(verificationStatus, id);
    }
  },
  async setStatus(id, status, notes) {
    if (notes !== undefined) {
      await db
        .prepare(`UPDATE gift_codes SET status = ?, notes = ?, updated_at = now() WHERE id = ?`)
        .run(status, notes, id);
    } else {
      await db.prepare(`UPDATE gift_codes SET status = ?, updated_at = now() WHERE id = ?`).run(status, id);
    }
  },
  // Date-based auto-expiry: only rows with a KNOWN expiry that has passed.
  // Unknown expiry (expires_at NULL) is never touched.
  async markExpiredWithPastDate() {
    const info = await db
      .prepare(
        `UPDATE gift_codes
         SET status = 'expired',
             notes = 'Auto-expired: stored expiry date passed. ' || COALESCE(notes, ''),
             updated_at = now()
         WHERE expires_at IS NOT NULL AND expires_at < now()
           AND status IN ('pending', 'approved')`
      )
      .run();
    return info.changes;
  },
  activeForRedemption: async (code) => {
    // Only APPROVED codes are redeemable — pending/rejected/expired/invalid
    // rows are invisible to redemption (404, no state leakage).
    const row = await db.prepare(`SELECT * FROM gift_codes WHERE code = ? AND status = 'approved'`).get(code);
    return row ? withStats(row) : null;
  },
  findById: async (id) => {
    const row = await db.prepare(`SELECT * FROM gift_codes WHERE id = ?`).get(id);
    return row ? withStats(row) : null;
  },
  async create({ code, description, reward, max_uses, per_member_limit, active, expires_at }) {
    const normalized = String(code).trim().toUpperCase();
    const info = await db
      .prepare(
        `INSERT INTO gift_codes (code, description, reward, max_uses, per_member_limit, active, expires_at, display_code, normalized_code)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(code, description, reward, max_uses, per_member_limit, active ? 1 : 0, expires_at || null, normalized, normalized);
    return module.exports.findById(info.lastInsertRowid);
  },
  async update(id, fields) {
    const allowed = ['code', 'description', 'reward', 'max_uses', 'per_member_limit', 'active', 'expires_at', 'notes', 'platform'];
    const sets = [];
    const values = [];
    for (const key of allowed) {
      if (fields[key] !== undefined) {
        sets.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }
    if (fields.code !== undefined) {
      sets.push('display_code = ?', 'normalized_code = ?');
      values.push(String(fields.code).trim().toUpperCase());
      values.push(String(fields.code).trim().toUpperCase());
    }
    if (sets.length > 0) {
      sets.push('updated_at = now()');
      values.push(id);
      await db.prepare(`UPDATE gift_codes SET ${sets.join(', ')} WHERE id = ?`).run(...values);
    }
    return module.exports.findById(id);
  },
  async remove(id) {
    const row = await db.prepare(`SELECT id FROM gift_codes WHERE id = ?`).get(id);
    if (!row) return false;
    await db.prepare(`DELETE FROM gift_codes WHERE id = ?`).run(id);
    return true;
  },
  async incrementUse(id) {
    const info = await db.prepare(`UPDATE gift_codes SET used_count = used_count + 1 WHERE id = ? AND used_count < max_uses`).run(id);
    if (info.changes === 0) throw new Error('GIFT_MAX_USES_EXCEEDED');
  },
  async redemptionCountForMember(giftId, memberId) {
    return (await db.prepare(`SELECT COUNT(*) AS c FROM gift_redemptions WHERE gift_code_id = ? AND member_id = ?`).get(giftId, memberId)).c;
  },
  async recordRedemption(giftId, memberId) {
    await db.prepare(`INSERT INTO gift_redemptions (gift_code_id, member_id) VALUES (?, ?)`).run(giftId, memberId);
  },
  async redemptionsFor(giftId) {
    return db
      .prepare(
        `SELECT r.id, r.redeemed_at, r.member_id, m.name AS member_name, m.game_user_id
         FROM gift_redemptions r JOIN members m ON m.id = r.member_id
         WHERE r.gift_code_id = ? ORDER BY r.redeemed_at DESC`
      )
      .all(giftId);
  },
  async myRedemptions(memberId) {
    return db
      .prepare(
        `SELECT r.id, r.redeemed_at, c.code, c.reward
         FROM gift_redemptions r JOIN gift_codes c ON c.id = r.gift_code_id
         WHERE r.member_id = ? ORDER BY r.redeemed_at DESC`
      )
      .all(memberId);
  },
};
