/** Shared types — imported by both the /api functions and the React app. Keep this file dependency-free. */

export type Source = 'google' | '2gis' | 'demo'
export type Provider = 'auto' | 'google' | '2gis'
export type Lang = 'en' | 'ru' | 'kk'

export interface Business {
  /** Stable key: `${source}:${sourceId}` */
  key: string
  source: Source
  /** Google place ID / 2GIS item ID — the only thing we store long-term */
  sourceId: string
  name: string
  category?: string
  address?: string
  phone?: string
  website?: string
  /** Extra contact channels (2GIS often lists these) */
  instagram?: string
  whatsapp?: string
  email?: string
  rating?: number
  reviews?: number
  /** Human-readable opening hours, one line per day */
  hours?: string[]
  mapsUrl?: string
  city?: string
  /** The provider hid contacts (e.g. 2GIS demo key) — website is unknown, NOT missing */
  contactsHidden?: boolean
}

export interface SearchRequest {
  /** ISO country code, e.g. "KZ", "PL" — picks the default provider and biases Google */
  country?: string
  city: string
  category: string
  /** How many businesses to return (1–50) */
  limit?: number
  provider?: Provider
  /** Opaque cursor from a previous response ("load more") */
  page?: string
  lang?: Lang
}

export interface SearchResponse {
  source: Source
  query: string
  results: Business[]
  next?: string
  /** Attribution text the UI must show next to provider data */
  attribution: string
  notice?: string
  cached?: boolean
  /** How many paid API requests this search used */
  requests?: number
}

export type SiteStatus = 'none' | 'unreachable' | 'no_https' | 'no_viewport' | 'ok'

export interface SiteCheck {
  status: SiteStatus
  url?: string
  finalUrl?: string
  httpStatus?: number
  ms?: number
  note?: string
  checkedAt: string
}
