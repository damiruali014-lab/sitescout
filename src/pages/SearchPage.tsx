import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { isEmbed } from '../lib/config'
import { CATEGORIES } from '../../api/_lib/categories'
import { COUNTRIES, findCountry, MAX_RESULTS } from '../../api/_lib/countries'
import type { Lang, Provider } from '../../api/_lib/types'
import { Combobox } from '../components/Combobox'
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
import { getSearchState, setSearchState, useSearchState, type SiteFilter, type SortKey } from '../lib/searchStore'

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c.en, hint: c.ru, group: c.group }))

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
  const country = findCountry(s.country) ?? COUNTRIES[0]
  const cityOptions = useMemo(() => country.cities.map((c) => ({ value: c })), [country])
  const navigate = useNavigate()

  // Demo mode: show sample results straight away so portfolio visitors see something on first paint.
  useEffect(() => {
    if (mode === 'demo' && !getSearchState().response && !getSearchState().error) {
      const preset = findDemoPreset(getSearchState().city, getSearchState().category) ?? DEMO_PRESETS[0]
      setSearchState({ country: preset.country, city: preset.city, category: preset.category, response: demoSearch(preset.id, getSearchState().limit), checks: {} })
    }
  }, [mode])

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
      setSearchState({ loading: false, response: demoSearch(preset.id, s.limit), checks: {} })
      return
    }
    try {
      const res = await liveSearch({ country: s.country, city: c, category: k, limit: s.limit, provider: s.provider, lang: s.lang, page })
      setSearchState((prev) => ({
        loading: false,
        response: page && prev.response ? { ...res, results: [...prev.response.results, ...res.results] } : res,
        checks: page ? prev.checks : {},
      }))
    } catch (e) {
      setSearchState({ loading: false, error: (e as Error).message })
    }
  }

  function pickCountry(code: string) {
    const next = findCountry(code)
    setSearchState({ country: code })
    // Switch to the country's first city unless the typed city already belongs to it.
    if (next && !next.cities.some((c) => c.toLowerCase() === city.trim().toLowerCase())) setCity(next.cities[0])
  }

  // Which provider will run, and roughly how many paid requests the search costs.
  const effectiveProvider = s.provider === 'auto' ? country.provider : s.provider
  const perPage = effectiveProvider === '2gis' ? 10 : 20
  const requestsNeeded = Math.ceil(s.limit / perPage)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void run()
  }

  function pickPreset(id: string) {
    const p = DEMO_PRESETS.find((x) => x.id === id)!
    setCity(p.city)
    setCategory(p.category)
    setSearchState({ country: p.country, city: p.city, category: p.category, response: demoSearch(p.id, getSearchState().limit), checks: {}, error: undefined })
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
          {!isEmbed && <p className="muted">Search a city and category, check their websites and contact the best leads.</p>}
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
          <label className="label" htmlFor="country">
            Country
          </label>
          <select id="country" className="select" value={country.code} onChange={(e) => pickCountry(e.target.value)}>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label" htmlFor="city">
            City
          </label>
          <Combobox id="city" value={city} onChange={setCity} options={cityOptions} placeholder={`e.g. ${country.cities[0]}`} required />
        </div>
        <div className="field field-wide">
          <label className="label" htmlFor="category">
            Business category
          </label>
          <Combobox id="category" value={category} onChange={setCategory} options={CATEGORY_OPTIONS} placeholder="Pick or type, e.g. barbershops" required />
        </div>
        <div className="field">
          <label className="label" htmlFor="limit">
            How many (1–{MAX_RESULTS})
          </label>
          <input
            id="limit"
            className="input"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_RESULTS}
            value={s.limit}
            onChange={(e) => setSearchState({ limit: Math.min(MAX_RESULTS, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </div>
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
        {mode === 'live' && (
          <div className="field">
            <label className="label" htmlFor="provider">
              Data source
            </label>
            <select id="provider" className="select" value={s.provider} onChange={(e) => setSearchState({ provider: e.target.value as Provider })}>
              <option value="auto">Auto ({country.provider === '2gis' ? '2GIS' : 'Google'})</option>
              <option value="google">Google Places</option>
              <option value="2gis">2GIS</option>
            </select>
          </div>
        )}
        <div className="search-actions">
          <button type="submit" className="btn btn-primary search-submit" disabled={s.loading}>
            {s.loading ? <span className="spinner" /> : <SearchIcon />} Search
          </button>
          {mode === 'live' && (
            <span className="small muted">
              ≈ {requestsNeeded} {effectiveProvider === '2gis' ? '2GIS' : 'Google'} request{requestsNeeded > 1 ? 's' : ''}
            </span>
          )}
        </div>
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
                      <SiteStatusBadge check={s.checks[b.key]} hidden={b.contactsHidden} />
                    </div>
                  }
                  footer={
                    <p className="muted small lead-site">
                      {b.website ? displayHost(b.website) : b.instagram ? `Instagram: @${b.instagram}` : b.contactsHidden ? 'Website hidden by 2GIS key' : 'No website listed'}
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
