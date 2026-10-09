import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { accessToken } from '../lib/supabase'
import { useMode } from '../lib/modeContext'

interface Quota {
  sku: string
  label: string
  provider: 'google' | '2gis'
  limit: number
  used: number
  period: 'month' | 'key'
  pricePer1000: number
}
interface UsageData {
  month: string
  quotas: Quota[]
  claudeRequests: number
  daily: Record<string, Record<string, number>>
}

const SERIES = [
  { key: 'google', label: 'Google', var: '--series-1' },
  { key: '2gis', label: '2GIS', var: '--series-2' },
  { key: 'claude', label: 'Claude', var: '--series-3' },
] as const

const CLAUDE_COST_PER_REQUEST = 0.0003 // Haiku, ~500 tokens in / ~400 out — an estimate

/** Fictional numbers so portfolio visitors can see the page in Demo mode. */
function sampleUsage(): UsageData {
  const daily: UsageData['daily'] = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)
    const wave = Math.max(0, Math.round(6 + 5 * Math.sin(i / 3)))
    daily[d] = { google: wave + (i % 4), '2gis': Math.round(wave * 1.4), claude: i % 3 }
  }
  return {
    month: new Date().toISOString().slice(0, 7),
    quotas: [
      { sku: 'google.text_search', label: 'Google · Text Search (Enterprise)', provider: 'google', limit: 1000, used: 184, period: 'month', pricePer1000: 35 },
      { sku: 'google.details_pro', label: 'Google · Place Details (Pro)', provider: 'google', limit: 5000, used: 412, period: 'month', pricePer1000: 17 },
      { sku: 'google.details_enterprise', label: 'Google · Place Details (Enterprise)', provider: 'google', limit: 1000, used: 63, period: 'month', pricePer1000: 20 },
      { sku: '2gis.items', label: '2GIS · Places API (demo key)', provider: '2gis', limit: 1000, used: 871, period: 'key', pricePer1000: 0 },
      { sku: '2gis.regions', label: '2GIS · Regions API (demo key)', provider: '2gis', limit: 1000, used: 37, period: 'key', pricePer1000: 0 },
    ],
    claudeRequests: 58,
    daily,
  }
}

export function UsagePage() {
  const { mode } = useMode()
  const live = mode === 'live'
  const [data, setData] = useState<UsageData>()
  const [error, setError] = useState<string>()
  const [asTable, setAsTable] = useState(false)

  useEffect(() => {
    if (!live) return
    let cancelled = false
    ;(async () => {
      const token = await accessToken()
      const res = await fetch('/api/usage', { headers: token ? { authorization: `Bearer ${token}` } : {} })
      const json = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) setError(json.error ?? `Request failed (${res.status})`)
      else setData(json)
    })().catch((e) => !cancelled && setError(String(e)))
    return () => {
      cancelled = true
    }
  }, [live])

  const shown = live ? data : sampleUsage()

  return (
    <div className="stack usage">
      <div className="page-head">
        <div>
          <h1>API usage</h1>
          <p className="muted">How much of each free allowance SiteScout has used — counted by the app, request by request.</p>
        </div>
      </div>

      {!live && (
        <div className="banner" role="note">
          <span>
            <strong>Demo mode</strong> — sample numbers. <Link to="/login">Log in</Link> to see your real usage.
          </span>
        </div>
      )}
      {error && <div className="banner banner-error">{error}</div>}
      {live && !data && !error && <div className="empty">Loading…</div>}

      {shown && (
        <>
          <div className="meter-grid">
            {shown.quotas.map((q) => (
              <MeterCard key={q.sku} q={q} />
            ))}
            <div className="card meter-card">
              <div className="meter-head">
                <span className="series-dot" style={{ background: 'var(--series-3)' }} aria-hidden="true" />
                <h3>Claude · AI copy</h3>
              </div>
              <p className="meter-value">
                {shown.claudeRequests.toLocaleString()} <span className="muted small">requests this month</span>
              </p>
              <p className="small muted">≈ ${(shown.claudeRequests * CLAUDE_COST_PER_REQUEST).toFixed(3)} · pay-as-you-go, no free allowance</p>
            </div>
          </div>

          <section className="card stack-sm" aria-labelledby="daily-h">
            <div className="row">
              <h2 id="daily-h">Requests per day</h2>
              <span className="spacer" />
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAsTable((v) => !v)}>
                {asTable ? 'Show chart' : 'Show as table'}
              </button>
            </div>
            <div className="legend" aria-label="Legend">
              {SERIES.map((s) => (
                <span key={s.key} className="legend-item">
                  <span className="series-dot" style={{ background: `var(${s.var})` }} aria-hidden="true" /> {s.label}
                </span>
              ))}
            </div>
            {asTable ? <DailyTable daily={shown.daily} /> : <DailyChart daily={shown.daily} />}
          </section>

          <p className="small muted">
            These are SiteScout's own counts. Calls made outside the app (or before usage tracking was added) aren't included — check the
            official numbers in{' '}
            <a href="https://console.cloud.google.com/google/maps-apis/quotas" target="_blank" rel="noreferrer">
              Google Cloud → Maps quotas
            </a>{' '}
            and{' '}
            <a href="https://platform.2gis.ru" target="_blank" rel="noreferrer">
              2GIS Platform Manager
            </a>
            . Google allowances reset on the 1st of each month; 2GIS demo-key limits last for the key's lifetime (1 month).
          </p>
        </>
      )}
    </div>
  )
}

