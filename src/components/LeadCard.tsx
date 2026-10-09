import type { Business } from '../../api/_lib/types'
import { PinIcon, StarIcon } from './Icons'

export function Rating({ rating, reviews }: { rating?: number; reviews?: number }) {
  if (rating == null) return <span className="muted small">No rating</span>
  return (
    <span className="rating" title={`${rating} from ${reviews ?? 0} reviews`}>
      <StarIcon size={13} /> {rating.toFixed(1)}
      <span className="muted"> ({reviews ?? 0})</span>
    </span>
  )
}

interface Props {
  business: Business
  selected?: boolean
  onSelect?: () => void
  aside?: React.ReactNode
  footer?: React.ReactNode
}

export function LeadCard({ business: b, selected, onSelect, aside, footer }: Props) {
  return (
    <article className={'lead-card' + (selected ? ' selected' : '')}>
      <button type="button" className="lead-card-hit" onClick={onSelect} aria-label={`Open ${b.name}`} />
      <div className="lead-card-main">
        <div className="lead-card-head">
          <h3>{b.name}</h3>
          {aside}
        </div>
        <div className="lead-meta">
          {b.category && <span>{b.category}</span>}
          <Rating rating={b.rating} reviews={b.reviews} />
          {(b.branchCount ?? 1) > 1 && (
            <span className="badge" title="Branches of the same business are shown as one result">
              Chain · {b.branchCount} branches
            </span>
          )}
        </div>
        {b.address && (
          <p className="lead-address muted small">
            <PinIcon size={13} /> {b.address}
            {b.otherAddresses?.length ? <span> · +{b.otherAddresses.length} more in this search</span> : null}
          </p>
        )}
        {footer}
      </div>
    </article>
  )
}
