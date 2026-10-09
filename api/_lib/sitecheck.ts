import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { TtlCache } from './cache.js'
import type { SiteCheck } from './types.js'

/**
 * Website check — fetches ONLY the homepage, with short timeouts, and classifies it:
 *   none          no website (or only a social/link-in-bio page)
 *   unreachable   DNS/connection/timeout/HTTP error
 *   no_https      only works over plain http://
 *   no_viewport   works, but no <meta name="viewport"> → not mobile-friendly
 *   ok            HTTPS + viewport
 * Safety: refuses private/loopback IPs (SSRF), max 4 redirects, reads at most 256 KB.
 */
const UA = 'SiteScoutBot/1.0 (+https://damiruali014-lab.github.io; homepage check only)'
const MAX_BYTES = 256 * 1024
const cache = new TtlCache<SiteCheck>(60 * 60 * 1000, 500)

const SOCIAL_HOSTS = [
  'instagram.com', 'facebook.com', 'fb.com', 'm.facebook.com', 'wa.me', 'whatsapp.com', 'api.whatsapp.com',
  't.me', 'telegram.me', 'vk.com', 'tiktok.com', 'linktr.ee', 'taplink.cc', 'taplink.ws', 'taplink.at',
  'youtube.com', 'twitter.com', 'x.com', '2gis.kz', '2gis.ru', 'maps.google.com', 'g.page', 'business.site',
  'booksy.com', 'znanylekarz.pl', 'linkedin.com', 'ok.ru',
]

function socialHost(host: string): string | undefined {
  const h = host.toLowerCase().replace(/^www\./, '')
  return SOCIAL_HOSTS.find((s) => h === s || h.endsWith('.' + s))
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || // CGNAT
      (a === 169 && b === 254) || // link-local / cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19))
    )
  }
  const v6 = ip.toLowerCase()
  if (v6.startsWith('::ffff:')) return isPrivateIp(v6.slice(7))
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
}

async function assertPublic(url: URL): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new CheckError('Unsupported protocol')
  if (url.port && url.port !== '80' && url.port !== '443') throw new CheckError('Non-standard port refused')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) throw new CheckError('Private host refused')
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => {
    throw new CheckError('DNS lookup failed')
  })
  if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new CheckError('Private address refused')
}

class CheckError extends Error {}

interface FetchResult {
  finalUrl: URL
  status: number
  html: string
}

/** GET with manual redirects so every hop is validated against SSRF rules. */
async function fetchHome(start: URL, timeoutMs: number): Promise<FetchResult> {
  const signal = AbortSignal.timeout(timeoutMs)
  let url = start
  for (let hop = 0; hop <= 4; hop++) {
    await assertPublic(url)
    const res = await fetch(url, {
      redirect: 'manual',
      signal,
      headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5' },
    })
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      await res.body?.cancel()
      url = new URL(res.headers.get('location')!, url)
      continue
    }
    return { finalUrl: url, status: res.status, html: await readCapped(res) }
  }
  throw new CheckError('Too many redirects')
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    size += value.byteLength
  }
  await reader.cancel().catch(() => {})
  return new TextDecoder().decode(Buffer.concat(chunks))
}

const VIEWPORT_RE = /<meta[^>]+name\s*=\s*["']?viewport["']?[^>]*>/i

function describeError(e: unknown): string {
  if (e instanceof CheckError) return e.message
  const err = e as { name?: string; cause?: { code?: string } }
  if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'No response within the time limit'
  const code = err.cause?.code
  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') return 'DNS lookup failed'
  if (code === 'ECONNREFUSED') return 'Connection refused'
  if (code?.startsWith('ERR_TLS') || code?.includes('CERT')) return 'Invalid HTTPS certificate'
  return code ?? 'Connection failed'
}

export async function checkSite(website?: string): Promise<SiteCheck> {
  const now = () => new Date().toISOString()
  if (!website?.trim()) return { status: 'none', checkedAt: now() }

  let parsed: URL
  try {
    parsed = new URL(/^https?:\/\//i.test(website) ? website.trim() : `http://${website.trim()}`)
  } catch {
    return { status: 'unreachable', url: website, note: 'Invalid URL', checkedAt: now() }
  }
  const social = socialHost(parsed.hostname)
  if (social) return { status: 'none', url: website, note: `Only a social / link page (${social})`, checkedAt: now() }

  const cacheKey = parsed.hostname.toLowerCase()
  const hit = cache.get(cacheKey)
  if (hit) return hit

  const t0 = Date.now()
  const finish = (r: Omit<SiteCheck, 'checkedAt' | 'url' | 'ms'>): SiteCheck => {
    const out = { ...r, url: website, ms: Date.now() - t0, checkedAt: now() }
    cache.set(cacheKey, out)
    return out
  }

  const httpsHome = new URL(`https://${parsed.host}/`)
  const httpHome = new URL(`http://${parsed.host}/`)
  let result: FetchResult | undefined
  let httpsError: string | undefined
  try {
    result = await fetchHome(httpsHome, 5000)
  } catch (e) {
    httpsError = describeError(e)
    if (e instanceof CheckError && /refused/i.test(e.message)) return finish({ status: 'unreachable', note: e.message })
    try {
      result = await fetchHome(httpHome, 4000)
    } catch (e2) {
      return finish({ status: 'unreachable', note: describeError(e2) })
    }
  }

  const { finalUrl, status, html } = result
  if (status >= 400) {
    const blocked = status === 401 || status === 403 || status === 429
    return finish({
      status: 'unreachable',
      httpStatus: status,
      finalUrl: finalUrl.href,
      note: blocked ? `HTTP ${status} — the site blocks automated checks; verify by hand` : `HTTP ${status} error`,
    })
  }
  const base = { httpStatus: status, finalUrl: finalUrl.href }
  if (finalUrl.protocol !== 'https:') {
    return finish({
      ...base,
      status: 'no_https',
      note: httpsError ? `HTTPS failed (${httpsError}); works over plain http://` : 'Redirects to plain http://',
    })
  }
  if (!VIEWPORT_RE.test(html)) {
    return finish({ ...base, status: 'no_viewport', note: 'No viewport meta tag — not mobile-friendly' })
  }
  return finish({ ...base, status: 'ok', note: 'HTTPS + mobile viewport' })
}
