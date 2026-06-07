import { getMailbox, isMailboxImapConfigured } from "./mailboxConfig.js";

const SENT_HINTS = [/\bsent\b/i, /sent\s*items/i, /envoy[eé]s/i];
const TRASH_HINTS = [/\btrash\b/i, /\bbin\b/i, /\bdeleted\b/i, /corbeille/i];

function cleanupEnabled() {
  return process.env.MAILBOX_SENT_CLEANUP !== "false";
}

async function findFolder(client, specialUse, hints) {
  const list = await client.list();
  const byFlag = list.find((mb) => mb.specialUse === specialUse);
  if (byFlag?.path) return byFlag.path;
  return list.find((mb) => hints.some((re) => re.test(mb.path)))?.path || null;
}

async function deleteAllInFolder(client, folderPath) {
  const lock = await client.getMailboxLock(folderPath);
  try {
    const uids = await client.search({ all: true }, { uid: true });
    if (!uids?.length) return 0;
    await client.messageDelete(uids, { uid: true });
    return uids.length;
  } finally {
    lock.release();
  }
}

/**
 * Permanently remove all messages from Sent (and optionally Trash) via IMAP.
 * Keeps outbound-only mailboxes like noreply@ within Hostinger quota.
 */
export async function purgeMailboxSentFolder(portal = "invest", mailboxId = "noreply", { emptyTrash = true } = {}) {
  if (!cleanupEnabled()) return { skipped: true, reason: "disabled" };

  const mailbox = await getMailbox(portal, mailboxId, true);
  if (!isMailboxImapConfigured(mailbox)) {
    return { deleted: 0, trashDeleted: 0, mailbox: mailbox?.address, error: "IMAP not configured" };
  }

  const { ImapFlow } = await import("imapflow");
  const client = new ImapFlow({
    host: mailbox.imap.host,
    port: Number(mailbox.imap.port) || 993,
    secure: mailbox.imap.secure !== false && mailbox.imap.secure !== "false",
    auth: { user: mailbox.imap.user, pass: mailbox.imap.pass },
    logger: false,
  });

  try {
    await client.connect();
    const sentPath = await findFolder(client, "\\Sent", SENT_HINTS);
    if (!sentPath) return { deleted: 0, mailbox: mailbox.address, error: "Sent folder not found" };

    const deleted = await deleteAllInFolder(client, sentPath);
    let trashDeleted = 0;
    if (emptyTrash && process.env.MAILBOX_EMPTY_TRASH !== "false") {
      const trashPath = await findFolder(client, "\\Trash", TRASH_HINTS);
      if (trashPath) trashDeleted = await deleteAllInFolder(client, trashPath);
    }

    await client.logout();
    return { deleted, trashDeleted, mailbox: mailbox.address, folder: sentPath };
  } catch (err) {
    try {
      await client.logout();
    } catch {
      /* ignore */
    }
    return { deleted: 0, mailbox: mailbox.address, error: err.message };
  }
}

/** Background job — purge Sent for configured outbound mailboxes. */
export async function runMailboxSentCleanupJob(portal = "invest") {
  if (!cleanupEnabled()) return { skipped: true };

  const ids = (process.env.MAILBOX_SENT_CLEANUP_IDS || "noreply")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const results = [];
  for (const mailboxId of ids) {
    results.push({ mailboxId, ...(await purgeMailboxSentFolder(portal, mailboxId)) });
  }
  return { portal, results };
}

const AUTO_CLEANUP_MAILBOXES = new Set(["noreply", "finance"]);
let debounceTimer = null;
const pending = new Set();

/** Debounced cleanup after SMTP send — avoids hammering IMAP on every OTP. */
export function scheduleMailboxSentCleanup(portal = "invest", mailboxId = "noreply") {
  if (!cleanupEnabled() || !AUTO_CLEANUP_MAILBOXES.has(mailboxId)) return;
  pending.add(`${portal}:${mailboxId}`);
  if (debounceTimer) return;
  const delay = Number(process.env.MAILBOX_SENT_CLEANUP_DEBOUNCE_MS || 90_000);
  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    const keys = [...pending];
    pending.clear();
    for (const key of keys) {
      const [p, id] = key.split(":");
      try {
        const result = await purgeMailboxSentFolder(p, id);
        if (result.deleted > 0 || result.trashDeleted > 0) {
          console.log(`[mail:cleanup] ${result.mailbox} — removed ${result.deleted} sent, ${result.trashDeleted || 0} trash`);
        }
      } catch (err) {
        console.warn(`[mail:cleanup] ${id}:`, err.message);
      }
    }
  }, delay);
}
