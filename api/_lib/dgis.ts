import { TtlCache } from './cache.js'
import type { Business, Lang, SearchResponse } from './types.js'

/**
 * 2GIS Catalog API (Places search) — used for Kazakhstan cities.
 * Docs: https://docs.2gis.com/en/api/search/places/overview
 * Billing is per successful request. `contact_groups` (phones, websites) needs an extra
 * permission on the key; if it's missing we retry without it and tell the user.
 * Demo keys are limited, so we use small pages (10) and only load more on request.
 */
const BASE = 'https://catalog.api.2gis.com'
// Demo keys allow page_size ≤ 10 and page ≤ 5 (so 50 results max). Paid keys allow more — override via env.
const PAGE_SIZE = Number(process.env.DGIS_PAGE_SIZE) || 10
const MAX_PAGE = Number(process.env.DGIS_MAX_PAGE) || 5
const FIELDS_FULL = 'items.name_ex,items.address,items.contact_groups,items.schedule,items.reviews,items.rubrics,items.point'
const FIELDS_NO_CONTACTS = 'items.name_ex,items.address,items.schedule,items.reviews,items.rubrics,items.point'

export const DGIS_ATTRIBUTION = 'Business data © 2GIS'

/** Region IDs barely ever change — cache them for the life of the instance. */
const regionCache = new TtlCache<string>(24 * 60 * 60 * 1000, 100)

const KZ_CITIES = [
  'almaty', 'алматы', 'astana', 'астана', 'shymkent', 'шымкент', 'karaganda', 'караганда', 'қарағанды',
  'aktobe', 'актобе', 'ақтөбе', 'taraz', 'тараз', 'pavlodar', 'павлодар', 'oskemen', 'ust-kamenogorsk',
  'усть-каменогорск', 'өскемен', 'semey', 'семей', 'atyrau', 'атырау', 'kostanay', 'костанай', 'қостанай',
  'kyzylorda', 'кызылорда', 'қызылорда', 'oral', 'uralsk', 'уральск', 'орал', 'petropavl', 'petropavlovsk',
  'петропавловск', 'aktau', 'актау', 'ақтау', 'turkistan', 'туркестан', 'түркістан', 'kokshetau', 'кокшетау',
  'көкшетау', 'taldykorgan', 'талдыкорган', 'талдықорған', 'ekibastuz', 'экибастуз', 'zhezkazgan', 'жезказган',
]

const CONTACTS_NOTICE =
  'Your 2GIS key returns no phones or websites (demo keys hide "contact_groups"), so websites show as “unknown”. Open a business in 2GIS to check by hand, or ask 2GIS (api@2gis.ru) to enable contacts on your key.'

/** 2GIS has no en_KZ locale (it returns 400), and data is in Russian anyway. */
function dgisLocale(lang: Lang): string {
  return lang === 'kk' ? 'kk_KZ' : 'ru_KZ'
}

/** True when we asked for contacts but not a single item came back with them. */
function contactsHidden(items: DgisItem[]): boolean {
  return items.length > 0 && items.every((i) => !i.contact_groups?.length)
}

export function isKazakhCity(city: string): boolean {
  const c = city.trim().toLowerCase()
  return KZ_CITIES.some((k) => c === k || c.startsWith(k + ',') || c.startsWith(k + ' '))
}

interface DgisMeta {
  code: number
  error?: { message?: string; type?: string }
}
interface DgisContact {
  type: string
  value?: string
  text?: string
  url?: string
}
interface DgisItem {
  id: string
  name?: string
  name_ex?: { primary?: string; extension?: string }
  address_name?: string
  full_name?: string
  address?: { components?: unknown }
  rubrics?: { name: string; kind?: string }[]
  reviews?: { general_rating?: number; general_review_count?: number; org_rating?: number; org_review_count?: number }
  contact_groups?: { contacts?: DgisContact[] }[]
  schedule?: Record<string, { working_hours?: { from: string; to: string }[] } | boolean | string | undefined>
}

