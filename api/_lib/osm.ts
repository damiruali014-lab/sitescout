import { TtlCache } from './cache.js'
import { mergeBranches } from './dedupe.js'
import type { Business, SearchResponse } from './types.js'

/**
 * OpenStreetMap — a free, community-edited map with no monthly quota.
 *   Nominatim (city → OSM area): https://nominatim.org/release-docs/latest/api/Search/  (max 1 req/s, identify yourself)
 *   Overpass (businesses in the area): https://wiki.openstreetmap.org/wiki/Overpass_API (fair use)
 * No ratings, and "no website" only means none is listed — so leads get a "Check on Google" button
 * that spends ONE Google request on a business you actually care about.
 * Data © OpenStreetMap contributors, ODbL — attribution is shown next to results.
 */
export const OSM_ATTRIBUTION = 'Business data © OpenStreetMap contributors (ODbL)'
const UA = 'SiteScout/1.0 (+https://sitescout-damir.vercel.app)'
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
const areaCache = new TtlCache<string>(24 * 3600 * 1000, 200)
const resultCache = new TtlCache<Business[]>(30 * 60 * 1000, 100)

type Tags = Record<string, string>
interface OsmElement {
  type: 'node' | 'way' | 'relation'
  id: number
  tags?: Tags
  center?: { lat: number; lon: number }
  lat?: number
  lon?: number
}

/** City → Overpass area filter, e.g. `area(id:3600120965)` (relation) or `around:6000,lat,lon` (point-only cities). */
async function cityArea(city: string, country?: string): Promise<string> {
  const k = `${city}|${country ?? ''}`.toLowerCase()
  const hit = areaCache.get(k)
  if (hit) return hit
  const u = new URL('https://nominatim.openstreetmap.org/search')
  u.searchParams.set('city', city)
  if (country) u.searchParams.set('countrycodes', country.toLowerCase())
  u.searchParams.set('featureType', 'settlement')
  u.searchParams.set('format', 'jsonv2')
  u.searchParams.set('limit', '1')
  const res = await fetch(u, { headers: { 'user-agent': UA, 'accept-language': 'en' }, signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`OpenStreetMap city lookup failed (${res.status})`)
  const [place] = (await res.json()) as { osm_type: string; osm_id: number; lat: string; lon: string }[]
  if (!place) throw new Error(`OpenStreetMap doesn't know the city “${city}”. Check the spelling.`)
  const filter =
    place.osm_type === 'relation' ? `area.a` : `around:6000,${Number(place.lat).toFixed(5)},${Number(place.lon).toFixed(5)}`
  const prefix = place.osm_type === 'relation' ? `area(id:${3600000000 + place.osm_id})->.a;` : ''
  const v = `${prefix}|${filter}`
  areaCache.set(k, v)
  return v
}

async function overpass(query: string): Promise<OsmElement[]> {
  let last: unknown
  // The public servers sometimes answer 504 when busy — retry, then use a mirror.
  const tries = [OVERPASS[0], OVERPASS[0], ...OVERPASS.slice(1), OVERPASS[0]]
  for (const [i, url] of tries.entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 1200 * i)) // back off: 1.2s, 2.4s, 3.6s
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(12_000),
      })
      if (res.ok) return ((await res.json()) as { elements?: OsmElement[] }).elements ?? []
      last = new Error(`Overpass ${res.status}`)
    } catch (e) {
      last = e
    }
  }
  throw new Error(`OpenStreetMap is busy right now — try again in a minute. (${(last as Error)?.message ?? 'unknown'})`)
}

const pick = (t: Tags, ...keys: string[]) => keys.map((k) => t[k]).find(Boolean)?.split(';')[0].trim()

