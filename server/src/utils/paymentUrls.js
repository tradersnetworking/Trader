import { config } from "../config.js";

/** Public-facing payment origin — always main domain (avoids invest subdomain in gateway configs). */
export function paymentOrigin() {
  return (process.env.PAYMENT_ORIGIN || config.clientOrigin || "http://localhost:5173").replace(/\/$/, "");
}

/**
 * Build return URL on main domain; PaymentReturn page redirects to invest or main dashboard.
 * @param {{ portal?: 'invest'|'main', kind?: string, status?: string, depositId?: string, orderId?: string, tradePaymentId?: string }} ctx
 */
export function payReturnUrl(ctx = {}) {
  const {
    portal = "invest",
    kind = "deposit",
    status = "success",
    depositId,
    orderId,
    tradePaymentId,
  } = ctx;
  const params = new URLSearchParams({ portal, kind, status });
  if (depositId) params.set("depositId", depositId);
  if (orderId) params.set("orderId", orderId);
  if (tradePaymentId) params.set("tradePaymentId", tradePaymentId);
  return `${paymentOrigin()}/pay/return?${params.toString()}`;
}

/** Success / failure pair for PayU, Easebuzz, etc. */
export function payReturnPair(ctx = {}) {
  return {
    success: payReturnUrl({ ...ctx, status: "success" }),
    failure: payReturnUrl({ ...ctx, status: "failed" }),
  };
}

/** Webhook base path (register in Razorpay/Cashfree as https://yourdomain.com/api/payments/webhooks/...) */
export function webhookPath(suffix = "") {
  return `/api/payments/webhooks${suffix ? `/${suffix.replace(/^\//, "")}` : ""}`;
}

/** Resolve invest dashboard URL after payment — never uses additional domain for payment callbacks. */
export async function investDashboardUrl(query = "") {
  try {
    const { getInvestBrowseOrigin } = await import("../services/additionalDomains.js");
    const base = (await getInvestBrowseOrigin()).replace(/\/$/, "");
    return `${base}/dashboard${query ? (query.startsWith("?") ? query : `?${query}`) : ""}`;
  } catch {
    const base = (config.investPortalUrl || `${config.clientOrigin}/invest`).replace(/\/$/, "");
    return `${base}/dashboard${query ? (query.startsWith("?") ? query : `?${query}`) : ""}`;
  }
}

export function mainDashboardUrl(query = "") {
  const base = paymentOrigin();
  return `${base}/dashboard${query ? (query.startsWith("?") ? query : `?${query}`) : ""}`;
}
