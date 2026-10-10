import { useEffect, useState } from 'react'
import type { Business, Lang } from '../../api/_lib/types'
import { apiPost } from './api'
import { demoBusiness } from './demoData'
import { readSession, writeSession } from './storage'
import { findBusiness } from './searchStore'

interface Remote {
  key: string
  business?: Business
  error?: string
}

/**
 * Resolve a business by key ("google:…", "2gis:…", "demo:…"):
 * 1. demo data, 2. the current search results, 3. fresh details from the provider (live only).
 */
export function useBusiness(key: string, lang: Lang, live: boolean) {
  const local = resolveLocal(key) ?? readSession<Business>(`details:${lang}:${key}`)
  const [source, ...rest] = key.split(':')
  const sourceId = rest.join(':')
  const canFetch = !local && live && (source === 'google' || source === '2gis' || source === 'osm')
  const [remote, setRemote] = useState<Remote>()

  useEffect(() => {
    if (!canFetch) return
    let cancelled = false
    apiPost<{ results: Record<string, Business> }>('/api/details', { refs: [{ source, sourceId }], level: 'full', lang })
      .then(({ results }) => {
        if (cancelled) return
        const b = results[key]
        if (b) writeSession(`details:${lang}:${key}`, b)
        setRemote(b ? { key, business: b } : { key, error: 'Could not load this business.' })
      })
      .catch((e: Error) => !cancelled && setRemote({ key, error: e.message }))
    return () => {
      cancelled = true
    }
  }, [canFetch, key, source, sourceId, lang])

  if (local) return { business: local, loading: false }
  if (!canFetch) return { loading: false, error: 'Lead not found. Run a search first.' }
  if (remote?.key !== key) return { loading: true }
  return { business: remote.business, loading: false, error: remote.error }
}

function resolveLocal(key: string): Business | undefined {
  const demo = demoBusiness(key)
  if (demo) {
    const { site: _site, ...b } = demo
    return b
  }
  return findBusiness(key)
}
