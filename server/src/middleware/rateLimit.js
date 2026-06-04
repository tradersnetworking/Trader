const buckets = new Map();

/** Simple in-memory rate limiter (per key). */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 40, keyFn }) {
  return (req, res, next) => {
    const key = keyFn(req) || req.ip || "anon";
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      return res.status(429).json({
        error: "Too many upload requests. Please wait a few minutes and try again.",
        code: "RATE_LIMIT",
      });
    }
    next();
  };
}

export const kycUploadRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.KYC_UPLOAD_RATE_MAX || 60),
  keyFn: (req) => `kyc-upload:${req.user?.id || req.ip}`,
});