const DAYS: [string, Record<Lang, string>][] = [
  ['Mon', { en: 'Mon', ru: 'Пн', kk: 'Дс' }],
  ['Tue', { en: 'Tue', ru: 'Вт', kk: 'Сс' }],
  ['Wed', { en: 'Wed', ru: 'Ср', kk: 'Ср' }],
  ['Thu', { en: 'Thu', ru: 'Чт', kk: 'Бс' }],
  ['Fri', { en: 'Fri', ru: 'Пт', kk: 'Жм' }],
  ['Sat', { en: 'Sat', ru: 'Сб', kk: 'Сн' }],
  ['Sun', { en: 'Sun', ru: 'Вс', kk: 'Жс' }],
]

function formatSchedule(s: DgisItem['schedule'], lang: Lang): string[] | undefined {
  if (!s) return undefined
  if (s.is_24x7 === true) return [lang === 'en' ? 'Open 24/7' : lang === 'ru' ? 'Круглосуточно' : 'Тәулік бойы']
  const closed = lang === 'en' ? 'Closed' : lang === 'ru' ? 'Выходной' : 'Демалыс'
  return DAYS.map(([k, label]) => {
    const day = s[k]
    const hours = typeof day === 'object' && day?.working_hours
    return `${label[lang]}: ${hours && hours.length ? hours.map((h) => `${h.from}–${h.to}`).join(', ') : closed}`
  })
}

function contact(item: DgisItem, type: string): string | undefined {
  for (const g of item.contact_groups ?? []) {
    for (const c of g.contacts ?? []) {
      if (c.type !== type) continue
      // Websites come back as a 2GIS redirect link in `url`; the readable domain is in `text`.
      if (type === 'website') {
        const v = c.value && !c.value.includes('link.2gis') ? c.value : c.text
        if (v) return /^https?:\/\//i.test(v) ? v : `http://${v}`
      }
      return c.value ?? c.text ?? c.url
    }
  }
  return undefined
}

function toBusiness(item: DgisItem, lang: Lang, city?: string): Business {
  const numericId = item.id.split('_')[0]
  const primary = item.rubrics?.find((r) => r.kind === 'primary') ?? item.rubrics?.[0]
  return {
    key: `2gis:${numericId}`,
    source: '2gis',
    sourceId: numericId,
    name: item.name_ex?.primary ?? item.name ?? 'Unnamed',
    category: primary?.name ?? item.name_ex?.extension,
    address: [city, item.address_name].filter(Boolean).join(', ') || item.full_name,
    phone: contact(item, 'phone'),
    website: contact(item, 'website'),
    instagram: contact(item, 'instagram'),
    whatsapp: contact(item, 'whatsapp'),
    email: contact(item, 'email'),
    rating: item.reviews?.general_rating ?? item.reviews?.org_rating,
    reviews: item.reviews?.general_review_count ?? item.reviews?.org_review_count,
    hours: formatSchedule(item.schedule, lang),
    mapsUrl: `https://2gis.kz/firm/${numericId}`,
    city,
  }
}

async function call<T>(path: string, params: Record<string, string>): Promise<{ meta: DgisMeta; result?: T }> {
  const url = new URL(path, BASE)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) })
  const data = (await res.json().catch(() => null)) as { meta: DgisMeta; result?: T } | null
  if (!data?.meta) throw new Error(`2GIS error ${res.status}`)
  return data
}

function isPermissionError(meta: DgisMeta): boolean {
  return meta.code === 403 || /contact|permission|access|field/i.test(meta.error?.message ?? '')
}

async function regionId(key: string, city: string): Promise<string> {
  const cacheKey = city.trim().toLowerCase()
  const hit = regionCache.get(cacheKey)
  if (hit) return hit
  const data = await call<{ items: { id: string }[] }>('/2.0/region/search', { q: city.trim(), key })
  const id = data.result?.items?.[0]?.id
  if (!id) throw new Error(`2GIS doesn't know the city "${city}".`)
  regionCache.set(cacheKey, String(id))
  return String(id)
}

