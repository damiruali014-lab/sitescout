import { requireOwner } from './_lib/auth.js'
import { TtlCache } from './_lib/cache.js'
import { dgisSearch, isKazakhCity } from './_lib/dgis.js'
import { googleSearch } from './_lib/google.js'
import { clientIp, env, error, json } from './_lib/http.js'
import { rateLimited } from './_lib/ratelimit.js'
import type { SearchRequest, SearchResponse } from './_lib/types.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 20 }

// 10-minute dedupe cache (per warm instance). Not a long-term store — see google.ts.
const cache = new TtlCache<SearchResponse>(10 * 60 * 1000, 100)

export async function POST(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`search:${clientIp(request)}`, 20)) return error('Too many searches — wait a minute.', 429)

  const body = await readJson<SearchRequest>(request)
  const city = cleanText(body?.city)
  const category = cleanText(body?.category)
  const lang = cleanLang(body?.lang)
  const page = cleanText(body?.page, 600) || undefined
  if (!city || !category) return error('Enter both a city and a business category.')

  const googleKey = env('GOOGLE_PLACES_API_KEY')
  const dgisKey = env('DGIS_API_KEY')
  let provider = body?.provider ?? 'auto'
  if (provider === 'auto') provider = isKazakhCity(city) && dgisKey ? '2gis' : 'google'

  const cacheKey = [provider, city, category, lang, page ?? ''].join('|').toLowerCase()
  const hit = cache.get(cacheKey)
  if (hit) return json({ ...hit, cached: true })

  try {
    let result: SearchResponse
    if (provider === '2gis') {
      if (!dgisKey) return error('DGIS_API_KEY is not set on the server.', 503)
      result = await dgisSearch(dgisKey, city, category, lang, page ? Number(page) || 1 : 1)
    } else {
      if (!googleKey) return error('GOOGLE_PLACES_API_KEY is not set on the server.', 503)
      result = await googleSearch(googleKey, city, category, lang, page)
    }
    cache.set(cacheKey, result)
    return json(result)
  } catch (e) {
    console.error('search failed', e)
    return error((e as Error).message || 'Search failed', 502)
  }
}
