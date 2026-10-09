import type { Session } from '@supabase/supabase-js'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { forceDemo } from './config'
import { ModeContext, type Mode, type ModeState } from './modeContext'
import { supabase } from './supabase'

export function ModeProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [preferred, setPreferred] = useState<Mode>('live')

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo<ModeState>(() => {
    const canLive = Boolean(supabase && session && !forceDemo)
    return { mode: canLive ? preferred : 'demo', canLive, session, setMode: setPreferred }
  }, [session, preferred])

  return <ModeContext.Provider value={value}>{children}</ModeContext.Provider>
}
