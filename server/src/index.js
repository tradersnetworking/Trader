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
import { getOrCreateIndexNowKey } from "./services/mainSeo.js";
import { resolveHostKindSync, refreshDomainCache } from "./services/additionalDomains.js";
import { resolveShareMeta, injectMetaIntoHtml } from "./services/shareMeta.js";
import shareOg from "./routes/shareOg.js";
import { paymentOrigin } from "./utils/paymentUrls.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

function hostKind(req) {
  return resolveHostKindSync(req);
}

app.set("trust proxy", 1);

app.use(geoBlockMiddleware());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "akshaya-exim", time: new Date().toISOString() }));
app.use("/api/share", shareOg);

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

/** IndexNow key verification — main marketplace hosts only */
app.get(/^\/([a-f0-9]{32})\.txt$/i, async (req, res, next) => {
  try {
    if (hostKind(req) === "invest") return next();
    const key = await getOrCreateIndexNowKey();
    if (req.params[0]?.toLowerCase() !== key) return next();
    res.type("text/plain").send(key);
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
      index: false,
      maxAge: config.env === "production" ? "7d" : 0,
      setHeaders(res, filePath) {
        if (/[/\\]index\.html$/i.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          return;
        }
        if (/\.html$/i.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          return;
        }
        if (/[/\\]assets[/\\].*\.[a-f0-9]{8,}\.(js|css|woff2?|png|jpg|webp|svg)$/i.test(filePath)) {
          res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
        }
      },
    })
  );

  app.get("*", async (req, res, next) => {
    if (req.path.startsWith("/api")) return next();

    const kind = hostKind(req);
    const isLocal = kind === "local";

    // Disabled additional domain → redirect to invest subdomain
    if (kind === "invest-disabled") {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      const sub = (process.env.INVEST_ORIGIN || config.investOrigin || "https://invest.akshayaexim.com").replace(/\/$/, "");
      return res.redirect(301, `${sub}${req.path}${qs}`);
    }

    if (kind === "invest" && req.path.startsWith("/pay/")) {
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      return res.redirect(301, `${paymentOrigin()}${req.path}${qs}`);
    }

    // Invest subdomain: strip legacy /invest prefix → clean paths
    if (kind === "invest" && (req.path === "/invest" || req.path.startsWith("/invest/"))) {
      const tail = req.path.replace(/^\/invest(?=\/|$)/, "") || "/";
      return res.redirect(301, `${tail}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`);
    }

    // Main domain (production): send /invest/* to invest subdomain (not on additional alias domains)
    if (kind === "main" && (req.path === "/invest" || req.path.startsWith("/invest/"))) {
      const tail = req.path.replace(/^\/invest(?=\/|$)/, "") || "/";
      const baseHost = req.hostname.replace(/^www\./i, "");
      const proto = req.protocol || "https";
      const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
      return res.redirect(301, `${proto}://invest.${baseHost}${tail}${qs}`);
    }

    // Invest subdomain: redirect marketplace-only paths (not /dashboard or /admin — those are the invest portal too)
    if (kind === "invest" && !isLocal) {
      const marketplaceOnly = ["/products", "/sell", "/categories", "/about", "/returns", "/faq"];
      if (marketplaceOnly.some((p) => req.path === p || req.path.startsWith(`${p}/`))) {
        const baseHost = req.hostname.replace(/^invest\./i, "");
        const proto = req.protocol || "https";
        const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
        return res.redirect(301, `${proto}://${baseHost}${req.path}${qs}`);
      }
    }

    if (kind === "invest" && !isLocal) {
      res.setHeader("X-Robots-Tag", "noindex, nofollow, noarchive");
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Vary", "Host");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const indexPath = path.join(webDist, "index.html");
    try {
      const meta = await resolveShareMeta(req);
      const html = injectMetaIntoHtml(fs.readFileSync(indexPath, "utf8"), meta);
      return res.status(200).send(html);
    } catch (err) {
      console.error("[share-meta]", err);
      return res.sendFile(indexPath);
    }
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
  refreshDomainCache(true).catch(() => {});
  console.log("");
});
