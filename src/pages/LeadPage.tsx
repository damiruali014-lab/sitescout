import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { scoreLead } from '../../api/_lib/score'
import { DemoPageCard } from '../components/DemoPageCard'
import { MessageCard } from '../components/MessageCard'
import { TrackerCard } from '../components/TrackerCard'
import { VerifyCard } from '../components/VerifyCard'
import type { Business } from '../../api/_lib/types'
import { ArrowLeftIcon, ClockIcon, ExternalIcon, GlobeIcon, PhoneIcon, PinIcon } from '../components/Icons'
import { Rating } from '../components/LeadCard'
import { ScoreBadge } from '../components/ScoreBadge'
import { SiteStatusBadge } from '../components/SiteStatus'
import { ensureChecks, recheck } from '../lib/checks'
import { displayHost } from '../lib/format'
import { useMode } from '../lib/modeContext'
import { useSearchState } from '../lib/searchStore'
import { useBusiness } from '../lib/useBusiness'
import { useTracker, type LeadInput } from '../lib/tracker'

export function LeadPage() {
  const { key = '' } = useParams()
  const { mode } = useMode()
  const s = useSearchState()
  const live = mode === 'live' && !key.startsWith('demo:')
  const { business: base, loading, error } = useBusiness(key, s.lang, live)
  // Facts found on this page (Google rating for map-only leads, website from Instagram) — shown, not stored.
  const [extra, setExtra] = useState<{ key: string; patch: Partial<Business> }>()
  const b = base && extra?.key === key ? { ...base, ...extra.patch } : base
  const check = s.checks[key]
  const tracker = useTracker(live)
  const tracked = tracker.leads.find((l) => l.key === key)
  const [justSent, setJustSent] = useState(false)

  // Opened directly (e.g. from the tracker)? Run the website check for this one lead.
  useEffect(() => {
    if (base) void ensureChecks([base], live ? 'live' : 'demo')
  }, [base, live])

  if (loading) return <div className="empty">Loading lead…</div>
  if (!b)
    return (
      <div className="empty card">
        <p>{error ?? 'Lead not found.'}</p>
        <p>
          <Link to="/">Back to search</Link>
        </p>
      </div>
    )

  const score = scoreLead(b, check)
  const snapshot: LeadInput = {
    source: b.source,
    sourceId: b.sourceId,
    score: score.score,
    siteStatus: check && check !== 'pending' ? check.status : undefined,
    searchCity: s.city || undefined,
    searchCategory: s.category || undefined,
  }

  return (
    <div className="stack">
      <Link to="/" className="back-link">
        <ArrowLeftIcon size={14} /> Back to results
      </Link>

      <header className="lead-head">
        <div className="stack-xs">
          <h1>{b.name}</h1>
          <div className="lead-meta">
            {b.category && <span>{b.category}</span>}
            <Rating rating={b.rating} reviews={b.reviews} />
          </div>
        </div>
        <div className="badges">
          <ScoreBadge score={score} />
          <SiteStatusBadge check={check} hidden={b.contactsHidden} />
        </div>
      </header>

      <div className="lead-grid">
        <div className="stack">
          <section className="card stack-sm" aria-labelledby="why-h">
            <h2 id="why-h">Why this lead</h2>
            <ul className="reasons">
              {score.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {check && check !== 'pending' && (
              <p className="small muted">
                Website check: {check.note ?? check.status}
                {check.ms != null && ` · ${check.ms} ms`}
                {check.httpStatus != null && ` · HTTP ${check.httpStatus}`}
              </p>
            )}
            {b.website && (
              <div>
                <button type="button" className="btn btn-sm" onClick={() => recheck(b, mode)} disabled={check === 'pending'}>
                  Re-check website
                </button>
              </div>
            )}
          </section>

          {(
            <VerifyCard
              key={b.key}
              business={b}
              live={live}
              onEnrich={(patch) => {
                setExtra((x) => ({ key, patch: { ...(x?.key === key ? x.patch : {}), ...patch } }))
                // A website turned up (Google / Instagram bio) → run the real website check on it.
                if (patch.website && patch.website !== b.website) void recheck({ ...b, ...patch }, mode)
              }}
            />
          )}

          <DemoPageCard
            business={b}
            live={live}
            onPublished={(_url, slug) => (tracked ? tracker.update(tracked.id, { demoSlug: slug }) : tracker.save({ ...snapshot, demoSlug: slug }))}
          />

          <MessageCard business={b} check={check} live={live} onSent={() => setJustSent(true)} />

          <TrackerCard
            tracked={tracked}
            snapshot={snapshot}
            justSent={justSent}
            live={live}
            onSave={(input) => void tracker.save(input)}
            onUpdate={(id, patch) => void tracker.update(id, patch)}
            onDismissSent={() => setJustSent(false)}
          />
        </div>

        <aside className="card stack-sm contact-card" aria-labelledby="contact-h">
          <h2 id="contact-h">Contact & details</h2>
          <dl className="details">
            {b.phone && (
              <div>
                <dt>
                  <PhoneIcon size={14} /> Phone
                </dt>
                <dd>{live ? <a href={`tel:${b.phone.replace(/\s/g, '')}`}>{b.phone}</a> : b.phone}</dd>
              </div>
            )}
            <div>
              <dt>
                <GlobeIcon size={14} /> Website
              </dt>
              <dd>
                {b.website ? (live ? <a href={b.website} target="_blank" rel="noreferrer nofollow">{displayHost(b.website)}</a> : displayHost(b.website)) : b.contactsHidden ? 'Hidden by your 2GIS key — check in 2GIS' : 'None listed'}
              </dd>
            </div>
            {b.instagram && (
              <div>
                <dt>Instagram</dt>
                <dd>@{b.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '')}</dd>
              </div>
            )}
            {b.whatsapp && (
              <div>
                <dt>WhatsApp</dt>
                <dd>{b.whatsapp}</dd>
              </div>
            )}
            {b.email && (
              <div>
                <dt>Email</dt>
                <dd>{b.email}</dd>
              </div>
            )}
            {b.address && (
              <div>
                <dt>
                  <PinIcon size={14} /> Address
                </dt>
                <dd>{b.address}</dd>
              </div>
            )}
            {(b.branchCount ?? 1) > 1 && (
              <div>
                <dt>Chain</dt>
                <dd>
                  {b.branchCount} branches{b.otherAddresses?.length ? ' — also at:' : ''}
                  {b.otherAddresses?.map((a) => (
                    <div key={a} className="muted small">
                      {a}
                    </div>
                  ))}
                </dd>
              </div>
            )}
            {b.hours && (
              <div>
                <dt>
                  <ClockIcon size={14} /> Hours
                </dt>
                <dd>
                  {b.hours.map((h) => (
                    <div key={h}>{h}</div>
                  ))}
                </dd>
              </div>
            )}
          </dl>
          {b.mapsUrl && (
            <a className="btn btn-sm" href={b.mapsUrl} target="_blank" rel="noreferrer">
              <ExternalIcon size={14} /> {b.source === '2gis' ? 'Open in 2GIS' : b.source === 'osm' ? 'Open in OpenStreetMap' : 'Open in Google Maps'}
            </a>
          )}
          <p className="small muted">{b.source === 'demo' ? 'Sample data — fictional business' : b.source === '2gis' ? 'Data © 2GIS' : b.source === 'osm' ? 'Data © OpenStreetMap contributors' : 'Data © Google'}</p>
        </aside>
      </div>
    </div>
  )
}
