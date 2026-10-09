import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Lang, Provider } from '../../api/_lib/types'
import { LeadCard } from '../components/LeadCard'
import { ScoreBadge } from '../components/ScoreBadge'
import { SearchIcon } from '../components/Icons'
import { SiteStatusBadge } from '../components/SiteStatus'
import { liveSearch } from '../lib/api'
import { ensureChecks } from '../lib/checks'
import { displayHost } from '../lib/format'
import { countGroups, filterAndSort, scoreAll } from '../lib/leads'
import { DEMO_PRESETS, demoSearch, findDemoPreset } from '../lib/demoData'
import { useMode } from '../lib/modeContext'
import { setSearchState, useSearchState, type SiteFilter, type SortKey } from '../lib/searchStore'

const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ru', label: 'Русский' },
  { value: 'kk', label: 'Қазақша' },
]

export function SearchPage() {
  const { mode, canLive, setMode } = useMode()
  const s = useSearchState()
  const [city, setCity] = useState(s.city)
  const [category, setCategory] = useState(s.category)
  const navigate = useNavigate()

  // Check every new result's website automatically (homepage only, batched).
  useEffect(() => {
    if (s.response?.results.length) void ensureChecks(s.response.results, mode)
  }, [s.response, mode])

  async function run(page?: string) {
    const c = city.trim()
    const k = category.trim()
    setSearchState({ city: c, category: k, loading: true, error: undefined })
    if (mode === 'demo') {
      const preset = findDemoPreset(c, k)
      await new Promise((r) => setTimeout(r, 450)) // feel like a real request
      if (!preset) {
        setSearchState({
          loading: false,
          response: undefined,
          error: `Demo mode only has sample data for: ${DEMO_PRESETS.map((p) => p.label).join(' · ')}.`,
        })
        return
      }
      setSearchState({ loading: false, response: demoSearch(preset.id), checks: {} })
      return
    }
    try {
      const res = await liveSearch({ city: c, category: k, provider: s.provider, lang: s.lang, page })
      setSearchState((prev) => ({
        loading: false,
        response: page && prev.response ? { ...res, results: [...prev.response.results, ...res.results] } : res,
        checks: page ? prev.checks : {},
      }))
    } catch (e) {
      setSearchState({ loading: false, error: (e as Error).message })
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void run()
  }

  function pickPreset(id: string) {
    const p = DEMO_PRESETS.find((x) => x.id === id)!
    setCity(p.city)
    setCategory(p.category)
    setSearchState({ city: p.city, category: p.category, response: demoSearch(p.id), checks: {}, error: undefined })
  }

  const res = s.response
  const scored = useMemo(() => (res ? scoreAll(res.results, s.checks) : []), [res, s.checks])
  const counts = useMemo(() => countGroups(scored), [scored])
  const visible = useMemo(() => filterAndSort(scored, s.filter, s.sort, s.minRating), [scored, s.filter, s.sort, s.minRating])
  const FILTERS: { value: SiteFilter; label: string }[] = [
    { value: 'all', label: `All ${counts.all}` },
    { value: 'none', label: `No site ${counts.none}` },
    { value: 'poor', label: `Poor site ${counts.poor}` },
    { value: 'ok', label: `OK ${counts.ok}` },
  ]

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Find businesses that need a website</h1>
          <p className="muted">Search a city and category, check their websites and contact the best leads.</p>
        </div>
        {canLive && (
          <div className="segmented" role="group" aria-label="Data mode">
            <button type="button" aria-pressed={mode === 'live'} onClick={() => setMode('live')}>
              Live
            </button>
            <button type="button" aria-pressed={mode === 'demo'} onClick={() => setMode('demo')}>
              Demo
            </button>
          </div>
        )}
      </div>

      {mode === 'demo' && (
        <div className="banner" role="note">
          <span>
            <strong>Demo mode</strong> — fictional sample businesses, no API keys or login needed. Try the whole flow:
            search → website check → demo page → message.
          </span>
        </div>
      )}

      <form className="card search-form" onSubmit={onSubmit}>
        <div className="field">
          <label className="label" htmlFor="city">
            City
          </label>
          <input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Almaty" required maxLength={80} autoComplete="address-level2" />
        </div>
        <div className="field">
          <label className="label" htmlFor="category">
            Business category
          </label>
          <input id="category" className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. beauty salons" required maxLength={80} />
        </div>
        {mode === 'live' && (
          <div className="field">
            <label className="label" htmlFor="provider">
              Data source
            </label>
            <select id="provider" className="select" value={s.provider} onChange={(e) => setSearchState({ provider: e.target.value as Provider })}>
              <option value="auto">Auto (2GIS for Kazakhstan)</option>
              <option value="google">Google Places</option>
              <option value="2gis">2GIS</option>
            </select>
          </div>
        )}
        <div className="field">
          <label className="label" htmlFor="lang">
            Language
          </label>
          <select id="lang" className="select" value={s.lang} onChange={(e) => setSearchState({ lang: e.target.value as Lang })}>
            {LANGS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary search-submit" disabled={s.loading}>
          {s.loading ? <span className="spinner" /> : <SearchIcon />} Search
        </button>
      </form>

      {mode === 'demo' && (
        <div className="row" aria-label="Sample searches">
          <span className="muted small">Try:</span>
          {DEMO_PRESETS.map((p) => (
            <button key={p.id} type="button" className="btn btn-sm" onClick={() => pickPreset(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
      )}

      {s.error && (
        <div className="banner banner-error" role="alert">
          {s.error}
        </div>
      )}

      {res && (
        <section className="stack" aria-label="Results">
          <div className="row">
            <h2>
              {res.results.length} businesses <span className="muted">· {res.query}</span>
            </h2>
            {res.cached && <span className="badge">cached</span>}
          </div>
          {res.notice && <div className="banner">{res.notice}</div>}
          {res.results.length > 0 && (
            <div className="toolbar">
              <div className="segmented segmented-scroll" role="group" aria-label="Filter by website">
                {FILTERS.map((f) => (
                  <button key={f.value} type="button" aria-pressed={s.filter === f.value} onClick={() => setSearchState({ filter: f.value })}>
                    {f.label}
                  </button>
                ))}
              </div>
              <label className="row small muted">
                Sort
                <select className="select" value={s.sort} onChange={(e) => setSearchState({ sort: e.target.value as SortKey })}>
                  <option value="score">Best lead</option>
                  <option value="rating">Rating</option>
                  <option value="reviews">Reviews</option>
                  <option value="name">Name</option>
                </select>
              </label>
              <label className="row small muted">
                Rating
                <select className="select" value={s.minRating} onChange={(e) => setSearchState({ minRating: Number(e.target.value) })}>
                  <option value={0}>Any</option>
                  <option value={4}>4.0+</option>
                  <option value={4.5}>4.5+</option>
                </select>
              </label>
            </div>
          )}
          {res.results.length === 0 ? (
            <div className="empty card">Nothing found. Try a broader category.</div>
          ) : visible.length === 0 ? (
            <div className="empty card">No leads match these filters.</div>
          ) : (
            <div className="lead-list">
              {visible.map(({ business: b, score }) => (
                <LeadCard
                  key={b.key}
                  business={b}
                  onSelect={() => navigate(`/lead/${encodeURIComponent(b.key)}`)}
                  aside={
                    <div className="badges">
                      <ScoreBadge score={score} />
                      <SiteStatusBadge check={s.checks[b.key]} />
                    </div>
                  }
                  footer={
                    <p className="muted small lead-site">
                      {b.website ? displayHost(b.website) : b.instagram ? `Instagram: @${b.instagram}` : 'No website listed'}
                      {typeof s.checks[b.key] === 'object' && (s.checks[b.key] as { note?: string }).note && (
                        <> · {(s.checks[b.key] as { note?: string }).note}</>
                      )}
                    </p>
                  }
                />
              ))}
            </div>
          )}
          {res.next && mode === 'live' && (
            <button type="button" className="btn" onClick={() => run(res.next)} disabled={s.loading}>
              Load more (1 more API request)
            </button>
          )}
          <p className="muted small">{res.attribution}</p>
        </section>
      )}
    </div>
  )
}
