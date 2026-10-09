import { useState } from 'react'
import type { Business, Lang } from '../../api/_lib/types'
import { apiPost } from '../lib/api'
import { setSearchState, useSearchState } from '../lib/searchStore'
import { supabase } from '../lib/supabase'
import { demoSlug, randomSuffix, slugify, templateDescription } from '../lib/templates'
import { CopyButton } from './CopyButton'
import { ExternalIcon } from './Icons'
import { LangSelect } from './LangSelect'

interface Props {
  business: Business
  live: boolean
  onPublished?: (url: string, slug: string) => void
}

/** Step 5: create a one-page demo landing page for a lead and get a shareable link. */
export function DemoPageCard({ business: b, live, onPublished }: Props) {
  const s = useSearchState()
  const [lang, setLang] = useState<Lang>(s.lang)
  const [draft, setDraft] = useState<string>()
  const [busy, setBusy] = useState<'ai' | 'publish'>()
  const [note, setNote] = useState<string>()
  const url = s.pages[b.key]

  function remember(slug: string) {
    const full = `${window.location.origin}/p/${slug}`
    setSearchState((st) => ({ pages: { ...st.pages, [b.key]: full } }))
    onPublished?.(full, slug)
  }

  async function writeWithAi() {
    setBusy('ai')
    setNote(undefined)
    try {
      const { description } = await apiPost<{ description: string }>('/api/describe', { business: b, lang })
      setDraft(description)
    } catch (e) {
      setDraft(templateDescription(b, lang))
      setNote(`AI unavailable (${(e as Error).message}) — used a template instead. Edit it as you like.`)
    } finally {
      setBusy(undefined)
    }
  }

  async function publish() {
    if (!supabase || !draft) return
    setBusy('publish')
    setNote(undefined)
    const slug = `${slugify(b.name) || 'business'}-${randomSuffix()}`
    const { error } = await supabase.from('demo_pages').insert({
      slug,
      source: b.source,
      source_id: b.sourceId,
      lang,
      description: draft.trim().slice(0, 600),
    })
    setBusy(undefined)
    if (error) setNote(`Could not publish: ${error.message}`)
    else remember(slug)
  }

  if (!live) {
    // Demo mode: the page is rebuilt from bundled sample data, so the link works for anyone.
    const demoUrl = `${window.location.origin}/p/${demoSlug(b, lang)}`
    return (
      <section className="card stack-sm" aria-labelledby="demo-page-h">
        <div className="row">
          <h2 id="demo-page-h">Demo landing page</h2>
          <span className="spacer" />
          <LangSelect value={lang} onChange={setLang} />
        </div>
        <p className="muted small">A one-page site with name, category, address, hours, phone, rating, a short description and a call-to-action.</p>
        <p className="quote">{templateDescription(b, lang)}</p>
        <div className="row">
          <a className="btn btn-primary" href={demoUrl} target="_blank" rel="noreferrer" onClick={() => remember(demoSlug(b, lang))}>
            <ExternalIcon size={14} /> Open demo page
          </a>
          <CopyButton text={demoUrl} label="Copy link" />
        </div>
      </section>
    )
  }

  return (
    <section className="card stack-sm" aria-labelledby="demo-page-h">
      <div className="row">
        <h2 id="demo-page-h">Demo landing page</h2>
        <span className="spacer" />
        <LangSelect value={lang} onChange={setLang} />
      </div>
      {url && (
        <div className="banner">
          <span className="link-line">
            Published: <a href={url} target="_blank" rel="noreferrer">{url.replace(/^https?:\/\//, '')}</a>
          </span>
          <CopyButton text={url} label="Copy link" />
        </div>
      )}
      {draft === undefined ? (
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={writeWithAi} disabled={busy === 'ai'}>
            {busy === 'ai' && <span className="spinner" />} Write description with AI
          </button>
          <button type="button" className="btn" onClick={() => setDraft(templateDescription(b, lang))}>
            Use template
          </button>
        </div>
      ) : (
        <>
          <label className="label" htmlFor="desc">
            Description (edit before publishing — only facts you know are true)
          </label>
          <textarea id="desc" className="textarea" value={draft} maxLength={600} onChange={(e) => setDraft(e.target.value)} />
          <div className="row">
            <button type="button" className="btn btn-primary" onClick={publish} disabled={busy === 'publish' || !draft.trim()}>
              {busy === 'publish' && <span className="spinner" />} {url ? 'Publish new version' : 'Publish page'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={writeWithAi} disabled={busy === 'ai'}>
              Regenerate
            </button>
          </div>
        </>
      )}
      {note && <p className="small muted">{note}</p>}
      <p className="small muted">The page shows a clear “concept preview” banner, is hidden from search engines and expires after 60 days.</p>
    </section>
  )
}
