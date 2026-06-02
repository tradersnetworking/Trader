#!/usr/bin/env node
/**
 * Submit main marketplace sitemap to Google, Bing, Yandex & IndexNow.
 * Usage:
 *   node scripts/main-seo-submit.mjs
 *   API_BASE=https://akshayaexim.com node scripts/main-seo-submit.mjs
 */
const base = (process.env.API_BASE || "http://127.0.0.1:4000").replace(/\/$/, "");
const secret = process.env.MAIN_SEO_SUBMIT_SECRET || "";

const res = await fetch(`${base}/api/main/public/seo/submit-indexing`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(secret ? { "x-seo-submit-secret": secret } : {}),
  },
});

let data;
try {
  data = await res.json();
} catch {
  data = null;
}

if (!res.ok) {
  console.error("Submit failed:", res.status, data?.error || data);
  process.exit(1);
}

console.log("Sitemap:", data.sitemapUrl);
console.log("URLs submitted:", data.urlCount);
console.log("Ping results:", data.ping?.map((p) => `${p.ok ? "OK" : "FAIL"} ${p.url || p.endpoint}`).join("\n  "));
if (data.indexNow) {
  console.log("IndexNow key:", data.indexNow.keyUrl);
  console.log(
    "IndexNow:",
    data.indexNow.results?.map((r) => `${r.ok ? "OK" : "FAIL"} ${r.endpoint} (${r.status || r.error})`).join("\n  ")
  );
}
console.log("\nDone at", data.pingedAt);
