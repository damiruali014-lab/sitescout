import { env } from './http.js'

/** Server-only Supabase REST calls with the service-role key (bypasses RLS — use carefully). */
function cfg() {
  const url = env('VITE_SUPABASE_URL')
  const key = env('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('Supabase is not configured on the server.')
  return { url, headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' } }
}

export interface DemoPageRow {
  slug: string
  source: 'google' | '2gis'
  source_id: string
  lang: 'en' | 'ru' | 'kk'
  description: string
  cta: string | null
  expires_at: string | null
  created_at: string
}

export async function getDemoPage(slug: string): Promise<DemoPageRow | null> {
  const { url, headers } = cfg()
  const res = await fetch(
    `${url}/rest/v1/demo_pages?slug=eq.${encodeURIComponent(slug)}&select=slug,source,source_id,lang,description,cta,expires_at,created_at&limit=1`,
    { headers, signal: AbortSignal.timeout(5000) },
  )
  if (!res.ok) throw new Error(`Supabase ${res.status}`)
  const rows = (await res.json()) as DemoPageRow[]
  return rows[0] ?? null
}

/** Count a view so I can see when an owner opened my demo (fire-and-forget). */
export async function countDemoView(slug: string): Promise<void> {
  const { url, headers } = cfg()
  await fetch(`${url}/rest/v1/rpc/increment_demo_view`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_slug: slug }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {})
}