function instagramOf(t: Tags): string | undefined {
  const v = pick(t, 'contact:instagram', 'instagram')
  const fromWeb = [t.website, t['contact:website'], t.url].find((w) => w && /instagram\.com\//i.test(w))
  const raw = v ?? fromWeb
  if (!raw) return undefined
  const handle = raw.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').split(/[/?#]/)[0]
  return handle ? `@${handle}` : undefined
}

export function osmToBusiness(e: OsmElement, label?: string, city?: string): Business | null {
  const t = e.tags ?? {}
  if (!t.name) return null
  const site = [t.website, t['contact:website'], t.url].find((w) => w && !/instagram\.com|facebook\.com/i.test(w))
  const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')
  const address = [street, [t['addr:postcode'], t['addr:city'] ?? city].filter(Boolean).join(' ')].filter(Boolean).join(', ')
  return {
    key: `osm:${e.type}/${e.id}`,
    source: 'osm',
    sourceId: `${e.type}/${e.id}`,
    name: t.name,
    category: label,
    address: address || undefined,
    phone: pick(t, 'phone', 'contact:phone', 'contact:mobile', 'mobile'),
    whatsapp: pick(t, 'contact:whatsapp'),
    website: site,
    instagram: instagramOf(t),
    email: pick(t, 'email', 'contact:email'),
    hours: t.opening_hours ? [t.opening_hours] : undefined,
    mapsUrl: `https://www.openstreetmap.org/${e.type}/${e.id}`,
    city,
    // Shops of a big brand (brand:wikidata) are chain branches — score them down like 2GIS chains.
    chainId: t['brand:wikidata'] ? `brand:${t['brand:wikidata']}` : undefined,
    branchCount: t['brand:wikidata'] ? 3 : undefined,
  }
}

/**
 * Search businesses of one category in a city. Businesses WITHOUT a listed website come first,
 * because that's who we're looking for. `startIndex` pages through the (cached) list.
 */
export async function osmSearch(opts: {
  city: string
  country?: string
  filters: string[]
  label: string
  limit: number
  startIndex?: number
  /** Keys to leave out (hidden businesses) — applied before paging so pages stay full */
  skip?: Set<string>
}): Promise<SearchResponse> {
  const { city, filters, label, limit } = opts
  const start = Math.max(0, opts.startIndex ?? 0)
  const cacheKey = `${city}|${opts.country}|${filters.join()}`.toLowerCase()
  let all = resultCache.get(cacheKey)
  let requests = 0
  if (!all) {
    const [prefix, area] = (await cityArea(city, opts.country)).split('|')
    const body = filters.map((f) => `nwr(${area})${f}["name"];`).join('')
    const els = await overpass(`[out:json][timeout:25];${prefix}(${body});out center tags 500;`)
    requests = 1
    const list = els
      .filter((e) => !e.tags?.['disused:shop'] && !e.tags?.['was:shop'])
      .map((e) => osmToBusiness(e, label, city))
      .filter((b): b is Business => Boolean(b))
    all = mergeBranches(list).sort((a, b) => Number(Boolean(a.website)) - Number(Boolean(b.website)))
    resultCache.set(cacheKey, all)
  }
  const visible = opts.skip?.size ? all.filter((b) => !opts.skip!.has(b.key)) : all
  const page = visible.slice(start, start + limit)
  const next = start + limit < visible.length ? String(start + limit) : undefined
  const withoutSite = visible.filter((b) => !b.website).length
  return {
    source: 'osm',
    query: `${label} in ${city}`,
    results: page,
    next,
    hidden: all.length - visible.length,
    attribution: OSM_ATTRIBUTION,
    requests,
    notice: `OpenStreetMap lists ${visible.length} ${label.toLowerCase()} here, ${withoutSite} without a website. “No website” means none is listed on the map — open a lead and press “Check on Google” before contacting.`,
  }
}

/** Fresh tags for saved OSM leads (free). */
export async function osmDetails(ids: string[]): Promise<Business[]> {
  const parts = ids
    .map((id) => /^(node|way|relation)\/(\d+)$/.exec(id))
    .filter((m): m is RegExpExecArray => Boolean(m))
    .map((m) => `${m[1]}(${m[2]});`)
  if (!parts.length) return []
  const els = await overpass(`[out:json][timeout:20];(${parts.join('')});out center tags;`)
  return els.map((e) => osmToBusiness(e)).filter((b): b is Business => Boolean(b))
}
