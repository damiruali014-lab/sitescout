import { scoreLead, type LeadScore } from '../../api/_lib/score'
import type { Business, SiteCheck } from '../../api/_lib/types'
import type { SiteFilter, SortKey } from './searchStore'

export interface ScoredLead {
  business: Business
  check?: SiteCheck | 'pending'
  score: LeadScore
}

export function scoreAll(results: Business[], checks: Record<string, SiteCheck | 'pending'>): ScoredLead[] {
  return results.map((b) => ({ business: b, check: checks[b.key], score: scoreLead(b, checks[b.key]) }))
}

function siteGroup(l: ScoredLead): SiteFilter | 'pending' {
  if (l.check === 'pending') return 'pending'
  const status = l.check?.status ?? (l.business.website ? undefined : 'none')
  if (status === 'none') return 'none'
  if (status === 'ok') return 'ok'
  return status ? 'poor' : 'pending'
}

export function filterAndSort(
  leads: ScoredLead[],
  filter: SiteFilter,
  sort: SortKey,
  minRating: number,
  hideChains = false,
): ScoredLead[] {
  const out = leads.filter(
    (l) =>
      (filter === 'all' || siteGroup(l) === filter) &&
      (minRating === 0 || (l.business.rating ?? 0) >= minRating) &&
      (!hideChains || (l.business.branchCount ?? 1) < 3),
  )
  const by: Record<SortKey, (a: ScoredLead, b: ScoredLead) => number> = {
    score: (a, b) => b.score.score - a.score.score || (b.business.reviews ?? 0) - (a.business.reviews ?? 0),
    rating: (a, b) => (b.business.rating ?? 0) - (a.business.rating ?? 0),
    reviews: (a, b) => (b.business.reviews ?? 0) - (a.business.reviews ?? 0),
    name: (a, b) => a.business.name.localeCompare(b.business.name),
  }
  return out.sort(by[sort])
}

export function countGroups(leads: ScoredLead[]): Record<SiteFilter, number> {
  const c = { all: leads.length, none: 0, poor: 0, ok: 0 }
  for (const l of leads) {
    const g = siteGroup(l)
    if (g !== 'pending' && g !== 'all') c[g]++
  }
  return c
}
