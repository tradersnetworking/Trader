import jwt from "jsonwebtoken";
import { config } from "../config.js";

const HANDOFF_TYPE = "staff_portal_handoff";
const TTL = "3m";

/** Signed one-time portal switch payload (stateless — works across restarts and duplicate requests). */
export function createStaffHandoff(targetScope, token, user) {
  return jwt.sign(
    { type: HANDOFF_TYPE, targetScope, token, user },
    config.jwtSecret,
    { expiresIn: TTL }
  );
}

export function consumeStaffHandoff(code, expectedScope) {
  if (!code || typeof code !== "string") return null;
  try {
    const payload = jwt.verify(code, config.jwtSecret);
    if (payload?.type !== HANDOFF_TYPE) return null;
    if (payload.targetScope !== expectedScope) return null;
    if (!payload.token || !payload.user) return null;
    return { token: payload.token, user: payload.user };
  } catch {
    return null;
  }
}
