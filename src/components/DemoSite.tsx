import type { CSSProperties } from 'react'
import { siteGroup, type SiteContent } from '../../api/_lib/sitecontent'
import type { Business, Lang } from '../../api/_lib/types'
import { OWNER_NAME, PORTFOLIO_URL } from '../lib/config'
import { localCategory, localHours, t } from '../lib/i18n'
import { SITE_THEMES } from '../lib/siteThemes'
import { ClockIcon, PhoneIcon, PinIcon, StarIcon } from './Icons'

interface Props {
  business: Business
  lang: Lang
  content: SiteContent
  attribution: string
  /** Fictional sample data: buttons are inert so nobody dials a 555 number */
  inert?: boolean
  /** Rendered inside the builder's preview frame (no sticky header) */
  embedded?: boolean
}

/** A complete one-page website for the business — what the owner sees at /p/:slug. */
export function DemoSite({ business: b, lang, content: c, attribution, inert, embedded }: Props) {
  const group = siteGroup(b.category)
  const theme = SITE_THEMES[group]
  const vars = { owner: OWNER_NAME, name: b.name }
  const phone = b.phone?.replace(/[^\d+]/g, '')
  const wa = b.phoneType === 'landline' && !b.whatsapp ? undefined : (b.whatsapp ?? b.phone)?.replace(/\D/g, '')
  const maps = b.mapsUrl ?? (b.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.name + ', ' + b.address)}` : undefined)
  const hours = localHours(b.hours, lang)
  const category = localCategory(b.category, lang)
  const src = b.source === '2gis' ? '2GIS' : b.source === 'google' ? 'Google' : b.source === 'osm' ? 'OpenStreetMap' : 'maps'
  const href = (url?: string) => (inert ? undefined : url)
  const style = { '--site-accent': theme.accent, '--site-soft': theme.soft, '--site-ink': theme.ink } as CSSProperties
  const primaryCta = wa ? `https://wa.me/${wa}` : phone ? `tel:${phone}` : maps

  return (
    <div className={'site' + (embedded ? ' site-embedded' : '')} style={style} lang={lang}>
      <div className="site-preview-bar" role="note">
        <span className="site-pill">{t(lang, 'previewBadge')}</span>
        <span>{t(lang, 'previewNote', vars)}</span>
      </div>

      <header className="site-nav">
        <div className="site-wrap site-nav-inner">
          <span className="site-logo" aria-hidden="true">
            {b.name.trim().charAt(0).toUpperCase()}
          </span>
          <strong className="site-brand">{b.name}</strong>
          <a className="site-btn site-btn-sm" href={href(primaryCta)} target="_blank" rel="noreferrer" aria-disabled={inert}>
            {c.cta}
          </a>
        </div>
      </header>

      <section className="site-hero">
        <div className="site-wrap site-hero-inner">
          <div className="site-hero-text">
            {category && <p className="site-kicker">{category}</p>}
            {/* Inside the builder preview the page already has its own h1 */}
            {embedded ? <p className="site-title">{b.name}</p> : <h1 className="site-title">{b.name}</h1>}
            <p className="site-tagline">{c.tagline}</p>
            {b.rating != null && (
              <p className="site-rating">
                <StarIcon size={16} /> <strong>{b.rating.toFixed(1)}</strong> · {t(lang, 'reviewsOn', { n: String(b.reviews ?? 0), src })}
              </p>
            )}
            <div className="site-ctas">
              <a className="site-btn" href={href(primaryCta)} target="_blank" rel="noreferrer" aria-disabled={inert}>
                {c.cta}
              </a>
              {phone && (
                <a className="site-btn site-btn-ghost" href={href(`tel:${phone}`)} aria-disabled={inert}>
                  <PhoneIcon size={15} /> {t(lang, 'call')}
                </a>
              )}
            </div>
          </div>
          <div className="site-hero-art" aria-hidden="true">
            <span>{b.name.trim().charAt(0).toUpperCase()}</span>
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-wrap">
          <h2>{t(lang, 'whyUs')}</h2>
          <div className="site-grid-3">
            {c.highlights.map((h, i) => (
              <div key={i} className="site-card">
                <span className="site-num">0{i + 1}</span>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="site-section site-section-soft">
        <div className="site-wrap site-two">
          <div>
            <h2>{t(lang, 'about')}</h2>
            <p className="site-lead">{c.about}</p>
          </div>
          {c.services.length > 0 && (
            <div>
              <h2>{t(lang, 'services')}</h2>
              <ul className="site-services">
                {c.services.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      {b.rating != null && (b.reviews ?? 0) > 0 && (
        <section className="site-section">
          <div className="site-wrap site-reviews">
            <div className="site-big-rating">
              <strong>{b.rating.toFixed(1)}</strong>
              <span className="site-stars" aria-hidden="true">
                {'★★★★★'.slice(0, Math.round(b.rating))}
              </span>
            </div>
            <div>
              <h2>{t(lang, 'reviewsTitle')}</h2>
              <p className="site-lead">{t(lang, 'reviewsOn', { n: String(b.reviews), src })}</p>
              {maps && (
                <a className="site-link" href={href(maps)} target="_blank" rel="noreferrer">
                  {t(lang, 'readReviews')} →
                </a>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="site-section site-section-soft">
        <div className="site-wrap site-grid-2">
          {hours && (
            <div className="site-card">
              <h3>
                <ClockIcon size={16} /> {t(lang, 'hours')}
              </h3>
              <ul className="site-hours">
                {hours.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="site-card">
            <h3>
              <PinIcon size={16} /> {t(lang, 'location')}
            </h3>
            {b.address && <p>{b.address}</p>}
            {b.phone && <p>{b.phone}</p>}
            {maps && (
              <a className="site-link" href={href(maps)} target="_blank" rel="noreferrer">
                {t(lang, 'openMaps')} →
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="site-cta-band">
        <div className="site-wrap">
          <h2>{t(lang, 'contactTitle')}</h2>
          <p>{t(lang, 'contactText')}</p>
          <div className="site-ctas">
            <a className="site-btn site-btn-light" href={href(primaryCta)} target="_blank" rel="noreferrer" aria-disabled={inert}>
              {c.cta}
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="site-wrap">
          <p>
            © {b.name} · {t(lang, 'concept', vars)} — <a href={PORTFOLIO_URL}>{t(lang, 'wantIt')}</a>
          </p>
          <p className="site-attr">{attribution}</p>
        </div>
      </footer>
    </div>
  )
}
