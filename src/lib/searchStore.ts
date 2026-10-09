import { useSyncExternalStore } from 'react'
import type { Business, Lang, Provider, SearchResponse, SiteCheck } from '../../api/_lib/types'
import { COUNTRIES } from '../../api/_lib/countries'
import { readSession, writeSession } from './storage'

/**
 * Tiny global store for the current search, so results survive navigating to a lead / demo page
 * and back (and a page reload, via sessionStorage).
 */
export interface SearchState {
  /** ISO country code */
  country: string
  /** How many businesses to fetch (1–50) */
  limit: number
  city: string
  category: string
  provider: Provider
  lang: Lang
  response?: SearchResponse
  loading: boolean
  error?: string
  /** Website check per business key */
  checks: Record<string, SiteCheck | 'pending'>
  filter: SiteFilter
  sort: SortKey
  minRating: number
  /** Published demo page URL per business key */
  pages: Record<string, string>
}

export type SiteFilter = 'all' | 'none' | 'poor' | 'ok'
export type SortKey = 'score' | 'rating' | 'reviews' | 'name'

const KEY = 'sitescout-search-v1'
const initial: SearchState = {
  country: 'KZ',
  limit: 20,
  city: 'Almaty',
  category: 'Beauty salons',
  provider: 'auto',
  lang: 'en',
  loading: false,
  checks: {},
  filter: 'all',
  sort: 'score',
  minRating: 0,
  pages: {},
  ...readSession<Partial<SearchState>>(KEY),
}
initial.loading = false
// Older saved sessions could hold a city from another country — snap back to a consistent pair.
{
  const c = COUNTRIES.find((x) => x.code === initial.country)
  const known = COUNTRIES.find((x) => x.cities.some((city) => city.toLowerCase() === initial.city.toLowerCase()))
  if (c && known && known.code !== c.code) initial.city = c.cities[0]
}
for (const [k, v] of Object.entries(initial.checks)) if (v === 'pending') delete initial.checks[k]

let state: SearchState = initial
const listeners = new Set<() => void>()

export function getSearchState(): SearchState {
  return state
}

export function setSearchState(patch: Partial<SearchState> | ((s: SearchState) => Partial<SearchState>)): void {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  writeSession(KEY, state)
  listeners.forEach((l) => l())
}

export function useSearchState(): SearchState {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => state,
  )
}

export function findBusiness(key: string): Business | undefined {
  return state.response?.results.find((b) => b.key === key)
}
