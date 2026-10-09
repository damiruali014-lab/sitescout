import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export type Mode = 'demo' | 'live'

export interface ModeState {
  mode: Mode
  /** Live mode is only possible when Supabase is configured, you're logged in and ?demo=1 isn't set */
  canLive: boolean
  session: Session | null
  setMode: (m: Mode) => void
}

export const ModeContext = createContext<ModeState | null>(null)

export function useMode(): ModeState {
  const ctx = useContext(ModeContext)
  if (!ctx) throw new Error('useMode must be used inside <ModeProvider>')
  return ctx
}
