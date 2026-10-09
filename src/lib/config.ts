const params = new URLSearchParams(window.location.search)

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** ?embed=1 → compact chrome for the portfolio iframe. Remembered for the session. */
export const isEmbed = params.get('embed') === '1' || sessionStorageFlag('sitescout-embed', params.get('embed') === '1')

/** ?demo=1 forces Demo mode even when the app is fully configured. */
export const forceDemo = params.get('demo') === '1' || isEmbed

export const OWNER_NAME = 'Damir Uali'
export const PORTFOLIO_URL = 'https://damiruali014-lab.github.io'

function sessionStorageFlag(key: string, set: boolean): boolean {
  try {
    if (set) sessionStorage.setItem(key, '1')
    return sessionStorage.getItem(key) === '1'
  } catch {
    return set
  }
}
