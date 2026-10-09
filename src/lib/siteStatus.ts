import type { SiteStatus } from '../../api/_lib/types'

export const STATUS_META: Record<SiteStatus, { label: string; tone: string; hint: string }> = {
  none: { label: 'No website', tone: 'badge-accent', hint: 'Best lead — no website at all' },
  unreachable: { label: 'Unreachable', tone: 'badge-bad', hint: 'Site is down or broken' },
  no_https: { label: 'No HTTPS', tone: 'badge-warn', hint: 'Browsers mark it “Not secure”' },
  no_viewport: { label: 'Not mobile-friendly', tone: 'badge-warn', hint: 'No viewport meta tag' },
  ok: { label: 'Website OK', tone: 'badge-good', hint: 'HTTPS and mobile-friendly' },
}
