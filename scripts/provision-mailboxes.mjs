#!/usr/bin/env node
/**
 * Seed 5 mailboxes per portal and apply Hostinger SMTP/IMAP template.
 * Run from repo root: node scripts/provision-mailboxes.mjs
 * Requires server/.env with SMTP_PASS or MAIN_/INVEST_MAILBOX_SMTP_PASS for live send.
 */
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, "server/.env") });

const { ensureAllEmailInfrastructure, provisionPortalMailboxes, listDefaultMailboxAddresses } =
  await import("../server/src/services/mailboxProvisioning.js");

console.log("Provisioning email infrastructure…\n");
console.log("Main (.com):", listDefaultMailboxAddresses("main").map((m) => m.address).join(", "));
console.log("Invest (.in):", listDefaultMailboxAddresses("invest").map((m) => m.address).join(", "));

const results = await ensureAllEmailInfrastructure({ provisionSmtp: true });
console.log("\n", JSON.stringify(results, null, 2));
console.log("\nDone. Configure passwords in Admin → Mail Settings or set SMTP_PASS in server/.env");
