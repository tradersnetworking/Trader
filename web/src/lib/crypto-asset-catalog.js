/** Crypto assets for invest portal (USDT TRC20/BEP20, TRON, BNB). */

export const CRYPTO_ASSET_CATALOG = [
  {
    symbol: "USDT",
    name: "Tether USD",
    chains: [
      { value: "TRC20", label: "TRC20", hint: "Tron — low fees" },
      { value: "BEP20", label: "BEP20", hint: "BNB Smart Chain" },
    ],
  },
  {
    symbol: "TRX",
    name: "TRON",
    chains: [{ value: "TRON", label: "Tron Network", hint: "Native TRX" }],
  },
  {
    symbol: "BNB",
    name: "BNB",
    chains: [{ value: "BEP20", label: "BNB Smart Chain", hint: "Native BNB" }],
  },
];

export function findCatalogAsset(symbol) {
  const sym = String(symbol || "").trim().toUpperCase();
  return CRYPTO_ASSET_CATALOG.find((a) => a.symbol === sym);
}

export function formatCryptoLabel(symbol, network, coinName) {
  const asset = findCatalogAsset(symbol);
  const name = coinName || asset?.name || symbol;
  const net = network?.trim();
  if (!net) return `${name} (${symbol})`;
  return `${name} · ${symbol} on ${net}`;
}

export function coinCapIcon(symbol) {
  return `https://assets.coincap.io/assets/icons/${String(symbol || "generic").toLowerCase()}@2x.png`;
}
