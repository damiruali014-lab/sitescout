import { Link } from 'react-router-dom'
import { relativeDays } from '../lib/format'
import { STATUS_LABEL, STATUSES, type LeadInput, type LeadStatus, type TrackedLead } from '../lib/tracker'

interface Props {
  tracked?: TrackedLead
  snapshot: LeadInput
  justSent: boolean
  live: boolean
  onSave: (input: LeadInput) => void
  onUpdate: (id: string, patch: Partial<LeadInput>) => void
  onDismissSent: () => void
}

/** Lead page → tracker: save the lead, change status, log a contact. */
export function TrackerCard({ tracked, snapshot, justSent, live, onSave, onUpdate, onDismissSent }: Props) {
  const markContacted = () => {
    const patch = { lastContactAt: new Date().toISOString(), status: (tracked && tracked.status !== 'new' ? tracked.status : 'contacted') as LeadStatus }
    if (tracked) onUpdate(tracked.id, patch)
    else onSave({ ...snapshot, ...patch })
    onDismissSent()
  }

  return (
    <section className="card stack-sm" aria-labelledby="tr-h">
      <div className="row">
        <h2 id="tr-h">Tracker</h2>
        {!live && <span className="badge">demo · this browser only</span>}
        <span className="spacer" />
        <Link to="/tracker" className="small">
          Open tracker →
        </Link>
      </div>
      {justSent && (
        <div className="banner">
          <span className="spacer">Sent the message?</span>
          <button type="button" className="btn btn-primary btn-sm" onClick={markContacted}>
            Mark as contacted
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDismissSent}>
            Not yet
          </button>
        </div>
      )}
      {tracked ? (
        <div className="row">
          <label className="small muted" htmlFor="lead-status">
            Status
          </label>
          <select id="lead-status" className={`select select-sm status-${tracked.status}`} value={tracked.status} onChange={(e) => onUpdate(tracked.id, { status: e.target.value as LeadStatus })}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          <span className="small muted">Last contact: {relativeDays(tracked.lastContactAt)}</span>
        </div>
      ) : (
        <div>
          <button type="button" className="btn" onClick={() => onSave(snapshot)}>
            Save to tracker
          </button>
        </div>
      )}
    </section>
  )
}
