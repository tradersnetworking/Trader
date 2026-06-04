#!/usr/bin/env node
/**
 * Lightweight load test for invest public + health endpoints.
 * LOAD_BASE=https://invest.akshayaexim.com LOAD_CONCURRENCY=20 LOAD_DURATION_SEC=30 node scripts/load-test-invest.mjs
 */
const BASE = (process.env.LOAD_BASE || process.env.INVEST_API || "https://invest.akshayaexim.com").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 15);
const DURATION_SEC = Number(process.env.LOAD_DURATION_SEC || 20);
const PATHS = [
  "/api/health",
  "/api/invest/public/plans",
  "/api/invest/public/gateways",
  "/api/invest/public/crypto-rates",
];

const stats = { ok: 0, err: 0, latencies: [] };
let stop = false;

async function oneRequest() {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)];
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { Accept: "application/json" } });
    const ms = performance.now() - t0;
    stats.latencies.push(ms);
    if (res.ok) stats.ok++;
    else stats.err++;
  } catch {
    stats.err++;
    stats.latencies.push(performance.now() - t0);
  }
}

async function worker() {
  while (!stop) await oneRequest();
}

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1];
}

console.log(`Load test → ${BASE}\nConcurrency: ${CONCURRENCY}, duration: ${DURATION_SEC}s\n`);

const workers = Array.from({ length: CONCURRENCY }, () => worker());
await new Promise((r) => setTimeout(r, DURATION_SEC * 1000));
stop = true;
await Promise.all(workers);

const total = stats.ok + stats.err;
const p50 = percentile(stats.latencies, 50);
const p95 = percentile(stats.latencies, 95);
const p99 = percentile(stats.latencies, 99);
const rps = (total / DURATION_SEC).toFixed(1);
const failRate = total ? ((stats.err / total) * 100).toFixed(2) : "0";

console.log(`Requests: ${total} (${rps} req/s)`);
console.log(`Success: ${stats.ok} | Errors: ${stats.err} (${failRate}% fail)`);
console.log(`Latency ms — p50: ${p50.toFixed(0)} | p95: ${p95.toFixed(0)} | p99: ${p99.toFixed(0)}`);

const pass = stats.err / Math.max(total, 1) < 0.02 && p95 < 3000;
console.log(pass ? "\nLOAD TEST PASSED" : "\nLOAD TEST FAILED (fail rate ≥2% or p95 ≥3000ms)");
process.exit(pass ? 0 : 1);
