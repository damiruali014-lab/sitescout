import { useEffect, useState } from 'react'
import type { Business, Lang } from '../../api/_lib/types'
import { apiPost } from './api'
import { demoBusiness } from './demoData'
import { readSession, writeSession } from './storage'
import type { TrackedLead } from './tracker'

const CACHE = 'tracker-names-v1'

/**
 * Names/categories for tracked leads. We only store IDs, so live leads are looked up via
 * /api/details (Place Details "basic" field mask = cheaper SKU) and cached for this browser session.
 */
export function useLeadNames(leads: TrackedLead[], lang: Lang, live: boolean): Record<string, Business> {
  const [fetched, setFetched] = useState<Record<string, Business>>(() => readSession(CACHE) ?? {})

  const missing = live ? leads.filter((l) => l.source !== 'demo' && !fetched[l.key]) : []
  const missingKey = missing.map((l) => l.key).join(',')

  useEffect(() => {
    if (!missingKey) return
    let cancelled = false
    const refs = missingKey.split(',').map((k) => {
      const [source, ...rest] = k.split(':')
      return { source, sourceId: rest.join(':') }
    })
    apiPost<{ results: Record<string, Business> }>('/api/details', { refs, level: 'basic', lang })
      .then(({ results }) => {
        if (cancelled) return
        setFetched((prev) => {
          const next = { ...prev, ...results }
          writeSession(CACHE, next)
          return next
        })
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [missingKey, lang])

  const out: Record<string, Business> = { ...fetched }
  for (const l of leads) {
    if (l.source === 'demo') {
      const d = demoBusiness(l.key)
      if (d) out[l.key] = d
    }
  }
  return out
}
