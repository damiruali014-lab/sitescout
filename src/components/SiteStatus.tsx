import type { SiteCheck } from '../../api/_lib/types'
import { STATUS_META } from '../lib/siteStatus'

export function SiteStatusBadge({ check, hidden }: { check?: SiteCheck | 'pending'; hidden?: boolean }) {
  if (!check && hidden)
    return (
      <span className="badge" title="Your 2GIS key hides phones and websites — check this business in 2GIS by hand">
        Website unknown
      </span>
    )
  if (!check) return <span className="badge">Not checked</span>
  if (check === 'pending')
    return (
      <span className="badge" aria-live="polite">
        <span className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} /> Checking…
      </span>
    )
  const m = STATUS_META[check.status]
  return (
    <span className={`badge ${m.tone}`} title={check.note ?? m.hint}>
      {m.label}
    </span>
  )
}
