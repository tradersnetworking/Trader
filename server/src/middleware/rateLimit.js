import { createRateLimitMiddleware } from "./redisRateLimit.js";

/** Simple in-memory or Redis rate limiter (per key). */
export function rateLimit(opts) {
  return createRateLimitMiddleware({
    ...opts,
    name: opts.name || "upload",
  });
}

export const kycUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.KYC_UPLOAD_RATE_MAX || 60),
  keyFn: (req) => req.user?.id || req.ip,
  name: "kyc-upload",
  message: "Too many upload requests. Please wait a few minutes and try again.",
});
