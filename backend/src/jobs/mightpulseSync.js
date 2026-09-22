// MightPulse roster sync job — periodically refreshes member Power, Town
// Center, and Role from the game via the MightPulse API. Same scheduling
// approach as the gift-code fetcher: an unref'd in-process setInterval, no
// external cron required. Interval: MP_SYNC_INTERVAL seconds (default 6h,
// minimum 1h). Membership changes (new/missing members) are never applied
// automatically by this job — see services/mightpulse.service.js.
const env = require('../config/env');
const mightpulse = require('../services/mightpulse.service');

let timer = null;
let nextRunAt = null;

const BOOT_DELAY_MS = 30000; // stagger after the gift-code boot fetch

async function run() {
  try {
    const { kingdomId, tag } = await mightpulse.getConfig();
    if (!kingdomId || !tag) return; // not configured yet — silently skip
    const result = await mightpulse.runSync();
    console.log(`[mightpulse-sync] updated ${result.updated}, queued ${result.queued} new, flagged ${result.flagged} missing`);
  } catch (err) {
    console.error('[mightpulse-sync] job failed:', err.message);
  }
}

function getSchedule() {
  return {
    interval_sec: env.MP_SYNC_INTERVAL,
    next_run_at: nextRunAt,
  };
}

function startMightPulseSyncJob() {
  if (timer) return;
  const intervalMs = Math.max(3600, env.MP_SYNC_INTERVAL) * 1000; // min 1h
  const tick = () => {
    nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    run();
  };
  timer = setInterval(tick, intervalMs);
  timer.unref();
  nextRunAt = new Date(Date.now() + BOOT_DELAY_MS + intervalMs).toISOString();
  const boot = setTimeout(run, BOOT_DELAY_MS);
  boot.unref();
}

module.exports = { startMightPulseSyncJob, getSchedule };
