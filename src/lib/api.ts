import type { SearchRequest, SearchResponse } from '../../api/_lib/types'
import { readLocal, readSession, writeSession } from './storage'
import { accessToken } from './supabase'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiPost<T>(path: string, body: unknown, method: 'POST' | 'DELETE' = 'POST'): Promise<T> {
  const token = await accessToken()
  const res = await fetch(path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status)
  return data
}

/**
 * Live search with a per-tab session cache: going back to a search you already ran
 * costs nothing. (Cleared when the tab closes — we don't keep provider data long-term.)
 */
export async function liveSearch(req: SearchRequest): Promise<SearchResponse> {
  const key = 'search:' + JSON.stringify([req.provider, req.country, req.limit, req.city, req.category, req.lang, req.page ?? ''].map((v) => String(v ?? '').toLowerCase()))
  const hit = readSession<SearchResponse>(key)
  if (hit) {
    // Leave out anything I hid after this search was cached.
    const hidden = new Set(readLocal<string[]>(HIDDEN_LOCAL, []))
    return { ...hit, results: hit.results.filter((b) => !hidden.has(b.key)), cached: true }
  }
  const res = await apiPost<SearchResponse>('/api/search', req)
  writeSession(key, res)
  return res
}

export async function apiGet<T>(path: string): Promise<T> {
  const token = await accessToken()
  const res = await fetch(path, { headers: token ? { authorization: `Bearer ${token}` } : {} })
  const data = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new ApiError(data.error ?? `Request failed (${res.status})`, res.status)
  return data
}

/** Keys I hid in this browser — lets cached searches drop them without another request. */
export const HIDDEN_LOCAL = 'sitescout-hidden-keys'
