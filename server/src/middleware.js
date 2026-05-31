import { verifyToken } from "./utils/auth.js";

export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function extractToken(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith("Bearer ")) return h.slice(7);
  if (req.cookies && req.cookies.token) return req.cookies.token;
  return null;
}

// scope: "main" | "invest" - the token must have been issued for that portal
export function authRequired(scope) {
  return (req, res, next) => {
    const token = extractToken(req);
    const payload = token ? verifyToken(token) : null;
    if (!payload) return res.status(401).json({ error: "Authentication required" });
    if (scope && payload.scope !== scope) {
      return res.status(403).json({ error: "Token not valid for this portal" });
    }
    req.user = payload;
    next();
  };
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

export function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  const payload = token ? verifyToken(token) : null;
  if (payload) req.user = payload;
  next();
}

export function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Server error" });
}
