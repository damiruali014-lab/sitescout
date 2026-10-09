import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="empty">
      <h2>Page not found</h2>
      <p>
        <Link to="/">Back to search</Link>
      </p>
    </div>
  )
}
