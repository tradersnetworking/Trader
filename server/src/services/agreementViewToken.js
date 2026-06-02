import jwt from "jsonwebtoken";
import { config } from "../config.js";

const PURPOSE = "agreement-pdf-view";

export function signAgreementViewToken(agreementId, userId, { isAdmin = false } = {}) {
  return jwt.sign(
    { purpose: PURPOSE, agreementId, userId, isAdmin: !!isAdmin },
    config.jwtSecret,
    { expiresIn: "15m" }
  );
}

export function verifyAgreementViewToken(token) {
  const payload = jwt.verify(token, config.jwtSecret);
  if (payload?.purpose !== PURPOSE || !payload?.agreementId || !payload?.userId) {
    throw new Error("Invalid view token");
  }
  return payload;
}
