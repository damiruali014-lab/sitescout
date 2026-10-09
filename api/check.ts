import { requireOwner } from './_lib/auth.js'
import { clientIp, error, json } from './_lib/http.js'
import { rateLimited } from './_lib/ratelimit.js'
import { checkSite } from './_lib/sitecheck.js'
import type { SiteCheck } from './_lib/types.js'
import { cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 30 }

const MAX_ITEMS = 10
const CONCURRENCY = 5

/** POST { items: [{ key, website? }] } → { results: { [key]: SiteCheck } } */
export async function POST(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`check:${clientIp(request)}`, 15)) return error('Too many checks — wait a minute.', 429)

  const body = await readJson<{ items?: { key?: unknown; website?: unknown }[] }>(request)
  const items = (body?.items ?? [])
    .slice(0, MAX_ITEMS)
    .map((i) => ({ key: cleanText(i.key, 200), website: cleanText(i.website, 500) || undefined }))
    .filter((i) => i.key)
  if (!items.length) return error('No items to check.')

  const results: Record<string, SiteCheck> = {}
  let next = 0
  async function worker() {
    while (next < items.length) {
      const item = items[next++]
      results[item.key] = await checkSite(item.website)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker))
  return json({ results })
}
