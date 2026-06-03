import { verifyToken } from "./utils/auth.js";
import { investDb } from "./db.js";
import { validateAuthSession } from "./services/authSession.js";

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function extractToken(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

// scope: "main" | "invest" - the token must have been issued for that portal
export function authRequired(scope) {
  return asyncH(async (req, res, next) => {
    const token = extractToken(req);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: "Authentication required", code: "AUTH_REQUIRED" });
    if (scope && payload.scope !== scope) {
      return res.status(403).json({ error: "Token not valid for this portal", code: "WRONG_SCOPE" });
    }
    const portal = scope || payload.scope;
    const session = await validateAuthSession(portal, payload.id, payload.sid);
    if (!session.ok) {
      const message =
        session.code === "SESSION_SUPERSEDED"
          ? "Your account was signed in on another device. Please sign in again."
          : "Session expired. Please sign in again.";
      return res.status(401).json({ error: message, code: session.code });
    }
    req.user = payload;
    next();
  });
}

// roles: array of allowed roles
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function requirePermission(permission) {
  return asyncH(async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Authentication required" });
    const investor = await investDb.investor.findUnique({ where: { id: req.user.id } });
    if (!investor) return res.status(401).json({ error: "User not found" });
    const { investorHasPermission } = await import("./services/rbac.js");
    if (!(await investorHasPermission(investor, permission))) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    req.staff = investor;
    next();
  });
}

export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) req.user = payload;
  next();
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "File too large (maximum 10 MB per file)."
        : err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Unexpected file field in upload."
          : err.message || "Upload failed";
    return res.status(400).json({ error: message, code: err.code });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
}