function MeterCard({ q }: { q: Quota }) {
  const pct = q.limit ? Math.min(100, (q.used / q.limit) * 100) : 0
  const left = Math.max(0, q.limit - q.used)
  const over = Math.max(0, q.used - q.limit)
  const status = pct >= 100 ? { label: 'Limit reached', tone: 'badge-bad' } : pct >= 80 ? { label: `${Math.round(pct)}% used`, tone: 'badge-warn' } : null
  const seriesVar = q.provider === 'google' ? '--series-1' : '--series-2'
  return (
    <div className="card meter-card">
      <div className="meter-head">
        <span className="series-dot" style={{ background: `var(${seriesVar})` }} aria-hidden="true" />
        <h3>{q.label}</h3>
      </div>
      <p className="meter-value">
        {left.toLocaleString()} <span className="muted small">left of {q.limit.toLocaleString()}</span>
      </p>
      <div
        className="meter-track"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={q.limit}
        aria-valuenow={q.used}
        aria-label={`${q.label}: ${q.used} of ${q.limit} used`}
        style={{ ['--fill' as string]: `var(${seriesVar})` }}
      >
        <span className="meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="row small muted">
        <span>
          {q.used.toLocaleString()} used {q.period === 'month' ? 'this month' : 'on this key'}
        </span>
        <span className="spacer" />
        {status && (
          <span className={`badge ${status.tone}`}>
            {pct >= 100 ? '⛔' : '⚠'} {status.label}
          </span>
        )}
      </div>
      {over > 0 && q.pricePer1000 > 0 && <p className="small">≈ ${((over / 1000) * q.pricePer1000).toFixed(2)} beyond the free tier</p>}
    </div>
  )
}

function lastDays(n: number): string[] {
  return Array.from({ length: n }, (_, i) => new Date(Date.now() - (n - 1 - i) * 864e5).toISOString().slice(0, 10))
}

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 560px)').matches)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 560px)')
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

function DailyChart({ daily }: { daily: UsageData['daily'] }) {
  // Phones get the last 14 days in a taller, phone-shaped chart so bars and labels stay readable.
  const narrow = useNarrow()
  const n = narrow ? 14 : 30
  const days = useMemo(() => lastDays(n), [n])
  const [hover, setHover] = useState<number>()
  const totals = days.map((d) => SERIES.reduce((s, x) => s + (daily[d]?.[x.key] ?? 0), 0))
  const max = Math.max(4, ...totals)
  const niceMax = Math.ceil(max / 4) * 4
  const W = narrow ? 320 : 600
  const H = narrow ? 220 : 200
  const padL = 28
  const padB = 22
  const plotW = W - padL - 4
  const plotH = H - padB - 8
  const slot = plotW / days.length
  const barW = Math.max(4, slot - 4)
  const y = (v: number) => 8 + plotH - (v / niceMax) * plotH
  const ticks = [0, niceMax / 2, niceMax]

  return (
    <div className="chart-wrap" onMouseLeave={() => setHover(undefined)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Paid API requests per day for the last 30 days, stacked by provider">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - 4} y1={y(t)} y2={y(t)} className="grid" />
            <text x={padL - 6} y={y(t) + 3} className="tick" textAnchor="end">
              {t}
            </text>
          </g>
        ))}
        {days.map((d, i) => {
          let acc = 0
          const x = padL + i * slot + (slot - barW) / 2
          const parts = SERIES.map((s) => ({ s, v: daily[d]?.[s.key] ?? 0 })).filter((p) => p.v > 0)
          return (
            <g key={d} onMouseEnter={() => setHover(i)}>
              {/* invisible hit area bigger than the bar */}
              <rect x={padL + i * slot} y={8} width={slot} height={plotH} fill="transparent" />
              {parts.map((p, j) => {
                const y0 = y(acc)
                acc += p.v
                const y1 = y(acc)
                const top = j === parts.length - 1
                const h = Math.max(0, y0 - y1 - (j > 0 ? 2 : 0)) // 2px surface gap above the segment below
                return <rect key={p.s.key} x={x} y={y1} width={barW} height={h} rx={top ? 2 : 0} style={{ fill: `var(${p.s.var})` }} opacity={hover === undefined || hover === i ? 1 : 0.45} />
              })}
            </g>
          )
        })}
        {[0, Math.floor((n - 1) / 2), n - 1].map((i) => (
          <text key={i} x={padL + i * slot + slot / 2} y={H - 6} className="tick" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
            {days[i].slice(5)}
          </text>
        ))}
      </svg>
      {hover !== undefined && (
        <div className="chart-tip" style={{ left: `${((padL + hover * slot + slot / 2) / W) * 100}%` }} role="status">
          <strong>{days[hover]}</strong>
          {SERIES.map((s) => (
            <span key={s.key}>
              <span className="series-dot" style={{ background: `var(${s.var})` }} aria-hidden="true" /> {s.label}: {daily[days[hover]]?.[s.key] ?? 0}
            </span>
          ))}
          <span className="muted">Total: {totals[hover]}</span>
        </div>
      )}
    </div>
  )
}

function DailyTable({ daily }: { daily: UsageData['daily'] }) {
  const days = lastDays(30).reverse()
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Day</th>
            {SERIES.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <td>{d}</td>
              {SERIES.map((s) => (
                <td key={s.key}>{daily[d]?.[s.key] ?? 0}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
