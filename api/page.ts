import { attributionFor, getDetails } from './_lib/details.js'
import { clientIp, error, json } from './_lib/http.js'
import { flushUsage } from './_lib/usage.js'
import { rateLimited } from './_lib/ratelimit.js'
import { countDemoView, getDemoPage } from './_lib/supabaseAdmin.js'

export const config = { maxDuration: 15 }

/**
 * PUBLIC endpoint behind /p/:slug — no login, because business owners open it.
 * Returns the saved page (my text) + fresh business details from the provider.
 */
async function handle(request: Request): Promise<Response> {
  if (rateLimited(`page:${clientIp(request)}`, 30)) return error('Too many requests.', 429)
  const slug = new URL(request.url).searchParams.get('slug') ?? ''
  if (!/^[a-z0-9-]{6,80}$/.test(slug)) return error('Not found', 404)
  try {
    const page = await getDemoPage(slug)
    if (!page) return error('Not found', 404)
    if (page.expires_at && new Date(page.expires_at) < new Date()) return error('This preview has expired.', 410)
    const details = await getDetails([{ source: page.source, sourceId: page.source_id }], 'full', page.lang)
    const business = details[`${page.source}:${page.source_id}`]
    if (!business) return error('Business details are temporarily unavailable.', 502)
    if (!request.headers.get('x-sitescout-owner')) void countDemoView(slug)
    return json({ page, business, attribution: attributionFor(page.source) })
  } catch (e) {
    console.error('page failed', e)
    return error('Could not load this preview.', 502)
  }
}

export async function GET(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } finally {
    await flushUsage() // record paid API calls for the Usage page
  }
}
