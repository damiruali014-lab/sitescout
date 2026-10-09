import type { Business, SiteCheck, SiteStatus } from './types.js'

/**
 * Lead score 0–100. The idea: a business that customers clearly love (high rating, many reviews)
 * but that has no / a poor website is the best lead — it has budget, demand, and an obvious gap.
 *
 *   Website gap   up to 50  (none 50 · unreachable 42 · no HTTPS 32 · not mobile 30 · OK 0)
 *   Rating        up to 20  (≥4.7 → 20 · ≥4.5 → 16 · ≥4.0 → 11 · ≥3.5 → 5)
 *   Reviews       up to 20  (log scale: 10 → 8, 100 → 16, 300+ → 20)
 *   Reachable     10        (has phone / WhatsApp / Instagram / email)
 *   Chain        −15        (3+ branches: marketing is usually decided at head office)
 */
export type Tier = 'hot' | 'warm' | 'cold'

export interface LeadScore {
  score: number
  tier: Tier
  reasons: string[]
}

const SITE_POINTS: Record<SiteStatus, number> = { none: 50, unreachable: 42, no_https: 32, no_viewport: 30, ok: 0 }
const SITE_REASON: Record<SiteStatus, string> = {
  none: 'No website',
  unreachable: 'Website is down',
  no_https: 'Website has no HTTPS',
  no_viewport: 'Website is not mobile-friendly',
  ok: 'Already has a good website',
}

export function scoreLead(b: Business, check?: SiteCheck | 'pending'): LeadScore {
  const reasons: string[] = []
  let score = 0

  const status: SiteStatus | undefined =
    check && check !== 'pending' ? check.status : b.website || b.contactsHidden ? undefined : 'none'
  if (status) {
    score += SITE_POINTS[status]
    reasons.push(SITE_REASON[status])
  } else {
    score += 20 // has a website we haven't checked, or the provider hid it
    reasons.push(b.contactsHidden ? 'Website unknown (contacts hidden by 2GIS key)' : 'Website not checked yet')
  }

  const r = b.rating ?? 0
  const rPts = r >= 4.7 ? 20 : r >= 4.5 ? 16 : r >= 4.0 ? 11 : r >= 3.5 ? 5 : 0
  score += rPts
  if (rPts >= 16) reasons.push(`Excellent rating (${r.toFixed(1)})`)
  else if (rPts > 0) reasons.push(`Rating ${r.toFixed(1)}`)

  const n = b.reviews ?? 0
  const nPts = Math.min(20, Math.round(Math.log10(n + 1) * 8))
  score += nPts
  if (n >= 100) reasons.push(`${n} reviews — busy business`)
  else if (n > 0) reasons.push(`${n} reviews`)

  if (b.phone || b.whatsapp || b.instagram || b.email || b.contactsHidden) score += 10
  else reasons.push('No contact channel found')

  // Chains (3+ branches) usually decide marketing centrally — a single branch rarely buys a website.
  if ((b.branchCount ?? 1) >= 3) {
    score -= 15
    reasons.push(`Chain with ${b.branchCount} branches — decisions are usually made centrally`)
  }

  score = Math.max(0, Math.min(100, score))
  return { score, tier: score >= 75 ? 'hot' : score >= 50 ? 'warm' : 'cold', reasons }
}
