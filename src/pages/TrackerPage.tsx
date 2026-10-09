import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalIcon } from '../components/Icons'
import { STATUS_META } from '../lib/siteStatus'
import { daysSince, relativeDays } from '../lib/format'
import { useMode } from '../lib/modeContext'
import { supabaseConfigured, forceDemo } from '../lib/config'
import { useSearchState } from '../lib/searchStore'
import { STATUS_LABEL, STATUSES, useTracker, type LeadStatus, type TrackedLead } from '../lib/tracker'
import { useLeadNames } from '../lib/useLeadNames'

export function TrackerPage() {
  const { mode, canLive } = useMode()
  const live = mode === 'live'
  const { lang } = useSearchState()
  const { leads, loading, error, update, remove } = useTracker(live)
  const names = useLeadNames(leads, lang, live)
  const [filter, setFilter] = useState<LeadStatus | 'all'>('all')

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length }
    for (const s of STATUSES) c[s] = leads.filter((l) => l.status === s).length
    return c
  }, [leads])
  const visible = filter === 'all' ? leads : leads.filter((l) => l.status === filter)

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Lead tracker</h1>
          <p className="muted">new → contacted → replied → won / lost</p>
        </div>
      </div>

      {!live && (
        <div className="banner" role="note">
          <span>
            <strong>Demo tracker</strong> — saved in this browser only.
            {supabaseConfigured && !forceDemo && !canLive && (
              <>
                {' '}
                <Link to="/login">Log in</Link> to see your real tracker.
              </>
            )}
          </span>
        </div>
      )}
      {error && <div className="banner banner-error">{error}</div>}

      <div className="segmented segmented-scroll" role="group" aria-label="Filter by status">
        {(['all', ...STATUSES] as const).map((s) => (
          <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : STATUS_LABEL[s]} {counts[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="empty">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="empty card">
          {leads.length === 0 ? (
            <>
              No saved leads yet. <Link to="/">Search</Link> and press “Save to tracker” on a lead.
            </>
          ) : (
            'No leads with this status.'
          )}
        </div>
      ) : (
        <div className="lead-list">
          {visible.map((l) => (
            <TrackerRow key={l.id} lead={l} name={names[l.key]?.name} category={names[l.key]?.category} onUpdate={(p) => update(l.id, p)} onRemove={() => remove(l.id)} />
          ))}
        </div>
      )}
      {live && <p className="muted small">Business names are loaded fresh from Google / 2GIS — only IDs and your notes are stored.</p>}
    </div>
  )
}

interface RowProps {
  lead: TrackedLead
  name?: string
  category?: string
  onUpdate: (patch: Partial<TrackedLead>) => void
  onRemove: () => void
}

function TrackerRow({ lead: l, name, category, onUpdate, onRemove }: RowProps) {
  const [notes, setNotes] = useState(l.notes)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const followUp = l.status === 'contacted' && daysSince(l.lastContactAt) >= 3
  const site = l.siteStatus ? STATUS_META[l.siteStatus] : undefined

  return (
    <article className="tracker-row card">
      <div className="tracker-top">
        <div className="stack-xs">
          <Link to={`/lead/${encodeURIComponent(l.key)}`} className="tracker-name">
            {name ?? 'Loading name…'}
          </Link>
          <div className="lead-meta">
            {category && <span>{category}</span>}
            <span>Last contact: {relativeDays(l.lastContactAt)}</span>
          </div>
        </div>
        <div className="badges">
          {followUp && <span className="badge badge-warn">Follow up</span>}
          {l.score != null && <span className="badge">Score {l.score}</span>}
          {site && <span className={`badge ${site.tone}`}>{site.label}</span>}
        </div>
      </div>

      <div className="row tracker-actions">
        <label className="visually-hidden" htmlFor={`st-${l.id}`}>
          Status
        </label>
        <select
          id={`st-${l.id}`}
          className={`select select-sm status-${l.status}`}
          value={l.status}
          onChange={(e) => onUpdate({ status: e.target.value as LeadStatus })}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button type="button" className="btn btn-sm" onClick={() => onUpdate({ lastContactAt: new Date().toISOString(), status: l.status === 'new' ? 'contacted' : l.status })}>
          Log contact today
        </button>
        {l.demoSlug && (
          <a className="btn btn-sm btn-ghost" href={`/p/${l.demoSlug}`} target="_blank" rel="noreferrer">
            <ExternalIcon size={14} /> Demo page
          </a>
        )}
        <span className="spacer" />
        {confirmDelete ? (
          <>
            <button type="button" className="btn btn-sm btn-danger" onClick={onRemove}>
              Delete
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirmDelete(true)} aria-label="Remove lead">
            Remove
          </button>
        )}
      </div>

      <details className="notes" open={Boolean(l.notes)}>
        <summary>Notes</summary>
        <textarea
          className="textarea"
          value={notes}
          maxLength={4000}
          placeholder="What did they say? When to follow up?"
          onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== l.notes && onUpdate({ notes })}
        />
      </details>
    </article>
  )
}