/** Collects up to `limit` businesses by walking 2GIS pages. Each page is one billed request. */
export async function dgisSearch(
  key: string,
  opts: { city: string; category: string; lang: Lang; limit: number; startPage?: number; rubricId?: string },
): Promise<SearchResponse> {
  const out: Business[] = []
  let page = opts.startPage ?? 1
  let requests = 0
  let last: SearchResponse | undefined
  while (out.length < opts.limit && page <= MAX_PAGE) {
    last = await dgisSearchPage(key, opts.city, opts.category, opts.lang, page, opts.rubricId)
    requests++
    out.push(...last.results)
    if (!last.next) break
    page = Number(last.next)
  }
  const more = last?.next && page <= MAX_PAGE ? String(page) : undefined
  return {
    source: '2gis',
    query: `${opts.category} — ${opts.city}`,
    results: out.slice(0, opts.limit),
    next: out.length >= opts.limit ? more : undefined,
    attribution: DGIS_ATTRIBUTION,
    notice: last?.notice,
    requests,
  }
}

async function dgisSearchPage(
  key: string,
  city: string,
  category: string,
  lang: Lang,
  page = 1,
  rubricId?: string,
): Promise<SearchResponse> {
  const region_id = await regionId(key, city)
  const locale = dgisLocale(lang)
  // A rubric id gives exactly that category; free text can drift ("courses" → beauty-training courses).
  const params = {
    ...(rubricId ? { rubric_id: rubricId } : { q: category.trim() }),
    region_id,
    type: 'branch',
    page: String(page),
    page_size: String(PAGE_SIZE),
    locale,
    key,
  }
  let notice: string | undefined
  let data = await call<{ items: DgisItem[]; total: number }>('/3.0/items', { ...params, fields: FIELDS_FULL })
  if (data.meta.code !== 200 && data.meta.code !== 404 && isPermissionError(data.meta)) {
    data = await call('/3.0/items', { ...params, fields: FIELDS_NO_CONTACTS })
    notice = CONTACTS_NOTICE
  }
  if (data.meta.code === 404) {
    return { source: '2gis', query: `${category} — ${city}`, results: [], attribution: DGIS_ATTRIBUTION, notice }
  }
  if (data.meta.code !== 200) throw new Error(`2GIS: ${data.meta.error?.message ?? 'error ' + data.meta.code}`)
  const items = data.result?.items ?? []
  const total = data.result?.total ?? 0
  // Demo keys don't error without the contacts permission — they silently drop the field.
  const hidden = contactsHidden(items)
  if (hidden) notice = CONTACTS_NOTICE
  return {
    source: '2gis',
    query: `${category} — ${city}`,
    results: items.map((i) => ({ ...toBusiness(i, lang, city), ...(hidden ? { contactsHidden: true } : {}) })),
    next: page * PAGE_SIZE < total && page < MAX_PAGE ? String(page + 1) : undefined,
    attribution: DGIS_ATTRIBUTION,
    notice,
  }
}

export async function dgisDetails(key: string, ids: string[], lang: Lang): Promise<Business[]> {
  if (!ids.length) return []
  const locale = dgisLocale(lang)
  const base = { id: ids.slice(0, 100).join(','), locale, key }
  let data = await call<{ items: DgisItem[] }>('/3.0/items/byid', { ...base, fields: FIELDS_FULL })
  if (data.meta.code !== 200 && isPermissionError(data.meta)) {
    data = await call('/3.0/items/byid', { ...base, fields: FIELDS_NO_CONTACTS })
  }
  if (data.meta.code !== 200) throw new Error(`2GIS: ${data.meta.error?.message ?? 'error ' + data.meta.code}`)
  const items = data.result?.items ?? []
  const hidden = contactsHidden(items)
  return items.map((i) => ({ ...toBusiness(i, lang), ...(hidden ? { contactsHidden: true } : {}) }))
}
