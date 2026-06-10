/**
 * In-memory rate limiter — suitable for single-server deployments.
 * For multi-instance production, replace with @upstash/ratelimit + Redis.
 */

interface RateRecord {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateRecord>();

/**
 * Returns true if the request is allowed, false if it should be blocked.
 * @param key      Unique key (e.g. `login:${ip}:${email}`)
 * @param max      Max attempts allowed in the window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(key: string, max = 5, windowMs = 15 * 60_000): boolean {
  const now = Date.now();
  const rec = store.get(key);

  if (!rec || now > rec.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (rec.count >= max) return false;

  rec.count++;
  return true;
}

/** Reset counter after successful login */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Remaining attempts before lockout */
export function remainingAttempts(key: string, max = 5): number {
  const rec = store.get(key);
  if (!rec || Date.now() > rec.resetAt) return max;
  return Math.max(0, max - rec.count);
}
