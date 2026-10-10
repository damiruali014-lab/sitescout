import { useEffect, useState } from 'react'
import type { BioResult, Business } from '../../api/_lib/types'
import { apiGet, apiPost } from '../lib/api'
import { displayHost } from '../lib/format'
import { hideBusiness, unhideBusiness, type FoundVia } from '../lib/hidden'
import { getSearchState } from '../lib/searchStore'
import { ExternalIcon } from './Icons'

interface Props {
  business: Business
  live: boolean
  /** Extra facts found here (Google rating, website from Instagram…) — shown on this page, not stored */
  onEnrich: (patch: Partial<Business>) => void
}

const handleOf = (b: Business) => b.instagram?.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/.*$/, '') ?? ''

/**
 * "Does this business already have a website somewhere?" — before I write to them.
 * Google (for free-map leads), their Instagram bio, or my own eyes. A "yes" hides them from future searches.
 */
export function VerifyCard({ business: b, live, onEnrich }: Props) {
  const [google, setGoogle] = useState<{ busy?: boolean; done?: boolean; match?: Business | null; err?: string }>({})
  const [handle, setHandle] = useState(handleOf(b))
  const [ig, setIg] = useState<{ busy?: boolean; result?: BioResult; err?: string }>({})
  const [igReady, setIgReady] = useState<boolean>()
  const [manual, setManual] = useState<{ open?: boolean; url: string }>({ url: '' })
  const [hidden, setHidden] = useState<{ busy?: boolean; done?: boolean; err?: string }>({})

  useEffect(() => {
    if (!live) return
    let cancelled = false
    apiGet<{ configured: boolean }>('/api/instagram')
      .then((r) => !cancelled && setIgReady(r.configured))
      .catch(() => !cancelled && setIgReady(false))
    return () => {
      cancelled = true
    }
  }, [live])

  async function checkGoogle() {
    setGoogle({ busy: true })
    try {
      const { match } = await apiPost<{ match: Business | null }>('/api/verify', {
        name: b.name,
        address: b.address,
        city: b.city,
        country: getSearchState().country,
        lang: getSearchState().lang,
      })
      setGoogle({ done: true, match })
      if (match) onEnrich({ rating: match.rating, reviews: match.reviews, ...(match.website ? { website: match.website } : {}), ...(!b.phone && match.phone ? { phone: match.phone, phoneType: match.phoneType } : {}) })
    } catch (e) {
      setGoogle({ err: (e as Error).message })
    }
  }

  async function checkInstagram() {
    setIg({ busy: true })
    try {
      const result = await apiPost<BioResult>('/api/instagram', { handle })
      setIg({ result })
      onEnrich({ instagram: `@${result.handle}`, ...(result.kind === 'own_site' && result.website ? { website: result.website } : {}) })
    } catch (e) {
      setIg({ err: (e as Error).message })
    }
  }

  async function hide(website: string | undefined, via: FoundVia) {
    setHidden({ busy: true })
    try {
      await hideBusiness(b.key, website, via)
      setHidden({ done: true })
    } catch (e) {
      setHidden({ err: (e as Error).message })
    }
  }

  async function undo() {
    setHidden({ busy: true })
    try {
      await unhideBusiness(b.key)
      setHidden({})
    } catch (e) {
      setHidden({ done: true, err: (e as Error).message })
    }
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`"${b.name}" ${b.city ?? ''} instagram`)}`
  const igResult = ig.result
  const hideButton = (website: string | undefined, via: FoundVia) =>
    !hidden.done && (
      <button type="button" className="btn btn-sm" onClick={() => hide(website, via)} disabled={!live || hidden.busy}>
        {hidden.busy && <span className="spinner" />} Hide this business
      </button>
    )

  return (
    <section className="card stack-sm" aria-labelledby="verify-h">
      <h2 id="verify-h">Already has a website somewhere?</h2>
      <p className="small muted">Many small businesses only list their site on Instagram. Check before you write.</p>
      {!live && <p className="small banner">Demo — these checks work in Live mode (after login).</p>}

      {(b.source === 'osm' || !live) && (
        <div className="verify-row">
          <div className="row">
            <strong className="small">Google</strong>
            <span className="spacer" />
            <button type="button" className="btn btn-sm" onClick={checkGoogle} disabled={!live || google.busy || google.done}>
              {google.busy && <span className="spinner" />} Check on Google · 1 request
            </button>
          </div>
          {google.err && <p className="small banner banner-error">{google.err}</p>}
          {google.done && !google.match && <p className="small">Not found on Google Maps — even less online presence.</p>}
          {google.match && (
            <p className="small">
              {google.match.rating != null ? `★ ${google.match.rating.toFixed(1)} (${google.match.reviews ?? 0} reviews)` : 'No Google rating'} ·{' '}
              {google.match.website ? (
                <>
                  Google lists a website: <a href={google.match.website} target="_blank" rel="noreferrer nofollow">{displayHost(google.match.website)}</a> {hideButton(google.match.website, 'google')}
                </>
              ) : (
                'no website on Google either ✓'
              )}
            </p>
          )}
        </div>
      )}

      <div className="verify-row stack-xs">
        <label className="label" htmlFor="ig-handle">
          Instagram
        </label>
        <div className="row">
          <input
            id="ig-handle"
            className="input"
            placeholder="username, e.g. nails.lyon"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoCapitalize="none"
            spellCheck={false}
          />
          {igReady ? (
            <button type="button" className="btn btn-sm" onClick={checkInstagram} disabled={!live || ig.busy || !handle.trim()}>
              {ig.busy && <span className="spinner" />} Check bio
            </button>
          ) : (
            <a
              className="btn btn-sm"
              href={!live ? undefined : handle.trim() ? `https://instagram.com/${handle.trim().replace(/^@/, '')}` : searchUrl}
              aria-disabled={!live}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalIcon size={14} /> {handle.trim() ? 'Open profile' : 'Find their Instagram'}
            </a>
          )}
        </div>
        {live && igReady === false && (
          <p className="small muted">Automatic bio check isn’t set up yet (Instagram API keys) — open the profile and look at the link in their bio.</p>
        )}
        {ig.err && <p className="small banner banner-error">{ig.err}</p>}
        {igResult && (
          <p className="small">
            {igResult.kind === 'own_site' && (
              <>
                Website in bio: <a href={/^https?:/.test(igResult.website!) ? igResult.website : `https://${igResult.website}`} target="_blank" rel="noreferrer nofollow">{displayHost(igResult.website!)}</a> — not a lead. {hideButton(igResult.website, 'instagram')}
              </>
            )}
            {igResult.kind === 'booking' && <>Only a booking page ({displayHost(igResult.website!)}) — no own website, still a good lead ✓</>}
            {igResult.kind === 'link_in_bio' && <>Only a link-in-bio page ({displayHost(igResult.website!)}) — no real website, still a lead ✓</>}
            {igResult.kind === 'none' && <>No link in their bio — still a lead ✓</>}
            {igResult.followers != null && <span className="muted"> · {igResult.followers.toLocaleString()} followers</span>}
          </p>
        )}
      </div>

      <div className="verify-row stack-xs">
        {hidden.done ? (
          <p className="small">
            Hidden — it won’t appear in your searches again.{' '}
            <button type="button" className="link-btn" onClick={undo} disabled={hidden.busy}>
              Undo
            </button>
          </p>
        ) : manual.open ? (
          <div className="row">
            <input
              className="input"
              placeholder="Their website (optional)"
              value={manual.url}
              onChange={(e) => setManual({ ...manual, url: e.target.value })}
              aria-label="Their website"
            />
            {hideButton(manual.url.trim() || undefined, 'manual')}
          </div>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setManual({ ...manual, open: true })} disabled={!live}>
            I found their website → hide from searches
          </button>
        )}
        {hidden.err && <p className="small banner banner-error">{hidden.err}</p>}
      </div>
    </section>
  )
}
