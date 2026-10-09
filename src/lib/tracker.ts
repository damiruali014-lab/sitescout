import { useCallback, useEffect, useState } from 'react'
import type { SiteStatus, Source } from '../../api/_lib/types'
import { readLocal, writeLocal } from './storage'
import { supabase } from './supabase'

export const STATUSES = ['new', 'contacted', 'replied', 'won', 'lost'] as const
export type LeadStatus = (typeof STATUSES)[number]

export const STATUS_LABEL: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  won: 'Won',
  lost: 'Lost',
}

export interface TrackedLead {
  id: string
  key: string
  source: Source
  sourceId: string
  status: LeadStatus
  notes: string
  lastContactAt?: string
  siteStatus?: SiteStatus
  score?: number
  demoSlug?: string
  searchCity?: string
  searchCategory?: string
  createdAt: string
  updatedAt: string
}

export type LeadInput = Pick<TrackedLead, 'source' | 'sourceId'> & Partial<Omit<TrackedLead, 'id' | 'key' | 'createdAt' | 'updatedAt'>>

interface Row {
  id: string
  source: 'google' | '2gis'
  source_id: string
  status: LeadStatus
  notes: string
  last_contact_at: string | null
  site_status: SiteStatus | null
  score: number | null
  demo_slug: string | null
  search_city: string | null
  search_category: string | null
  created_at: string
  updated_at: string
}

const fromRow = (r: Row): TrackedLead => ({
  id: r.id,
  key: `${r.source}:${r.source_id}`,
  source: r.source,
  sourceId: r.source_id,
  status: r.status,
  notes: r.notes,
  lastContactAt: r.last_contact_at ?? undefined,
  siteStatus: r.site_status ?? undefined,
  score: r.score ?? undefined,
  demoSlug: r.demo_slug ?? undefined,
  searchCity: r.search_city ?? undefined,
  searchCategory: r.search_category ?? undefined,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

function toRow(p: Partial<LeadInput>): Partial<Row> {
  const r: Partial<Row> = {}
  if (p.source) r.source = p.source as Row['source']
  if (p.sourceId) r.source_id = p.sourceId
  if (p.status) r.status = p.status
  if (p.notes !== undefined) r.notes = p.notes
  if (p.lastContactAt !== undefined) r.last_contact_at = p.lastContactAt ?? null
  if (p.siteStatus !== undefined) r.site_status = p.siteStatus ?? null
  if (p.score !== undefined) r.score = p.score ?? null
  if (p.demoSlug !== undefined) r.demo_slug = p.demoSlug ?? null
  if (p.searchCity !== undefined) r.search_city = p.searchCity ?? null
  if (p.searchCategory !== undefined) r.search_category = p.searchCategory ?? null
  return r
}

/* ─── Demo tracker: localStorage, seeded with sample leads ─── */
const DEMO_KEY = 'sitescout-demo-tracker-v1'
const daysAgo = (d: number) => new Date(Date.now() - d * 864e5).toISOString()
const DEMO_SEED: TrackedLead[] = [
  { id: 'd1', key: 'demo:alm-1', source: 'demo', sourceId: 'alm-1', status: 'replied', notes: 'Owner replied on WhatsApp — wants online booking. Call on Monday.', lastContactAt: daysAgo(1), siteStatus: 'none', score: 100, demoSlug: 'demo-alm-1-ru', createdAt: daysAgo(4), updatedAt: daysAgo(1) },
  { id: 'd2', key: 'demo:krk-2', source: 'demo', sourceId: 'krk-2', status: 'contacted', notes: 'Sent email in Polish-friendly English.', lastContactAt: daysAgo(3), siteStatus: 'no_https', score: 80, demoSlug: 'demo-krk-2-en', createdAt: daysAgo(5), updatedAt: daysAgo(3) },
  { id: 'd3', key: 'demo:ast-1', source: 'demo', sourceId: 'ast-1', status: 'new', notes: '', siteStatus: 'none', score: 100, createdAt: daysAgo(0), updatedAt: daysAgo(0) },
]

function demoLoad(): TrackedLead[] {
  return readLocal<TrackedLead[]>(DEMO_KEY, DEMO_SEED)
}
function demoSave(leads: TrackedLead[]) {
  writeLocal(DEMO_KEY, leads)
}

/** Unified tracker hook: Supabase when logged in (live), localStorage otherwise (demo). */
export function useTracker(live: boolean) {
  const [leads, setLeads] = useState<TrackedLead[]>(() => (live ? [] : demoLoad()))
  const [loading, setLoading] = useState(live)
  const [error, setError] = useState<string>()

  const refresh = useCallback(async () => {
    if (!live || !supabase) {
      setLeads(demoLoad())
      setLoading(false)
      return
    }
    const { data, error } = await supabase.from('leads').select('*').order('updated_at', { ascending: false })
    if (error) setError(error.message)
    else setLeads((data as Row[]).map(fromRow))
    setLoading(false)
  }, [live])

  useEffect(() => {
    let active = true
    // Defer to a microtask so state updates happen after the effect, not inside it.
    queueMicrotask(() => active && void refresh())
    return () => {
      active = false
    }
  }, [refresh])

  /** Insert or update by (source, sourceId). Returns the saved lead. */
  const save = useCallback(
    async (input: LeadInput): Promise<TrackedLead | undefined> => {
      const now = new Date().toISOString()
      if (!live || !supabase) {
        const all = demoLoad()
        const key = `${input.source}:${input.sourceId}`
        const existing = all.find((l) => l.key === key)
        const clean = stripUndefined(input)
        const next: TrackedLead = existing
          ? { ...existing, ...clean, updatedAt: now }
          : { id: crypto.randomUUID(), key, status: 'new', notes: '', createdAt: now, updatedAt: now, ...clean, source: input.source, sourceId: input.sourceId }
        const list = [next, ...all.filter((l) => l.key !== key)]
        demoSave(list)
        setLeads(list)
        return next
      }
      const { data, error } = await supabase
        .from('leads')
        .upsert(toRow(input), { onConflict: 'user_id,source,source_id' })
        .select()
        .single()
      if (error) {
        setError(error.message)
        return undefined
      }
      const saved = fromRow(data as Row)
      setLeads((ls) => [saved, ...ls.filter((l) => l.id !== saved.id)])
      return saved
    },
    [live],
  )

  const update = useCallback(
    async (id: string, patch: Partial<LeadInput>) => {
      setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, ...stripUndefined(patch), updatedAt: new Date().toISOString() } : l)))
      if (!live || !supabase) {
        demoSave(demoLoad().map((l) => (l.id === id ? { ...l, ...stripUndefined(patch), updatedAt: new Date().toISOString() } : l)))
        return
      }
      const { error } = await supabase.from('leads').update(toRow(patch)).eq('id', id)
      if (error) setError(error.message)
    },
    [live],
  )

  const remove = useCallback(
    async (id: string) => {
      setLeads((ls) => ls.filter((l) => l.id !== id))
      if (!live || !supabase) {
        demoSave(demoLoad().filter((l) => l.id !== id))
        return
      }
      const { error } = await supabase.from('leads').delete().eq('id', id)
      if (error) setError(error.message)
    },
    [live],
  )

  return { leads, loading, error, save, update, remove, refresh }
}

function stripUndefined<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>
}
