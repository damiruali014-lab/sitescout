import { requireOwner } from './_lib/auth.js'
import { env, error, json } from './_lib/http.js'
import { quotas } from './_lib/usage.js'

/**
 * GET /api/usage → how many paid API requests this app made, against each free allowance.
 * Google allowances reset monthly; 2GIS demo-key limits count over the key's lifetime.
 */
export async function GET(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  const url = env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return error('Supabase is not configured.', 503)

  const now = new Date()
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const since = new Date(Math.min(monthStart.getTime(), now.getTime() - 30 * 864e5))
  const dgisSince = env('DGIS_KEY_CREATED') // optional, e.g. 2026-10-09 — otherwise count all 2GIS rows

  const res = await fetch(`${url}/rest/v1/api_usage?select=sku,units,created_at&order=created_at.asc&limit=50000`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(6000),
  })
  if (res.status === 404 || res.status === 400) return error('Run supabase/migrations/004_api_usage.sql in Supabase first.', 503)
  if (!res.ok) return error(`Supabase ${res.status}`, 502)
  const rows = (await res.json()) as { sku: string; units: number; created_at: string }[]

  const used: Record<string, number> = {}
  const daily: Record<string, Record<string, number>> = {} // yyyy-mm-dd → provider → count
  for (const r of rows) {
    const t = new Date(r.created_at)
    const is2gis = r.sku.startsWith('2gis.')
    const counts = is2gis ? !dgisSince || t >= new Date(dgisSince) : t >= monthStart
    if (counts) used[r.sku] = (used[r.sku] ?? 0) + r.units
    if (t >= since) {
      const day = r.created_at.slice(0, 10)
      const provider = r.sku.split('.')[0]
      daily[day] ??= {}
      daily[day][provider] = (daily[day][provider] ?? 0) + r.units
    }
  }
  return json({
    month: monthStart.toISOString().slice(0, 7),
    quotas: quotas().map((q) => ({ ...q, used: used[q.sku] ?? 0 })),
    claudeRequests: used['claude.request'] ?? 0,
    daily,
  })
}
