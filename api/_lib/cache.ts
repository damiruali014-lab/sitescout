/**
 * Tiny in-memory TTL cache. On Vercel it lives as long as the warm function instance,
 * which is exactly what we want: it dedupes repeat calls for a few minutes without
 * persisting provider content (Google only allows long-term storage of place IDs).
 */
export class TtlCache<T> {
  private map = new Map<string, { value: T; expires: number }>()
  constructor(
    private ttlMs: number,
    private max = 200,
  ) {}

  get(key: string): T | undefined {
    const hit = this.map.get(key)
    if (!hit) return undefined
    if (hit.expires < Date.now()) {
      this.map.delete(key)
      return undefined
    }
    return hit.value
  }

  set(key: string, value: T): void {
    if (this.map.size >= this.max) {
      const oldest = this.map.keys().next().value
      if (oldest !== undefined) this.map.delete(oldest)
    }
    this.map.set(key, { value, expires: Date.now() + this.ttlMs })
  }
}
