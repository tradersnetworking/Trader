import { randomUUID } from "crypto";
import { mainDb, investDb } from "../db.js";
import { signToken } from "../utils/auth.js";

async function readSession(scope, userId) {
  if (scope === "main") {
    return mainDb.user.findUnique({
      where: { id: userId },
      select: { sessionId: true, isActive: true },
    });
  }
  return investDb.investor.findUnique({
    where: { id: userId },
    select: { sessionId: true, isActive: true },
  });
}

/** Create a new single-device session and return its id. */
export async function createAuthSession(scope, userId) {
  const sessionId = randomUUID();
  if (scope === "main") {
    await mainDb.user.update({ where: { id: userId }, data: { sessionId } });
  } else {
    await investDb.investor.update({ where: { id: userId }, data: { sessionId } });
  }
  return sessionId;
}

/** Issue JWT after login — invalidates any other device/browser session. */
export async function issueAuthToken(scope, { id, role, email }) {
  const sid = await createAuthSession(scope, id);
  return signToken({ id, role, email, sid }, scope);
}

/** Re-issue JWT for same session (e.g. email change) without kicking other tabs on this device. */
export async function reissueAuthToken(scope, { id, role, email }, sid) {
  const activeSid = sid || (await readSession(scope, id))?.sessionId;
  if (!activeSid) return issueAuthToken(scope, { id, role, email });
  return signToken({ id, role, email, sid: activeSid }, scope);
}

export async function validateAuthSession(scope, userId, sid) {
  if (!sid) return { ok: false, code: "SESSION_INVALID" };
  const record = await readSession(scope, userId);
  if (!record?.isActive) return { ok: false, code: "SESSION_INVALID" };
  if (!record.sessionId || record.sessionId !== sid) {
    return { ok: false, code: "SESSION_SUPERSEDED" };
  }
  return { ok: true };
}

/** Logout — invalidate server session so token cannot be reused. */
export async function revokeAuthSession(scope, userId) {
  if (scope === "main") {
    await mainDb.user.update({ where: { id: userId }, data: { sessionId: null } });
  } else {
    await investDb.investor.update({ where: { id: userId }, data: { sessionId: null } });
  }
}
