/** Supported crypto deposit/withdraw assets (aligned with Kuber catalog subset). */

export const CRYPTO_ASSETS = [
  { symbol: "USDT", name: "Tether USD", networks: ["TRC20", "BEP20"] },
  { symbol: "TRX", name: "TRON", networks: ["TRON"] },
  { symbol: "BNB", name: "BNB", networks: ["BEP20"] },
];

export const USDT_NETWORKS = new Set(["TRC20", "BEP20", "ERC20"]);

export function normalizeNetwork(symbol, network) {
  const sym = String(symbol || "").toUpperCase();
  const net = String(network || "").trim();
  if (sym === "TRX" && (!net || net.toUpperCase() === "TRON")) return "TRON";
  if (sym === "BNB" && (!net || net.toUpperCase() === "BEP20")) return "BEP20";
  return net.toUpperCase();
}

export function isValidCryptoPair(symbol, network) {
  const sym = String(symbol || "").toUpperCase();
  const net = normalizeNetwork(sym, network);
  const asset = CRYPTO_ASSETS.find((a) => a.symbol === sym);
  if (!asset) return false;
  return asset.networks.some((n) => n.toUpperCase() === net);
}

export function formatCryptoMethod(symbol, network) {
  const sym = String(symbol || "").toUpperCase();
  const net = normalizeNetwork(sym, network);
  return `CRYPTO_${sym}_${net}`;
}

export function parseCryptoFromGateway(row) {
  const ec = typeof row?.extraConfig === "object" ? row.extraConfig : {};
  return {
    walletAddress: ec.walletAddress || ec.wallet_address || null,
    symbol: (ec.symbol || ec.cryptoSymbol || "").toUpperCase() || null,
    network: normalizeNetwork(ec.symbol || ec.cryptoSymbol, ec.network || ec.cryptoNetwork),
    coinName: ec.coinName || ec.coin_name || null,
  };
}

export function cryptoGatewayLabel(g) {
  const c = parseCryptoFromGateway(g);
  const name = c.coinName || c.symbol || g.name;
  if (c.network) return `${name} · ${c.symbol} (${c.network})`;
  return name;
}
