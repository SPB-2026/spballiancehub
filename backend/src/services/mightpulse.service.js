// Syncs member rosters against the MightPulse API — one pass per registered
// alliance (see the alliances table; e.g. SPB in Kingdom 1749 and SPB in
// Kingdom 1660, which share a tag and are told apart by kingdom).
//
// What syncs automatically (no admin action needed): for members already on
// the site, their Power, Town Center, and Role are refreshed from the game
// every time this runs. Membership itself is never changed automatically —
// a roster member with no matching site record is queued in
// mp_pending_members for the admin to approve or dismiss, and a site member
// no longer seen in THEIR alliance's roster is flagged (mp_missing) rather
// than deleted, so a bad API response or a brief absence can't silently wipe
// someone out.
//
// Members with no alliance (e.g. friends added manually from other
// kingdoms) belong to no roster, so they're never flagged as missing.
const Members = require('../models/members');
const Pending = require('../models/mpPending');
const Alliances = require('../models/alliances');
const { fetchAllianceRoster, mapAllianceRankToRole } = require('../utils/mightpulse');

async function syncOneAlliance(alliance, existingAll) {
  const { members: roster } = await fetchAllianceRoster(alliance.kingdom_id, alliance.tag);

  const byGameId = new Map(existingAll.filter((m) => m.game_user_id).map((m) => [String(m.game_user_id), m]));
  const seenGameIds = new Set();

  let updated = 0;
  let queued = 0;

  for (const rm of roster) {
    const governorId = String(rm.governor_id ?? rm.fid ?? '');
    if (!governorId) continue;
    seenGameIds.add(governorId);

    const match = byGameId.get(governorId);
    if (match) {
      await Members.update(match.id, {
        role: mapAllianceRankToRole(rm.alliance_rank),
        score: Math.round(Number(rm.power) || 0),
        town_center: Number(rm.town_center_level) || null,
        // Found in this alliance's roster, so that's where they belong —
        // covers someone untagged who turns out to be here, or who moved.
        alliance_id: alliance.id,
        mp_missing: false,
        mp_last_synced_at: new Date().toISOString(),
      });
      updated += 1;
    } else {
      await Pending.upsert({
        governor_id: governorId,
        nick_name: rm.nick_name || `Governor ${governorId}`,
        power: Math.round(Number(rm.power) || 0),
        town_center: Number(rm.town_center_level) || null,
        kills: Math.round(Number(rm.kills) || 0),
        alliance_rank: mapAllianceRankToRole(rm.alliance_rank),
        avatar_url: rm.avatar_url || '',
        alliance_id: alliance.id,
      });
      queued += 1;
    }
  }

  // Only members recorded as part of THIS alliance can be "missing" from its
  // roster. An empty roster for an alliance we already have members in is
  // far more likely a glitch or a mistyped kingdom/tag than everyone leaving
  // at once, so in that case nobody gets flagged.
  const belongsHere = existingAll.filter((m) => m.alliance_id === alliance.id && m.game_user_id);
  let flagged = 0;
  let warning = null;
  if (roster.length === 0 && belongsHere.length > 0) {
    warning = 'MightPulse returned an empty roster — nobody was flagged. Check the kingdom/tag are correct.';
  } else {
    for (const m of belongsHere) {
      const stillPresent = seenGameIds.has(String(m.game_user_id));
      if (!stillPresent && !m.mp_missing) {
        await Members.update(m.id, { mp_missing: true });
        flagged += 1;
      }
    }
  }

  return { rosterSize: roster.length, updated, queued, flagged, warning };
}

// Syncs every registered alliance — or just one, if allianceKey is given.
// One alliance failing (bad kingdom ID, API hiccup) never blocks the others,
// and a failed fetch changes nothing for that alliance (no flagging on bad data).
async function runSync(allianceKey) {
  let alliances = await Alliances.listAll();
  if (allianceKey) alliances = alliances.filter((a) => a.key === allianceKey);

  const totals = { rosterSize: 0, updated: 0, queued: 0, flagged: 0 };
  const perAlliance = [];

  for (const alliance of alliances) {
    // Re-read members per pass, since an earlier alliance's pass may have
    // retagged someone.
    // eslint-disable-next-line no-await-in-loop
    const existingAll = await Members.listAll();
    try {
      // eslint-disable-next-line no-await-in-loop
      const r = await syncOneAlliance(alliance, existingAll);
      totals.rosterSize += r.rosterSize;
      totals.updated += r.updated;
      totals.queued += r.queued;
      totals.flagged += r.flagged;
      perAlliance.push({ key: alliance.key, label: alliance.label, ...r });
    } catch (err) {
      perAlliance.push({ key: alliance.key, label: alliance.label, error: err.message });
    }
  }

  // If every attempted alliance failed outright, surface that as an error
  // rather than a misleading "0 updated" success.
  if (perAlliance.length > 0 && perAlliance.every((p) => p.error)) {
    const first = perAlliance[0].error;
    const err = new Error(first);
    err.status = 502;
    err.expose = true;
    throw err;
  }

  return { ...totals, alliances: perAlliance };
}

async function listPending(allianceId) {
  const all = await Pending.listAll();
  return allianceId ? all.filter((p) => p.alliance_id === allianceId) : all;
}

async function listMissing(allianceId) {
  const all = await Members.listAll(allianceId);
  return all.filter((m) => m.mp_missing);
}

async function approvePending(id) {
  const p = await Pending.findById(id);
  if (!p) return null;
  const created = await Members.create({
    game_user_id: p.governor_id,
    email: null,
    name: p.nick_name,
    role: p.alliance_rank || 'R1',
    status: 'active',
    bio: '',
    contributions: 0,
    score: p.power || 0,
    town_center: p.town_center || null,
    join_date: new Date().toISOString().slice(0, 10),
    alliance_id: p.alliance_id || null,
  });
  await Pending.remove(id);
  return created;
}

async function approveAllPending(allianceId) {
  const all = await listPending(allianceId);
  const created = [];
  const failed = [];
  for (const p of all) {
    try {
      // eslint-disable-next-line no-await-in-loop
      created.push(await approvePending(p.id));
    } catch (err) {
      failed.push({ id: p.id, nick_name: p.nick_name, error: err.message });
    }
  }
  return { created, failed };
}

async function dismissPending(id) {
  await Pending.remove(id);
  return { ok: true };
}

// "False alarm" — clears the missing flag without touching membership.
// To actually remove someone confirmed to have left, use the existing
// DELETE /admin/members/:id route.
async function dismissMissing(id) {
  await Members.update(id, { mp_missing: false });
  return { ok: true };
}

module.exports = {
  runSync,
  listPending,
  listMissing,
  approvePending,
  approveAllPending,
  dismissPending,
  dismissMissing,
};
