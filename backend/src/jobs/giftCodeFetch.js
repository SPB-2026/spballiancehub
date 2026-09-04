// Gift-code fetch job — periodically checks the configured Kingshot code
// sources for new codes.
//
// Scheduling method (documented per brief): IN-PROCESS SCHEDULER — an
// unref'd setInterval inside the API process, so it needs no browser tab
// open and no external
// cron. Interval: GIFT_CODE_FETCH_INTERVAL seconds from .env (default 21600
// = 6h, minimum 3600 = 1h). The job also performs one fetch shortly after
// boot so a fresh server has current data without waiting a full interval.
// Because the timer is unref'd, the job never keeps the Node process alive
// on its own; a platform cron hitting POST /api/admin/gifts/fetch can drive
// the same code path if preferred.
const env = require('../config/env');
const fetcher = require('../services/giftCodeFetcher');

let timer = null;
let nextRunAt = null;

const BOOT_DELAY_MS = 15000; // let the server settle before the boot fetch

async function run(triggeredBy) {
  try {
    await fetcher.runFetch(triggeredBy);
  } catch (err) {
    console.error('[gift-fetch] job failed:', err.message);
  }
}

function getSchedule() {
  return {
    interval_sec: env.GIFT_CODE_FETCH_INTERVAL,
    next_run_at: nextRunAt,
  };
}

function startGiftFetchJobs() {
  if (timer) return;
  const intervalMs = Math.max(3600, env.GIFT_CODE_FETCH_INTERVAL) * 1000; // min 1h
  const tick = () => {
    nextRunAt = new Date(Date.now() + intervalMs).toISOString();
    run('schedule');
  };
  timer = setInterval(tick, intervalMs);
  timer.unref();
  nextRunAt = new Date(Date.now() + BOOT_DELAY_MS + intervalMs).toISOString();
  const boot = setTimeout(() => run('boot'), BOOT_DELAY_MS);
  boot.unref();
}

module.exports = { startGiftFetchJobs, getSchedule };
