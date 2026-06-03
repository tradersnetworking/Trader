import { runMaturityNotificationJob } from "./maturityNotifications.js";
import { runRoiEngineCycle } from "../services/roiEngine.js";
import { runReconciliation } from "../services/treasury.js";
import { syncSupportInbox } from "../services/supportMail.js";
import { runReferralAutoPayoutJob } from "../services/referralPayoutJob.js";
import { runRoiPayoutReminderJob } from "./roiPayoutReminders.js";
import { runMarketplaceMaintenanceJob, bootstrapMarketplaceMedia } from "./marketplaceCatalogSync.js";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

let roiRunning = false;
let treasuryRunning = false;
let mailRunning = false;

async function safeRun(name, fn) {
  try {
    const result = await fn();
    console.log(`[job:${name}]`, result);
  } catch (e) {
    console.error(`[job:${name}]`, e.message);
  }
}

export function startBackgroundJobs() {
  const maturityInterval = Number(process.env.MATURITY_JOB_INTERVAL_MS || 6 * HOUR);
  setInterval(() => safeRun("maturity", runMaturityNotificationJob), maturityInterval);
  safeRun("maturity", runMaturityNotificationJob);

  setInterval(async () => {
    if (roiRunning) return;
    roiRunning = true;
    try { await safeRun("roi-engine", runRoiEngineCycle); } finally { roiRunning = false; }
  }, HOUR);
  safeRun("roi-engine", runRoiEngineCycle);

  setInterval(async () => {
    if (treasuryRunning) return;
    treasuryRunning = true;
    try { await safeRun("treasury", runReconciliation); } finally { treasuryRunning = false; }
  }, DAY);

  setInterval(async () => {
    if (mailRunning) return;
    mailRunning = true;
    try { await safeRun("support-mail", syncSupportInbox); } finally { mailRunning = false; }
  }, 5 * 60 * 1000);

  setInterval(() => safeRun("referral-payout", runReferralAutoPayoutJob), DAY);
  safeRun("referral-payout", runReferralAutoPayoutJob);

  setInterval(() => safeRun("roi-payout-reminder", runRoiPayoutReminderJob), DAY);
  safeRun("roi-payout-reminder", runRoiPayoutReminderJob);

  const marketplaceInterval = Number(process.env.MARKETPLACE_SYNC_INTERVAL_MS || 12 * HOUR);
  let marketplaceRunning = false;
  setInterval(async () => {
    if (marketplaceRunning) return;
    marketplaceRunning = true;
    try {
      await safeRun("marketplace-maintenance", runMarketplaceMaintenanceJob);
    } finally {
      marketplaceRunning = false;
    }
  }, marketplaceInterval);

  if (process.env.MARKETPLACE_BOOTSTRAP_ON_START !== "false") {
    const bootstrapDelay = Number(process.env.MARKETPLACE_BOOTSTRAP_DELAY_MS || 45_000);
    setTimeout(() => safeRun("marketplace-bootstrap", bootstrapMarketplaceMedia), bootstrapDelay);
  }
}
