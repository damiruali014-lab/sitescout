import { cfg } from './supabaseAdmin.js'

/**
 * Businesses I've marked "already has a website" (or not interested). Search results skip them,
 * so I never spend time on them twice. Table: hidden_places (migration 005).
 */
export interface HiddenRow {
  key: string
  reason: 'has_website' | 'not_interested' | 'chain'
  website?: string | null
  found_via?: 'manual' | 'instagram' | 'google' | 'osm' | null
  created_at?: string
}

export async function hiddenKeys(): Promise<Set<string>> {
  try {
    const { url, headers } = cfg()
    const res = await fetch(`${url}/rest/v1/hidden_places?select=key&limit=10000`, { headers, signal: AbortSignal.timeout(4000) })
    if (!res.ok) return new Set() // table missing (migration 005 not run) → hide nothing
    return new Set(((await res.json()) as { key: string }[]).map((r) => r.key))
  } catch {
    return new Set()
  }
}

export async function listHidden(): Promise<HiddenRow[]> {
  const { url, headers } = cfg()
  const res = await fetch(`${url}/rest/v1/hidden_places?select=*&order=created_at.desc&limit=500`, { headers, signal: AbortSignal.timeout(5000) })
  if (res.status === 404 || res.status === 400) throw new Error('Run supabase/migrations/005_osm_and_hidden.sql in the Supabase SQL Editor first.')
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  return (await res.json()) as HiddenRow[]
}

export async function hidePlace(row: HiddenRow): Promise<void> {
  const { url, headers } = cfg()
  const res = await fetch(`${url}/rest/v1/hidden_places?on_conflict=key`, {
    method: 'POST',
    headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(5000),
  })
  if (res.status === 404) throw new Error('Run supabase/migrations/005_osm_and_hidden.sql in the Supabase SQL Editor first.')
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
}

export async function unhidePlace(key: string): Promise<void> {
  const { url, headers } = cfg()
  const res = await fetch(`${url}/rest/v1/hidden_places?key=eq.${encodeURIComponent(key)}`, { method: 'DELETE', headers, signal: AbortSignal.timeout(5000) })
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
}
