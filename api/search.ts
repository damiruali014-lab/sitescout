import { requireOwner } from './_lib/auth.js'
import { TtlCache } from './_lib/cache.js'
import { resolveCategory } from './_lib/categories.js'
import { findCountry, MAX_RESULTS } from './_lib/countries.js'
import { dgisSearch, isKazakhCity } from './_lib/dgis.js'
import { googleSearch } from './_lib/google.js'
import { osmSearch } from './_lib/osm.js'
import { hiddenKeys } from './_lib/hidden.js'
import { clientIp, env, error, json } from './_lib/http.js'
import { flushUsage } from './_lib/usage.js'
import { withPhoneTypes } from './_lib/phone.js'
import { rateLimited } from './_lib/ratelimit.js'
import type { SearchRequest, SearchResponse } from './_lib/types.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 60 }

// 10-minute dedupe cache (per warm instance). Not a long-term store — see google.ts.
const cache = new TtlCache<SearchResponse>(10 * 60 * 1000, 100)

async function handle(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`search:${clientIp(request)}`, 20)) return error('Too many searches — wait a minute.', 429)

  const body = await readJson<SearchRequest>(request)
  const city = cleanText(body?.city)
  const category = cleanText(body?.category)
  const lang = cleanLang(body?.lang)
  const page = cleanText(body?.page, 600) || undefined
  const country = findCountry(cleanText(body?.country, 2))
  const limit = Math.min(MAX_RESULTS, Math.max(1, Math.round(Number(body?.limit) || 20)))
  if (!city || !category) return error('Enter both a city and a business category.')

  const googleKey = env('GOOGLE_PLACES_API_KEY')
  const dgisKey = env('DGIS_API_KEY')
  let provider = (['auto', 'google', '2gis', 'osm'] as const).find((p) => p === body?.provider) ?? 'auto'
  if (provider === 'auto') {
    const preferred = country?.provider ?? (isKazakhCity(city) ? '2gis' : 'google')
    provider = preferred === '2gis' && !dgisKey ? 'google' : preferred
  }

  const cacheKey = [provider, country?.code ?? '', city, category, lang, limit, page ?? ''].join('|').toLowerCase()
  const hit = cache.get(cacheKey)
  if (hit) return json({ ...hit, cached: true })

  try {
    // Businesses I marked "already has a website" never come back (step 19).
    const hidden = await hiddenKeys()
    let result: SearchResponse
    if (provider === 'osm') {
      const cat = resolveCategory(category, 'osm')
      if (!cat.osm?.length) return error('OpenStreetMap needs a category from the list — or switch the source to Google.')
      result = await osmSearch({ city, country: country?.code, filters: cat.osm, label: cat.label ?? category, limit, startIndex: page ? Number(page) || 0 : 0, skip: hidden })
    } else if (provider === '2gis') {
      if (!dgisKey) return error('DGIS_API_KEY is not set on the server.', 503)
      const cat = resolveCategory(category, '2gis')
      result = await dgisSearch(dgisKey, { city, category: cat.q, rubricId: cat.rubricId, lang, limit, startPage: page ? Number(page) || 1 : 1 })
    } else {
      if (!googleKey) return error('GOOGLE_PLACES_API_KEY is not set on the server.', 503)
      const cat = resolveCategory(category, 'google')
      result = await googleSearch(googleKey, {
        city,
        category: cat.q,
        includedType: cat.includedType,
        lang,
        limit,
        pageToken: page,
        countryName: country?.name,
        regionCode: country?.code,
      })
    }
    const shown = result.results.filter((b) => !hidden.has(b.key))
    result = {
      ...result,
      results: withPhoneTypes(shown, country?.code ?? (provider === '2gis' ? 'KZ' : undefined)),
      hidden: (result.hidden ?? 0) + result.results.length - shown.length,
    }
    cache.set(cacheKey, result)
    return json(result)
  } catch (e) {
    console.error('search failed', e)
    return error((e as Error).message || 'Search failed', 502)
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } finally {
    await flushUsage() // record paid API calls for the Usage page
  }
}
