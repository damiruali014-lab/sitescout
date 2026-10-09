import type { SearchRequest, SearchResponse } from '../../api/_lib/types'
import { readSession, writeSession } from './storage'
import { accessToken } from './supabase'

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const token = await accessToken()
  const res = await fetch(path, {
    method: 'POST',
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
  if (hit) return { ...hit, cached: true }
  const res = await apiPost<SearchResponse>('/api/search', req)
  writeSession(key, res)
  return res
}
