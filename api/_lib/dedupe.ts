import type { Business } from './types.js'

/** Lower-case, strip quotes/punctuation/extra spaces: "„Old School” Barbershop." → "old school barbershop" */
export function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function groupKey(b: Business): string {
  return b.chainId ?? `name:${normaliseName(b.name)}`
}

/**
 * Branches of the same business (e.g. 5× "Logovo" in Astana) become ONE result: the branch with the
 * most reviews represents the chain and the other addresses are listed on it. Order is preserved.
 */
export function mergeBranches(list: Business[]): Business[] {
  const groups = new Map<string, Business[]>()
  for (const b of list) {
    const k = groupKey(b)
    const g = groups.get(k)
    if (g) g.push(b)
    else groups.set(k, [b])
  }
  const out: Business[] = []
  for (const g of groups.values()) {
    if (g.length === 1) {
      out.push(g[0])
      continue
    }
    const best = [...g].sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))[0]
    const others = g.filter((b) => b !== best)
    out.push({
      ...best,
      branchCount: Math.max(best.branchCount ?? 0, g.length),
      otherAddresses: [...new Set([...(best.otherAddresses ?? []), ...others.flatMap((o) => [o.address, ...(o.otherAddresses ?? [])]).filter((a): a is string => Boolean(a))])],
    })
  }
  return out
}
