import { env, json } from './_lib/http.js'

/** Tells the UI which integrations are configured (booleans only — never the keys). */
export function GET(): Response {
  return json({
    google: Boolean(env('GOOGLE_PLACES_API_KEY')),
    dgis: Boolean(env('DGIS_API_KEY')),
    ai: Boolean(env('ANTHROPIC_API_KEY')),
    supabase: Boolean(env('VITE_SUPABASE_URL') && env('SUPABASE_SERVICE_ROLE_KEY')),
  })
}
