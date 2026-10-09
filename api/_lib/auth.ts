import { TtlCache } from './cache.js'
import { env, error } from './http.js'

// Remember verified tokens for a minute so each click doesn't add a round-trip to Supabase.
const verified = new TtlCache<true>(60_000, 50)

/**
 * Every paid endpoint calls this first. It verifies the Supabase access token sent by the
 * browser (Authorization: Bearer …) and checks it belongs to ALLOWED_EMAIL.
 * Returns a Response to send back on failure, or null when the caller is allowed.
 */
export async function requireOwner(request: Request): Promise<Response | null> {
  // Local development convenience — never honoured on Vercel.
  if (!process.env.VERCEL && env('DEV_SKIP_AUTH') === '1') return null

  const url = env('VITE_SUPABASE_URL')
  const anon = env('VITE_SUPABASE_ANON_KEY')
  const allowed = env('ALLOWED_EMAIL')?.toLowerCase()
  if (!url || !anon || !allowed) return error('Live mode is not configured on this deployment. Use Demo mode.', 503)

  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return error('Please log in to use live search.', 401)
  if (verified.get(token)) return null

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return error('Your session has expired — please log in again.', 401)
    const user = (await res.json()) as { email?: string }
    if (user.email?.toLowerCase() !== allowed) return error('This account is not allowed to use live mode.', 403)
    verified.set(token, true)
    return null
  } catch {
    return error('Could not verify your login. Try again.', 502)
  }
}
