const TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { investorId: string, staff: boolean, expiresAt: number }>} */
const pending = new Map();

export function setPending2FA(email, data) {
  pending.set(String(email).toLowerCase(), {
    investorId: data.investorId,
    staff: !!data.staff,
    expiresAt: Date.now() + TTL_MS,
  });
}

export function getPending2FA(email) {
  const key = String(email).toLowerCase();
  const rec = pending.get(key);
  if (!rec || Date.now() > rec.expiresAt) {
    pending.delete(key);
    return null;
  }
  return rec;
}

export function consumePending2FA(email) {
  const rec = getPending2FA(email);
  if (!rec) return null;
  pending.delete(String(email).toLowerCase());
  return rec;
}
