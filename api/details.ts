import { requireOwner } from './_lib/auth.js'
import { getDetails } from './_lib/details.js'
import { clientIp, error, json } from './_lib/http.js'
import { withPhoneTypes } from './_lib/phone.js'
import { flushUsage } from './_lib/usage.js'
import { rateLimited } from './_lib/ratelimit.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 20 }

/** POST { refs: [{source, sourceId}], level: 'basic'|'full', lang } → { results: { [key]: Business } } */
async function handle(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`details:${clientIp(request)}`, 30)) return error('Too many requests — wait a minute.', 429)
  const body = await readJson<{ refs?: { source?: unknown; sourceId?: unknown }[]; level?: string; lang?: string }>(request)
  const refs = (body?.refs ?? [])
    .slice(0, 100)
    .map((r) => ({ source: cleanText(r.source, 10), sourceId: cleanText(r.sourceId, 300) }))
    .filter((r) => (r.source === 'google' || r.source === '2gis' || r.source === 'osm') && r.sourceId)
  if (!refs.length) return json({ results: {} })
  const raw = await getDetails(refs, body?.level === 'full' ? 'full' : 'basic', cleanLang(body?.lang))
  // Phones from Google/2GIS details are international (+33…), so no country hint is needed.
  const results = Object.fromEntries(Object.entries(raw).map(([k, b]) => [k, withPhoneTypes([b])[0]]))
  return json({ results })
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } finally {
    await flushUsage() // record paid API calls for the Usage page
  }
}
