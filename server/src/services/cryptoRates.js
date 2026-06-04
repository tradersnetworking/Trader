import { getSetting, setSettings } from "./investSettings.js";

const CACHE_KEY = "crypto_fx_rates_json";
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/** CoinGecko ids for USD price */
const COINGECKO_IDS = {
  USDT: "tether",
  TRX: "tron",
  BNB: "binancecoin",
};

async function fetchUsdInr() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("USD/INR rate unavailable");
  const data = await res.json();
  const rate = Number(data?.rates?.INR);
  if (!rate || rate <= 0) throw new Error("Invalid USD/INR rate");
  return rate;
}

async function fetchUsdPrices() {
  const ids = Object.values(COINGECKO_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error("Crypto USD prices unavailable");
  const data = await res.json();
  const out = {};
  for (const [sym, id] of Object.entries(COINGECKO_IDS)) {
    const usd = Number(data?.[id]?.usd);
    out[sym] = usd > 0 ? usd : sym === "USDT" ? 1 : null;
  }
  if (!out.USDT) out.USDT = 1;
  return out;
}

function parseCached(raw) {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (!p?.updatedAt || !p?.usdInr) return null;
    if (Date.now() - new Date(p.updatedAt).getTime() > CACHE_TTL_MS) return null;
    return p;
  } catch {
    return null;
  }
}

export async function getCryptoFxRates({ refresh = false } = {}) {
  if (!refresh) {
    const cached = parseCached(await getSetting(CACHE_KEY));
    if (cached) return cached;
  }
  try {
    const [usdInr, usdPrices] = await Promise.all([fetchUsdInr(), fetchUsdPrices()]);
    const payload = {
      usdInr,
      usdPrices,
      updatedAt: new Date().toISOString(),
      source: "open.er-api.com + coingecko.com",
    };
    await setSettings({ [CACHE_KEY]: JSON.stringify(payload) });
    return payload;
  } catch (e) {
    const cached = parseCached(await getSetting(CACHE_KEY));
    if (cached) return { ...cached, stale: true };
    return {
      usdInr: 83,
      usdPrices: { USDT: 1, TRX: 0.12, BNB: 600 },
      updatedAt: new Date().toISOString(),
      source: "fallback",
      stale: true,
      error: e.message,
    };
  }
}

/** Convert crypto amount to INR using live USD rates. */
export async function cryptoAmountToInr(cryptoAmount, symbol) {
  const sym = String(symbol || "").toUpperCase();
  const amt = Number(cryptoAmount);
  if (!Number.isFinite(amt) || amt <= 0) return { ok: false, error: "Invalid crypto amount" };
  const fx = await getCryptoFxRates();
  const usd = fx.usdPrices?.[sym];
  if (!usd || usd <= 0) return { ok: false, error: `Rate not available for ${sym}` };
  const inr = Math.round(amt * usd * fx.usdInr * 100) / 100;
  return {
    ok: true,
    inr,
    usdInr: fx.usdInr,
    usdPrice: usd,
    stale: Boolean(fx.stale),
    updatedAt: fx.updatedAt,
  };
}
