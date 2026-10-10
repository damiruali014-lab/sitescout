import { requireOwner } from './_lib/auth.js'
import { googleMatch } from './_lib/google.js'
import { clientIp, env, error, json } from './_lib/http.js'
import { withPhoneTypes } from './_lib/phone.js'
import { rateLimited } from './_lib/ratelimit.js'
import { flushUsage } from './_lib/usage.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 20 }

/**
 * POST { name, address?, city?, country?, lang } → { match: Business | null }
 * One paid Google request, only when you press "Check on Google" on a lead.
 * The Google data is shown, never stored (Google's terms allow storing only place IDs).
 */
async function handle(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`verify:${clientIp(request)}`, 30)) return error('Too many checks — wait a minute.', 429)
  const key = env('GOOGLE_PLACES_API_KEY')
  if (!key) return error('GOOGLE_PLACES_API_KEY is not set on the server.', 503)
  const body = await readJson<{ name?: string; address?: string; city?: string; country?: string; lang?: string }>(request)
  const name = cleanText(body?.name, 200)
  if (!name) return error('Missing business name.')
  const country = cleanText(body?.country, 2) || undefined
  try {
    const match = await googleMatch(key, { name, address: cleanText(body?.address, 300) || undefined, city: cleanText(body?.city, 100) || undefined }, cleanLang(body?.lang), country)
    return json({ match: match ? withPhoneTypes([match], country)[0] : null })
  } catch (e) {
    return error((e as Error).message || 'Google check failed', 502)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } finally {
    await flushUsage()
  }
}
