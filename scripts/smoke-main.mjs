#!/usr/bin/env node
/** Smoke test main marketplace API — run with server on PORT (default 4000) */
const base = process.env.API_BASE || "http://localhost:4000";

const checks = [
  ["/api/health", (d) => d.ok === true],
  ["/api/main/public/site-config", (d) => d.config?.seo?.title],
  ["/api/main/products", (d) => Array.isArray(d.products)],
  ["/api/main/categories", (d) => Array.isArray(d.categories)],
  ["/robots.txt", null, async (res) => {
    const text = await res.text();
    return (
      res.ok &&
      text.includes("Sitemap:") &&
      text.includes("akshayaexim.in") &&
      text.includes("Disallow: /login") &&
      !/^Disallow: \/$/m.test(text)
    );
  }],
  ["/sitemap.xml", null, async (res) => {
    const text = await res.text();
    return (
      res.ok &&
      text.includes("<urlset") &&
      text.includes("xmlns:xhtml") &&
      text.includes("/privacy") &&
      text.includes("/returns") &&
      text.includes("hreflang") &&
      !text.includes("invest.")
    );
  }],
];

let failed = 0;
for (const [path, validateJson, validateRes] of checks) {
  try {
    const res = await fetch(`${base}${path}`);
    if (validateRes) {
      if (!(await validateRes(res))) throw new Error(`validation failed (${res.status})`);
    } else {
      const data = await res.json();
      if (!res.ok || !validateJson(data)) throw new Error(`validation failed (${res.status})`);
    }
    console.log(`✓ ${path}`);
  } catch (e) {
    console.error(`✗ ${path}: ${e.message}`);
    failed++;
  }
}
process.exit(failed ? 1 : 0);
