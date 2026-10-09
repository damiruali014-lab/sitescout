import { requireOwner } from './_lib/auth.js'
import { getDetails } from './_lib/details.js'
import { clientIp, error, json } from './_lib/http.js'
import { rateLimited } from './_lib/ratelimit.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 20 }

/** POST { refs: [{source, sourceId}], level: 'basic'|'full', lang } → { results: { [key]: Business } } */
export async function POST(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`details:${clientIp(request)}`, 30)) return error('Too many requests — wait a minute.', 429)
  const body = await readJson<{ refs?: { source?: unknown; sourceId?: unknown }[]; level?: string; lang?: string }>(request)
  const refs = (body?.refs ?? [])
    .slice(0, 100)
    .map((r) => ({ source: cleanText(r.source, 10), sourceId: cleanText(r.sourceId, 300) }))
    .filter((r) => (r.source === 'google' || r.source === '2gis') && r.sourceId)
  if (!refs.length) return json({ results: {} })
  const results = await getDetails(refs, body?.level === 'full' ? 'full' : 'basic', cleanLang(body?.lang))
  return json({ results })
}
