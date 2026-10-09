/**
 * Best-effort sliding-window rate limit per key (per warm instance).
 * It's a safety net against runaway loops / double clicks, not a security boundary —
 * the login check in auth.ts is what keeps strangers out.
 */
const hits = new Map<string, number[]>()

export function rateLimited(key: string, limit: number, windowMs = 60_000): boolean {
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (list.length >= limit) {
    hits.set(key, list)
    return true
  }
  list.push(now)
  hits.set(key, list)
  return false
}
