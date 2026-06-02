import { investDb } from "../db.js";

export function clientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length) return xf.split(",")[0].trim();
  if (Array.isArray(xf) && xf[0]) return String(xf[0]).trim();
  return req.socket?.remoteAddress || req.ip || null;
}

function parseDevice(userAgent) {
  if (!userAgent) return "Unknown";
  const ua = String(userAgent);
  if (/iPhone|Android.*Mobile|Mobile/i.test(ua)) return "Mobile";
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  return "Desktop";
}

async function resolveGeo(ip, req) {
  const hdrCountry = req.headers["cf-ipcountry"] || req.headers["x-country-code"];
  if (hdrCountry && hdrCountry !== "XX" && hdrCountry !== "T1") {
    return { country: String(hdrCountry), region: null, city: null };
  }
  if (!ip || ip === "127.0.0.1" || ip.startsWith("::ffff:127.") || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return { country: "Local", region: null, city: null };
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,regionName,city`, {
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const j = await res.json();
    if (j.status === "success") {
      return { country: j.country || null, region: j.regionName || null, city: j.city || null };
    }
  } catch {
    /* optional geo lookup */
  }
  return { country: hdrCountry ? String(hdrCountry) : null, region: null, city: null };
}

/** Record login with IP/geo; mark prior sessions as not current (one device). */
export async function recordInvestorLogin(investorId, sessionId, req) {
  if (!investorId || !sessionId) return;
  const ip = clientIp(req);
  const geo = await resolveGeo(ip, req);
  const userAgent = req.headers["user-agent"] || null;
  const deviceLabel = parseDevice(userAgent);

  await investDb.loginSession.updateMany({
    where: { investorId, isCurrent: true },
    data: { isCurrent: false },
  });

  await investDb.loginSession.create({
    data: {
      investorId,
      sessionId,
      ipAddress: ip,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      userAgent: userAgent?.slice(0, 500) || null,
      deviceLabel,
      isCurrent: true,
    },
  });
}

export async function listInvestorLoginSessions(investorId, take = 25) {
  return investDb.loginSession.findMany({
    where: { investorId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export function formatGeo(session) {
  const parts = [session.city, session.region, session.country].filter(Boolean);
  return parts.length ? parts.join(", ") : session.country || "—";
}
