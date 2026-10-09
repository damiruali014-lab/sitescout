import { useState } from 'react'
import { templateContent, type SiteContent } from '../../api/_lib/sitecontent'
import type { Business, Lang } from '../../api/_lib/types'
import { apiPost } from '../lib/api'
import { PREVIEW_KEY } from '../lib/preview'
import { setSearchState, useSearchState } from '../lib/searchStore'
import { writeLocal } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { demoSlug, randomSuffix, slugify } from '../lib/templates'
import { CopyButton } from './CopyButton'
import { DemoSite } from './DemoSite'
import { ExternalIcon } from './Icons'
import { LangSelect } from './LangSelect'

interface Props {
  business: Business
  live: boolean
  onPublished?: (url: string, slug: string) => void
}

const ATTR: Record<string, string> = { google: 'Business data © Google', '2gis': 'Business data © 2GIS', demo: 'Sample data — fictional business' }

/** Step 5 (v2): generate a full one-page demo WEBSITE for a lead, preview it, edit the copy, publish a link. */
export function DemoPageCard({ business: b, live, onPublished }: Props) {
  const s = useSearchState()
  const [lang, setLang] = useState<Lang>(s.lang)
  const [content, setContent] = useState<SiteContent | undefined>(() => (live ? undefined : templateContent(b, s.lang)))
  const [busy, setBusy] = useState<'ai' | 'publish'>()
  const [note, setNote] = useState<string>()
  const url = s.pages[b.key]
  const attribution = ATTR[b.source] ?? ''

  function remember(slug: string) {
    const full = `${window.location.origin}/p/${slug}`
    setSearchState((st) => ({ pages: { ...st.pages, [b.key]: full } }))
    onPublished?.(full, slug)
  }

  function changeLang(l: Lang) {
    setLang(l)
    // Templates switch language instantly; AI copy has to be regenerated in the new language.
    setContent(live ? undefined : templateContent(b, l))
  }

  async function generate() {
    setBusy('ai')
    setNote(undefined)
    try {
      const res = await apiPost<{ content: SiteContent; source: string }>('/api/describe', { business: b, lang })
      setContent(res.content)
      if (res.source === 'template') setNote('AI unavailable — used a template. Edit the text as you like.')
    } catch (e) {
      setContent(templateContent(b, lang))
      setNote(`AI unavailable (${(e as Error).message}) — used a template.`)
    } finally {
      setBusy(undefined)
    }
  }

  async function publish() {
    if (!supabase || !content) return
    setBusy('publish')
    setNote(undefined)
    const slug = `${slugify(b.name) || 'business'}-${randomSuffix()}`
    const { error } = await supabase.from('demo_pages').insert({
      slug,
      source: b.source,
      source_id: b.sourceId,
      lang,
      description: content.about.slice(0, 600),
      cta: content.cta.slice(0, 120),
      content,
    })
    setBusy(undefined)
    if (error)
      setNote(
        /content/.test(error.message)
          ? 'Could not publish: run supabase/migrations/003_demo_page_content.sql in Supabase first.'
          : `Could not publish: ${error.message}`,
      )
    else remember(slug)
  }

  function openFullPreview() {
    if (!content) return
    writeLocal(PREVIEW_KEY, { business: b, lang, content, attribution })
    window.open('/p/preview', '_blank', 'noopener')
  }

  const patch = (p: Partial<SiteContent>) => setContent((c) => (c ? { ...c, ...p } : c))
  const demoUrl = `${window.location.origin}/p/${demoSlug(b, lang)}`

  return (
    <section className="card stack-sm" aria-labelledby="demo-page-h">
      <div className="row">
        <h2 id="demo-page-h">Demo website</h2>
        <span className="spacer" />
        <LangSelect value={lang} onChange={changeLang} />
      </div>
      <p className="muted small">
        A complete one-page website for this business — hero, why-us, about, services, reviews, hours, location and a booking button — with
        its own link to send to the owner.
      </p>

      {url && (
        <div className="banner">
          <span className="link-line">
            Published:{' '}
            <a href={url} target="_blank" rel="noreferrer">
              {url.replace(/^https?:\/\//, '')}
            </a>
          </span>
          <CopyButton text={url} label="Copy link" />
        </div>
      )}

      {!content ? (
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={generate} disabled={busy === 'ai'}>
            {busy === 'ai' && <span className="spinner" />} Generate website with AI
          </button>
          <button type="button" className="btn" onClick={() => setContent(templateContent(b, lang))}>
            Use template
          </button>
        </div>
      ) : (
        <>
          <div className="preview-frame" aria-label="Website preview">
            <div className="preview-chrome">
              <i />
              <i />
              <i />
              <span>{url ? url.replace(/^https?:\/\//, '') : live ? 'preview — not published yet' : demoUrl.replace(/^https?:\/\//, '')}</span>
            </div>
            <div className="preview-scroll">
              <DemoSite business={b} lang={lang} content={content} attribution={attribution} inert embedded />
            </div>
          </div>

          <div className="row">
            {live ? (
              <>
                <button type="button" className="btn btn-primary" onClick={publish} disabled={busy === 'publish'}>
                  {busy === 'publish' && <span className="spinner" />} {url ? 'Publish new version' : 'Publish website'}
                </button>
                <button type="button" className="btn" onClick={openFullPreview}>
                  <ExternalIcon size={14} /> Full-screen preview
                </button>
                <button type="button" className="btn btn-ghost" onClick={generate} disabled={busy === 'ai'}>
                  {busy === 'ai' && <span className="spinner" />} Regenerate
                </button>
              </>
            ) : (
              <>
                <a className="btn btn-primary" href={demoUrl} target="_blank" rel="noreferrer" onClick={() => remember(demoSlug(b, lang))}>
                  <ExternalIcon size={14} /> Open full website
                </a>
                <CopyButton text={demoUrl} label="Copy link" />
              </>
            )}
          </div>

          <details className="stack-sm">
            <summary className="small">Edit the text (check services against their Instagram / 2GIS — only publish what's true)</summary>
            <div className="builder-fields">
              <label className="label" htmlFor="f-tagline">
                Tagline
              </label>
              <input id="f-tagline" className="input" value={content.tagline} maxLength={120} onChange={(e) => patch({ tagline: e.target.value })} />
              <label className="label" htmlFor="f-about">
                About
              </label>
              <textarea id="f-about" className="textarea" value={content.about} maxLength={600} onChange={(e) => patch({ about: e.target.value })} />
              <span className="label">Why us (3 highlights)</span>
              {content.highlights.map((h, i) => (
                <div key={i} className="hl-row">
                  <input
                    className="input"
                    aria-label={`Highlight ${i + 1} title`}
                    value={h.title}
                    maxLength={60}
                    onChange={(e) => patch({ highlights: content.highlights.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })}
                  />
                  <input
                    className="input"
                    aria-label={`Highlight ${i + 1} text`}
                    value={h.text}
                    maxLength={160}
                    onChange={(e) => patch({ highlights: content.highlights.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })}
                  />
                </div>
              ))}
              <label className="label" htmlFor="f-services">
                Services (one per line)
              </label>
              <textarea
                id="f-services"
                className="textarea"
                value={content.services.join('\n')}
                onChange={(e) => patch({ services: e.target.value.split('\n').slice(0, 8) })}
              />
              <label className="label" htmlFor="f-cta">
                Button text
              </label>
              <input id="f-cta" className="input" value={content.cta} maxLength={40} onChange={(e) => patch({ cta: e.target.value })} />
            </div>
          </details>
        </>
      )}
      {note && <p className="small muted">{note}</p>}
      <p className="small muted">Every page shows a clear “concept preview” banner, is hidden from search engines and expires after 60 days.</p>
    </section>
  )
}
