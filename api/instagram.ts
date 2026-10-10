import { requireOwner } from './_lib/auth.js'
import { clientIp, error, json } from './_lib/http.js'
import { instagramConfigured, lookupInstagram } from './_lib/instagram.js'
import { rateLimited } from './_lib/ratelimit.js'
import { cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 15 }

/** GET → { configured }   POST { handle } → BioResult (website found in their Instagram bio, if any) */
export async function GET(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  return json({ configured: instagramConfigured() })
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`ig:${clientIp(request)}`, 30)) return error('Too many checks — wait a minute.', 429)
  const body = await readJson<{ handle?: string }>(request)
  const handle = cleanText(body?.handle, 100)
  if (!handle) return error('Enter their Instagram username.')
  try {
    return json(await lookupInstagram(handle))
  } catch (e) {
    return error((e as Error).message, 502)
  }
}
