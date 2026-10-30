interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    const valid = record.timestamps.filter((ts) => now - ts < 60000);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      record.timestamps = valid;
    }
  }
}, 5 * 60 * 1000).unref();

export function checkRateLimit(
  identifier: string,
  limit = 30,
  windowMs = 60000
): { success: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);

  if (!record) {
    record = { timestamps: [] };
    rateLimitMap.set(identifier, record);
  }

  // Filter timestamps within current window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetMs = windowMs - (now - oldest);
    return { success: false, remaining: 0, resetMs: Math.max(0, resetMs) };
  }

  record.timestamps.push(now);
  return {
    success: true,
    remaining: limit - record.timestamps.length,
    resetMs: windowMs,
  };
}
