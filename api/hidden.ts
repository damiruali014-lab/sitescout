import { requireOwner } from './_lib/auth.js'
import { hidePlace, listHidden, unhidePlace, type HiddenRow } from './_lib/hidden.js'
import { error, json } from './_lib/http.js'
import { cleanText, readJson } from './_lib/validate.js'

/**
 * GET → { hidden: HiddenRow[] }
 * POST { key, reason?, website?, foundVia? } → hide a business from future searches
 * DELETE { key } → show it again
 */
const KEY = /^(google|2gis|osm):[\w\-/.:]{1,300}$/

export async function GET(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  try {
    return json({ hidden: await listHidden() })
  } catch (e) {
    return error((e as Error).message, 503)
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  const body = await readJson<{ key?: string; reason?: string; website?: string; foundVia?: string }>(request)
  const key = cleanText(body?.key, 320)
  if (!KEY.test(key)) return error('Invalid business key.')
  const reason = (['has_website', 'not_interested', 'chain'] as const).find((r) => r === body?.reason) ?? 'has_website'
  const foundVia = (['manual', 'instagram', 'google', 'osm'] as const).find((r) => r === body?.foundVia) ?? 'manual'
  const site = cleanText(body?.website, 500)
  const row: HiddenRow = { key, reason, found_via: foundVia, website: /^https?:\/\//i.test(site) ? site : site ? `https://${site}` : null }
  try {
    await hidePlace(row)
    return json({ ok: true })
  } catch (e) {
    return error((e as Error).message, 503)
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  const body = await readJson<{ key?: string }>(request)
  const key = cleanText(body?.key, 320)
  if (!KEY.test(key)) return error('Invalid business key.')
  try {
    await unhidePlace(key)
    return json({ ok: true })
  } catch (e) {
    return error((e as Error).message, 503)
  }
}
