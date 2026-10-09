import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Business, Lang } from '../../api/_lib/types'
import { ClockIcon, PhoneIcon, PinIcon, StarIcon } from '../components/Icons'
import { OWNER_NAME, PORTFOLIO_URL } from '../lib/config'
import { demoBusiness } from '../lib/demoData'
import { localCategory, localHours, t } from '../lib/i18n'
import { supabase } from '../lib/supabase'
import { parseDemoSlug, templateDescription } from '../lib/templates'

interface PageData {
  business: Business
  lang: Lang
  description: string
  attribution: string
  isSample: boolean
}

/**
 * Public demo landing page at /p/:slug — what the business owner sees.
 * Demo slugs (demo-alm-1-en) are rebuilt from bundled sample data; real slugs load from /api/page.
 */
export function DemoLanding() {
  const { slug = '' } = useParams()
  const demoData = useMemo<PageData | null>(() => {
    const demo = parseDemoSlug(slug)
    const found = demo && demoBusiness(demo.sourceId)
    if (!demo || !found) return null
    const { site: _site, ...b } = found
    return { business: b, lang: demo.lang, description: templateDescription(b, demo.lang), attribution: 'Sample data — fictional business', isSample: true }
  }, [slug])
  const [remote, setRemote] = useState<{ slug: string; data?: PageData; error?: string }>()

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    if (parseDemoSlug(slug)) return
    let cancelled = false
    ;(async () => {
      // When I open my own page while logged in, don't count it as an owner view.
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      const res = await fetch(`/api/page?slug=${encodeURIComponent(slug)}`, { headers: session ? { 'x-sitescout-owner': '1' } : {} })
      const json = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) return setRemote({ slug, error: json.error ?? 'notFound' })
      setRemote({ slug, data: { business: json.business, lang: json.page.lang, description: json.page.description, attribution: json.attribution, isSample: false } })
    })().catch(() => !cancelled && setRemote({ slug, error: 'notFound' }))
    return () => {
      cancelled = true
    }
  }, [slug])

  const isDemoSlug = Boolean(parseDemoSlug(slug))
  const data = isDemoSlug ? demoData : remote?.slug === slug ? (remote.data ?? null) : null
  const failed = isDemoSlug ? (demoData ? undefined : 'notFound') : remote?.slug === slug ? remote.error : undefined

  useEffect(() => {
    if (data) document.title = `${data.business.name} — ${t(data.lang, 'previewBadge')}`
  }, [data])

  if (failed) return <div className="landing-empty">{failed === 'notFound' ? t('en', 'notFound') : failed}</div>
  if (!data) return <div className="landing-empty">{t('en', 'loading')}</div>

  const { business: b, lang, description } = data
  const vars = { owner: OWNER_NAME, name: b.name }
  const phone = b.phone?.replace(/[^\d+]/g, '')
  const wa = (b.whatsapp ?? b.phone)?.replace(/\D/g, '')
  const maps = b.mapsUrl ?? (b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ', ' + b.address)}` : undefined)
  const hours = localHours(b.hours, lang)
  const category = localCategory(b.category, lang)
  // Sample pages are fictional — don't let visitors dial random 555 numbers.
  const linkable = !data.isSample

  return (
    <div className="landing" lang={lang}>
      <div className="landing-preview-bar" role="note">
        <span className="badge badge-accent">{t(lang, 'previewBadge')}</span>
        <span>{t(lang, 'previewNote', vars)}</span>
      </div>

      <header className="landing-hero">
        <div className="landing-wrap">
          {category && <p className="landing-kicker">{category}</p>}
          <h1>{b.name}</h1>
          {b.rating != null && (
            <p className="landing-rating">
              <StarIcon size={16} /> <strong>{b.rating.toFixed(1)}</strong> · {b.reviews ?? 0} {t(lang, 'reviews')}
            </p>
          )}
          <div className="landing-ctas">
            {phone && (
              <a className="btn btn-primary btn-lg" href={linkable ? `tel:${phone}` : undefined} aria-disabled={!linkable}>
                <PhoneIcon size={16} /> {t(lang, 'book')}
              </a>
            )}
            {wa && (
              <a className="btn btn-lg" href={linkable ? `https://wa.me/${wa}` : undefined} target="_blank" rel="noreferrer" aria-disabled={!linkable}>
                {t(lang, 'whatsapp')}
              </a>
            )}
            {maps && (
              <a className="btn btn-lg" href={linkable ? maps : undefined} target="_blank" rel="noreferrer" aria-disabled={!linkable}>
                {t(lang, 'directions')}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="landing-wrap landing-body">
        <section>
          <h2>{t(lang, 'about')}</h2>
          <p className="landing-desc">{description}</p>
        </section>

        <div className="landing-cols">
          {hours && (
            <section className="landing-card">
              <h2>
                <ClockIcon size={16} /> {t(lang, 'hours')}
              </h2>
              <ul className="landing-hours">
                {hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="landing-card">
            <h2>
              <PinIcon size={16} /> {t(lang, 'location')}
            </h2>
            {b.address && <p>{b.address}</p>}
            {b.phone && (
              <p>
                <PhoneIcon size={14} /> {b.phone}
              </p>
            )}
            {maps && linkable && (
              <a href={maps} target="_blank" rel="noreferrer">
                {t(lang, 'openMaps')}
              </a>
            )}
          </section>
        </div>
      </main>

      <footer className="landing-footer">
        <div className="landing-wrap">
          <p>
            <strong>{t(lang, 'wantIt')}</strong> <a href={PORTFOLIO_URL}>{t(lang, 'contactOwner', vars)}</a>
          </p>
          <p className="small">{data.attribution}</p>
        </div>
      </footer>
    </div>
  )
}
