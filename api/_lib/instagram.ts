import { env } from './http.js'
import type { BioResult, BioSiteKind } from './types.js'

/**
 * Instagram bio check — official Instagram Graph API "Business Discovery":
 * https://developers.facebook.com/docs/instagram-platform/instagram-api-with-facebook-login/business-discovery
 * Reads PUBLIC fields (biography, website) of another Business/Creator account, queried through MY
 * own Instagram professional account. Needs (server env only):
 * Own website or a booking platform (Planity, Fresha…) → not a lead; link-in-bio only → still a lead.
 *   IG_USER_ID       my Instagram professional account id (1784…)
 *   IG_ACCESS_TOKEN  long-lived token with instagram_basic, instagram_manage_insights, pages_read_engagement
 * Personal (non-business) and age-gated accounts can't be read — the UI says so.
 */
const LINK_IN_BIO = /(^|\.)(linktr\.ee|taplink\.(cc|at|ws)|beacons\.ai|lnk\.bio|linkin\.bio|msha\.ke|bio\.site|solo\.to|campsite\.bio|hoo\.be|many\.link|tap\.bio|later\.com|linkpop\.com|direct\.me|instabio\.cc|wa\.me|whatsapp\.com|t\.me|instagram\.com|facebook\.com|tiktok\.com)$/i
const BOOKING = /(^|\.)(planity\.com|treatwell\.[a-z.]+|fresha\.com|booksy\.com|dikidi\.(net|ru)|yclients\.com|setmore\.com|calendly\.com|square\.site|vagaro\.com|timify\.com|salonized\.com|doctolib\.[a-z]+|thefork\.[a-z]+|ubereats\.com|deliveroo\.[a-z.]+|wolt\.com|glovoapp\.com)$/i

export type { BioResult, BioSiteKind }

export function cleanHandle(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#\s]/)[0]
    .toLowerCase()
}

const host = (u: string) => {
  try {
    return new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function classifyLink(u: string): BioSiteKind {
  const h = host(u)
  if (!h) return 'none'
  if (LINK_IN_BIO.test(h)) return 'link_in_bio'
  if (BOOKING.test(h)) return 'booking'
  return 'own_site'
}

/** Website field + any URL-looking text in the bio → the best "own website" candidate. */
export function analyseBio(website: string | undefined, biography: string | undefined): Pick<BioResult, 'website' | 'kind' | 'links'> {
  const text = (biography ?? '').replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, ' ') // drop emails first
  const found = text.match(/\b(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}(?:\/[^\s]*)?/gi) ?? []
  const links = [...new Set([website, ...found].filter((x): x is string => Boolean(x)))]
  const own = links.find((l) => classifyLink(l) === 'own_site')
  if (own) return { website: own, kind: 'own_site', links }
  const booking = links.find((l) => classifyLink(l) === 'booking')
  if (booking) return { website: booking, kind: 'booking', links }
  if (links.length) return { website: links[0], kind: 'link_in_bio', links }
  return { kind: 'none', links }
}

export function instagramConfigured(): boolean {
  return Boolean(env('IG_USER_ID') && env('IG_ACCESS_TOKEN'))
}

export async function lookupInstagram(handleInput: string): Promise<BioResult> {
  const userId = env('IG_USER_ID')
  const token = env('IG_ACCESS_TOKEN')
  if (!userId || !token) throw new Error('Instagram check is not set up — add IG_USER_ID and IG_ACCESS_TOKEN (see README).')
  const handle = cleanHandle(handleInput)
  if (!/^[a-z0-9._]{1,30}$/.test(handle)) throw new Error('That doesn’t look like an Instagram username.')
  const version = env('IG_GRAPH_VERSION') || 'v25.0'
  const fields = `business_discovery.username(${handle}){username,website,biography,followers_count}`
  const u = `https://graph.facebook.com/${version}/${encodeURIComponent(userId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`
  const res = await fetch(u, { signal: AbortSignal.timeout(8000) })
  const body = (await res.json().catch(() => ({}))) as {
    business_discovery?: { username?: string; website?: string; biography?: string; followers_count?: number }
    error?: { message?: string; code?: number }
  }
  if (!res.ok || !body.business_discovery) {
    const code = body.error?.code
    if (code === 190) throw new Error('Your Instagram token expired — create a new long-lived token and update IG_ACCESS_TOKEN.')
    if (code === 4 || code === 17 || code === 32) throw new Error('Instagram rate limit reached — try again in an hour.')
    throw new Error(`Couldn’t read @${handle}. It may be a personal (not business) account, private, or the username is wrong.`)
  }
  const d = body.business_discovery
  return { handle, followers: d.followers_count, biography: d.biography, ...analyseBio(d.website, d.biography) }
}
