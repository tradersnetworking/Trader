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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "5mb" }));
app.use(cookieParser());
app.use("/uploads", express.static(uploadsDir));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "akshaya-exim", time: new Date().toISOString() }));

// MAIN DOMAIN (akshayaexim.com / .in) - marketplace
app.use("/api/main/auth", mainAuth);
app.use("/api/main", marketplace);

// INVEST SUBDOMAIN (invest.akshayaexim.com / .in)
app.use("/api/invest/auth", investAuth);
app.use("/api/invest/public", investPublic);
app.use("/api/invest", investInvestor);
app.use("/api/invest/admin", investAdmin);

// Serve built frontend in production
const webDist = path.join(__dirname, "..", "..", "web", "dist");
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(webDist, "index.html"));
  });
}

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`\n  Akshaya Exim API running on http://localhost:${config.port}`);
  console.log(`  Marketplace API:  /api/main/*`);
  console.log(`  Invest API:       /api/invest/*\n`);
});
