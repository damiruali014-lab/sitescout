export function displayHost(url?: string): string | undefined {
  if (!url) return undefined
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function relativeDays(iso?: string): string {
  if (!iso) return 'never'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return new Date(iso).toLocaleDateString()
}

export function daysSince(iso?: string): number {
  return iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : Infinity
}
