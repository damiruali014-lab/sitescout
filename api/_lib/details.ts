import { TtlCache } from './cache.js'
import { DGIS_ATTRIBUTION, dgisDetails } from './dgis.js'
import { GOOGLE_ATTRIBUTION, googleDetails } from './google.js'
import { env } from './http.js'
import type { Business, Lang } from './types.js'

/**
 * Fetch fresh business details by provider ID. This is how saved leads and demo pages get
 * their name/phone/hours — we store only IDs and re-read the details when needed.
 */
const cache = new TtlCache<Business>(10 * 60 * 1000, 300)

export function attributionFor(source: string): string {
  return source === '2gis' ? DGIS_ATTRIBUTION : GOOGLE_ATTRIBUTION
}

export async function getDetails(
  refs: { source: string; sourceId: string }[],
  level: 'basic' | 'full',
  lang: Lang,
): Promise<Record<string, Business>> {
  const out: Record<string, Business> = {}
  const missing = { google: [] as string[], dgis: [] as string[] }
  for (const r of refs) {
    const key = `${r.source}:${r.sourceId}`
    const hit = cache.get(`${level}|${lang}|${key}`) ?? (level === 'basic' ? cache.get(`full|${lang}|${key}`) : undefined)
    if (hit) out[key] = hit
    else if (r.source === 'google') missing.google.push(r.sourceId)
    else if (r.source === '2gis') missing.dgis.push(r.sourceId)
  }

  const gKey = env('GOOGLE_PLACES_API_KEY')
  if (missing.google.length && gKey) {
    // Google has no batch endpoint: fetch in parallel, at most 5 at a time.
    for (let i = 0; i < missing.google.length; i += 5) {
      const chunk = missing.google.slice(i, i + 5)
      const res = await Promise.allSettled(chunk.map((id) => googleDetails(gKey, id, level, lang)))
      res.forEach((r) => {
        if (r.status === 'fulfilled') {
          out[r.value.key] = r.value
          cache.set(`${level}|${lang}|${r.value.key}`, r.value)
        }
      })
    }
  }
  const dKey = env('DGIS_API_KEY')
  if (missing.dgis.length && dKey) {
    const items = await dgisDetails(dKey, missing.dgis, lang).catch(() => [])
    for (const b of items) {
      out[b.key] = b
      cache.set(`full|${lang}|${b.key}`, b)
    }
  }
  return out
}
