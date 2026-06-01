import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { errorHandler } from "./middleware.js";
import { uploadsDir } from "./utils/upload.js";

import mainAuth from "./routes/mainAuth.js";
import marketplace from "./routes/marketplace.js";
import investAuth from "./routes/investAuth.js";
import investPublic from "./routes/investPublic.js";
import investInvestor from "./routes/investInvestor.js";
import investAdmin from "./routes/investAdmin.js";
import investSecurity from "./routes/investSecurity.js";
import investWebhooks from "./routes/investWebhooks.js";
import { geoBlockMiddleware } from "./middleware/geoBlock.js";
import { startBackgroundJobs } from "./jobs/backgroundJobs.js";
import { ensureMissingPaymentGateways, ensureDefaultBankAccounts } from "./services/paymentGateways.js";
import { buildSitemapXml, buildRobotsTxt, buildInvestRobotsTxt } from "./services/mainSiteSettings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

function hostKind(req) {
  const h = (req.hostname || req.headers.host || "").toLowerCase().split(":")[0];
  if (h.startsWith("invest.")) return "invest";
  if (h === "localhost" || h === "127.0.0.1" || h.endsWith(".localhost")) return "local";
  return "main";
}

app.set("trust proxy", 1);

app.use(geoBlockMiddleware());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "akshaya-exim", time: new Date().toISOString() }));

app.get("/sitemap.xml", async (req, res, next) => {
  try {
    if (hostKind(req) === "invest") {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.status(404).type("text/plain").send("Not found");
    }
    res.setHeader("Content-Type", "application/xml");
    res.send(await buildSitemapXml());
  } catch (e) {
    next(e);
  }
});

app.get("/robots.txt", async (req, res, next) => {
  try {
    res.setHeader("Content-Type", "text/plain");
    if (hostKind(req) === "invest") {
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      return res.send(buildInvestRobotsTxt());
    }
    res.send(await buildRobotsTxt());
  } catch (e) {
    next(e);
  }
});

// MAIN DOMAIN (akshayaexim.com / .in) - marketplace
app.use("/api/main/auth", mainAuth);
app.use("/api/main", marketplace);

// INVEST SUBDOMAIN (invest.akshayaexim.com / .in)
app.use("/api/invest/auth", investAuth);
app.use("/api/invest/public", investPublic);
app.use("/api/invest", investInvestor);
app.use("/api/invest/admin", investAdmin);
app.use("/api/invest/security", investSecurity);
app.use("/api/invest/webhooks", investWebhooks);
app.use("/api/payments/webhooks", investWebhooks);

// Serve built frontend in production
const webDist = path.join(__dirname, "..", "..", "web", "dist");

if (fs.existsSync(webDist)) {
  app.use(
    express.static(webDist, {
      maxAge: config.env === "production" ? "7d" : 0,
      setHeaders(res, filePath) {
        if (/[/\\]assets[/\\].*\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|webp|svg)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    const kind = hostKind(req);
    const isLocal = kind === "local";

    // Invest subdomain: strip legacy /invest prefix → clean paths
    if (kind === "invest" && (req.path === "/invest" || req.path.startsWith("/invest/"))) {
      const tail = req.path.replace(/^\/invest(?=\/|$)/, "") || "/";
      return res.redirect(301, `${tail}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`);
    }

    // Main domain (production): send /invest/* to invest subdomain
    if (kind === "main" && (req.path === "/invest" || req.path.startsWith("/invest/"))) {
      const tail = req.path.replace(/^\/invest(?=\/|$)/, "") || "/";
      const baseHost = req.hostname.replace(/^www\./i, "");
      const proto = req.protocol || "https";
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      return res.redirect(301, `${proto}://invest.${baseHost}${tail}${qs}`);
    }

    // Invest subdomain should not serve marketplace-only paths
    if (kind === "invest" && !isLocal) {
      const mainOnly = ["/products", "/sell", "/categories", "/dashboard", "/admin"];
      if (mainOnly.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
        const baseHost = req.hostname.replace(/^invest\./i, "");
        const proto = req.protocol || "https";
        return res.redirect(301, `${proto}://${baseHost}${req.path}`);
      }
    }

    if (kind === "invest" && !isLocal) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    }

    res.sendFile(path.join(webDist, "index.html"));
  });
} else if (config.env === "production") {
  console.warn(`[warn] web/dist not found at ${webDist} — UI will not be served. Run: npm run build`);
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`\n  Akshaya Exim API running on http://localhost:${config.port}`);
  console.log(`  Marketplace API:  /api/main/*`);
  console.log(`  Invest API:       /api/invest/*`);
  startBackgroundJobs();
  ensureMissingPaymentGateways().catch(() => {});
  ensureDefaultBankAccounts().catch(() => {});
  console.log("");
});
