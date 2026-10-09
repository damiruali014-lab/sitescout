import type { Business, SiteCheck } from '../../api/_lib/types'
import { apiPost } from './api'
import { demoSiteCheck } from './demoData'
import type { Mode } from './modeContext'
import { getSearchState, setSearchState } from './searchStore'

const BATCH = 10

/** Runs the website check for every business that doesn't have one yet. Safe to call repeatedly. */
export async function ensureChecks(businesses: Business[], mode: Mode): Promise<void> {
  const todo = businesses.filter((b) => !getSearchState().checks[b.key])
  if (!todo.length) return
  // Mark as pending synchronously so a second call (e.g. React StrictMode) doesn't double-fetch.
  setSearchState((s) => ({ checks: { ...s.checks, ...Object.fromEntries(todo.map((b) => [b.key, 'pending' as const])) } }))

  if (mode === 'demo') {
    // Simulate checks finishing one by one, like the real thing.
    for (const b of todo) {
      await new Promise((r) => setTimeout(r, 120 + Math.random() * 180))
      const c = demoSiteCheck(b.key) ?? { status: 'none' as const, checkedAt: new Date().toISOString() }
      setSearchState((s) => ({ checks: { ...s.checks, [b.key]: c } }))
    }
    return
  }

  for (let i = 0; i < todo.length; i += BATCH) {
    const batch = todo.slice(i, i + BATCH)
    try {
      const { results } = await apiPost<{ results: Record<string, SiteCheck> }>('/api/check', {
        items: batch.map((b) => ({ key: b.key, website: b.website })),
      })
      setSearchState((s) => ({ checks: { ...s.checks, ...results } }))
    } catch (e) {
      const failed: SiteCheck = { status: 'unreachable', note: 'Check failed: ' + (e as Error).message, checkedAt: new Date().toISOString() }
      setSearchState((s) => {
        const checks = { ...s.checks }
        for (const b of batch) delete checks[b.key] // allow a retry later
        return { checks, error: failed.note }
      })
      return
    }
  }
}

export async function recheck(b: Business, mode: Mode): Promise<void> {
  setSearchState((s) => {
    const checks = { ...s.checks }
    delete checks[b.key]
    return { checks }
  })
  await ensureChecks([b], mode)
}
