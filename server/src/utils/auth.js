import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config.js";

export function hashPassword(pw) {
  return bcrypt.hashSync(pw, 10);
}

export function comparePassword(pw, hash) {
  if (!hash) return false;
  return bcrypt.compareSync(pw, hash);
}

// scope: "main" or "invest" so tokens are not cross-usable between portals
export function signToken(payload, scope) {
  return jwt.sign({ ...payload, scope }, config.jwtSecret, { expiresIn: config.jwtExpires });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch {
    return null;
  }
}
