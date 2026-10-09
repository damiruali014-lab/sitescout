import type { Business, Lang, SearchResponse } from './types.js'

/**
 * Google Places API (New) — Text Search.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
 * Billing: the field mask decides the SKU. rating/userRatingCount/websiteUri/phone/hours
 * put us in "Text Search Enterprise" (1,000 free requests/month, then ~$35 / 1,000).
 * One request = up to 20 places. We never ask for reviews/photos (more expensive SKU).
 */
const SEARCH_FIELDS = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.primaryTypeDisplayName',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.rating',
  'places.userRatingCount',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.regularOpeningHours.weekdayDescriptions',
  'nextPageToken',
].join(',')

/** Lighter mask for list views (Place Details Pro SKU, 5,000 free/month). */
const DETAILS_BASIC = 'id,displayName,formattedAddress,primaryTypeDisplayName,googleMapsUri'
/** Full mask (Place Details Enterprise SKU, 1,000 free/month) — used when a lead is opened. */
const DETAILS_FULL =
  DETAILS_BASIC +
  ',rating,userRatingCount,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours.weekdayDescriptions'

export const GOOGLE_ATTRIBUTION = 'Business data © Google'

interface GPlace {
  id: string
  displayName?: { text: string }
  formattedAddress?: string
  primaryTypeDisplayName?: { text: string }
  googleMapsUri?: string
  businessStatus?: string
  rating?: number
  userRatingCount?: number
  websiteUri?: string
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
}

function toBusiness(p: GPlace, city?: string): Business {
  return {
    key: `google:${p.id}`,
    source: 'google',
    sourceId: p.id,
    name: p.displayName?.text ?? 'Unnamed place',
    category: p.primaryTypeDisplayName?.text,
    address: p.formattedAddress,
    phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
    website: p.websiteUri,
    rating: p.rating,
    reviews: p.userRatingCount,
    hours: p.regularOpeningHours?.weekdayDescriptions,
    mapsUrl: p.googleMapsUri,
    city,
  }
}

async function googleError(res: Response): Promise<Error> {
  let msg = `Google Places error ${res.status}`
  try {
    const body = (await res.json()) as { error?: { message?: string } }
    if (body.error?.message) msg += `: ${body.error.message}`
  } catch {
    /* ignore */
  }
  return new Error(msg)
}

async function searchPage(apiKey: string, body: Record<string, unknown>) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': SEARCH_FIELDS,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) throw await googleError(res)
  return (await res.json()) as { places?: GPlace[]; nextPageToken?: string }
}

/**
 * Collects up to `limit` places. Each page (max 20 places) is one billed request;
 * Google returns at most 60 places per query (3 pages).
 */
export async function googleSearch(
  apiKey: string,
  opts: { city: string; category: string; lang: Lang; countryName?: string; regionCode?: string; limit: number; pageToken?: string },
): Promise<SearchResponse> {
  const { city, category, lang, limit } = opts
  const query = `${category} in ${city}${opts.countryName ? ', ' + opts.countryName : ''}`
  const results: Business[] = []
  let token = opts.pageToken
  let requests = 0
  do {
    const data = await searchPage(apiKey, {
      textQuery: query,
      pageSize: Math.min(20, Math.max(1, limit - results.length)),
      languageCode: lang,
      ...(opts.regionCode ? { regionCode: opts.regionCode.toLowerCase() } : {}),
      ...(token ? { pageToken: token } : {}),
    }).catch((e) => {
      if (requests === 0) throw e
      return { places: [], nextPageToken: undefined } // keep what we already have
    })
    requests++
    for (const p of data.places ?? []) if (p.businessStatus !== 'CLOSED_PERMANENTLY') results.push(toBusiness(p, city))
    token = data.nextPageToken
  } while (token && results.length < limit && requests < 3)
  return { source: 'google', query, results: results.slice(0, limit), next: token, attribution: GOOGLE_ATTRIBUTION, requests }
}

export async function googleDetails(
  apiKey: string,
  placeId: string,
  level: 'basic' | 'full',
  lang: Lang,
): Promise<Business> {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${lang}`,
    {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': level === 'full' ? DETAILS_FULL : DETAILS_BASIC },
      signal: AbortSignal.timeout(8_000),
    },
  )
  if (!res.ok) throw await googleError(res)
  return toBusiness((await res.json()) as GPlace)
}
