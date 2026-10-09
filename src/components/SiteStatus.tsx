import type { SiteCheck } from '../../api/_lib/types'
import { STATUS_META } from '../lib/siteStatus'

export function SiteStatusBadge({ check }: { check?: SiteCheck | 'pending' }) {
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
