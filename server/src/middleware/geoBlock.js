import { config } from "../config.js";
import { getSetting } from "../services/investSettings.js";

const EXEMPT = ["/api/health", "/api/invest/public/maintenance", "/api/invest/public/partners"];

export function geoBlockMiddleware() {
  return async (req, res, next) => {
    if (EXEMPT.some((p) => req.path.startsWith(p))) return next();
    const blocked = (process.env.BLOCKED_COUNTRY_CODES || "").split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    if (!blocked.length) return next();
    const country = (req.headers["cf-ipcountry"] || req.headers["x-country-code"] || "").toUpperCase();
    if (country && blocked.includes(country)) {
      return res.status(451).json({ error: "Service not available in your region", country });
    }
    next();
  };
}

export async function getSecuritySettings() {
  const screenshot = (await getSetting("screenshot_protection")) === "true";
  const watermark = Number(await getSetting("screenshot_watermark_opacity")) || 0.08;
  const geoBlocked = (process.env.BLOCKED_COUNTRY_CODES || "").split(",").filter(Boolean);
  return { screenshotProtection: screenshot, watermarkOpacity: watermark, blockedCountries: geoBlocked };
}
