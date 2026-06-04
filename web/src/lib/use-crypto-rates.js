import { useEffect, useState } from "react";
import { investApi } from "./api.js";

export function useCryptoRates() {
  const [rates, setRates] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    investApi("/public/crypto-rates")
      .then(setRates)
      .catch((e) => setErr(e.message || "Rates unavailable"));
  }, []);

  const cryptoToInr = (amount, symbol) => {
    if (!rates?.usdInr || !rates?.usdPrices) return null;
    const sym = String(symbol || "").toUpperCase();
    const usd = rates.usdPrices[sym];
    const amt = Number(amount);
    if (!usd || !Number.isFinite(amt) || amt <= 0) return null;
    return Math.round(amt * usd * rates.usdInr * 100) / 100;
  };

  return { rates, err, cryptoToInr, stale: rates?.stale };
}
