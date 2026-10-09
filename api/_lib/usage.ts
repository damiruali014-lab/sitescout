import { env } from './http.js'

/**
 * Counts every paid API request the app makes, so the Usage page can show how much free quota is
 * left. Providers don't offer a simple "credits left" API (Google needs Cloud Billing OAuth; 2GIS
 * shows it only in Platform Manager), so we count our own calls. Best effort: never breaks a request.
 */
export type Sku =
  | 'google.text_search'
  | 'google.details_pro'
  | 'google.details_enterprise'
  | '2gis.items'
  | '2gis.regions'
  | 'claude.request'

const pending: { sku: Sku; units: number }[] = []

export function track(sku: Sku, units = 1): void {
  pending.push({ sku, units })
}

/** Write buffered rows to Supabase (one insert). Call before returning from an endpoint. */
export async function flushUsage(): Promise<void> {
  const url = env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  const rows = pending.splice(0, pending.length)
  if (!url || !key || rows.length === 0) return
  await fetch(`${url}/rest/v1/api_usage`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=minimal' },
    body: JSON.stringify(rows),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {}) // table missing / network — counting must never break the app
}

/** Free allowances per month (Google) or per key (2GIS demo). Override with env vars if your plan differs. */
export function quotas() {
  const n = (name: string, fallback: number) => Number(env(name)) || fallback
  return [
    { sku: 'google.text_search', label: 'Google · Text Search (Enterprise)', provider: 'google', limit: n('QUOTA_GOOGLE_SEARCH', 1000), period: 'month', pricePer1000: 35 },
    { sku: 'google.details_pro', label: 'Google · Place Details (Pro)', provider: 'google', limit: n('QUOTA_GOOGLE_DETAILS_PRO', 5000), period: 'month', pricePer1000: 17 },
    { sku: 'google.details_enterprise', label: 'Google · Place Details (Enterprise)', provider: 'google', limit: n('QUOTA_GOOGLE_DETAILS_ENT', 1000), period: 'month', pricePer1000: 20 },
    { sku: '2gis.items', label: '2GIS · Places API (demo key)', provider: '2gis', limit: n('QUOTA_2GIS_PLACES', 1000), period: 'key', pricePer1000: 0 },
    { sku: '2gis.regions', label: '2GIS · Regions API (demo key)', provider: '2gis', limit: n('QUOTA_2GIS_REGIONS', 1000), period: 'key', pricePer1000: 0 },
  ] as const
}
