import { nanoid } from "nanoid";

const TTL_MS = 60_000;
/** @type {Map<string, { targetScope: string, token: string, user: object, expires: number }>} */
const pending = new Map();

function prune() {
  const now = Date.now();
  for (const [k, v] of pending) {
    if (v.expires <= now) pending.delete(k);
  }
}

export function createStaffHandoff(targetScope, token, user) {
  prune();
  const code = nanoid(32);
  pending.set(code, { targetScope, token, user, expires: Date.now() + TTL_MS });
  return code;
}

export function consumeStaffHandoff(code, expectedScope) {
  prune();
  const row = pending.get(code);
  pending.delete(code);
  if (!row || row.expires <= Date.now()) return null;
  if (row.targetScope !== expectedScope) return null;
  return { token: row.token, user: row.user };
}
