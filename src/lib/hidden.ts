import { apiPost, HIDDEN_LOCAL } from './api'
import { getSearchState, setSearchState } from './searchStore'
import { readLocal, writeLocal } from './storage'

export type FoundVia = 'manual' | 'instagram' | 'google' | 'osm'

/** Hide a business from all future searches (it already has a website) and drop it from the current results. */
export async function hideBusiness(key: string, website?: string, foundVia: FoundVia = 'manual'): Promise<void> {
  await apiPost('/api/hidden', { key, website, foundVia, reason: 'has_website' })
  writeLocal(HIDDEN_LOCAL, [...new Set([...readLocal<string[]>(HIDDEN_LOCAL, []), key])].slice(-2000))
  const res = getSearchState().response
  if (res) setSearchState({ response: { ...res, results: res.results.filter((b) => b.key !== key), hidden: (res.hidden ?? 0) + 1 } })
}

export async function unhideBusiness(key: string): Promise<void> {
  await apiPost('/api/hidden', { key }, 'DELETE')
  writeLocal(HIDDEN_LOCAL, readLocal<string[]>(HIDDEN_LOCAL, []).filter((k) => k !== key))
}
