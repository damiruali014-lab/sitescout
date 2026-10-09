import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { cleanContent, templateContent, type SiteContent } from '../../api/_lib/sitecontent'
import type { Business, Lang } from '../../api/_lib/types'
import { DemoSite } from '../components/DemoSite'
import { demoBusiness } from '../lib/demoData'
import { t } from '../lib/i18n'
import { PREVIEW_KEY } from '../lib/preview'
import { readLocal } from '../lib/storage'
import { supabase } from '../lib/supabase'
import { parseDemoSlug } from '../lib/templates'

interface PageData {
  business: Business
  lang: Lang
  content: SiteContent
  attribution: string
  isSample: boolean
}

/** Pages that never hit the API: Demo-mode samples and my unpublished full-screen preview. */
function localPage(slug: string): PageData | null {
  if (slug === 'preview') {
    const p = readLocal<Omit<PageData, 'isSample'> | null>(PREVIEW_KEY, null)
    return p ? { ...p, isSample: p.business.source === 'demo' } : null
  }
  const demo = parseDemoSlug(slug)
  const found = demo && demoBusiness(demo.sourceId)
  if (!demo || !found) return null
  const { site: _site, ...b } = found
  return { business: b, lang: demo.lang, content: templateContent(b, demo.lang), attribution: 'Sample data — fictional business', isSample: true }
}

/**
 * Public demo website at /p/:slug — what the business owner sees.
 * Real slugs load my saved copy + live business details from /api/page.
 */
export function DemoLanding() {
  const { slug = '' } = useParams()
  const isLocal = slug === 'preview' || Boolean(parseDemoSlug(slug))
  const local = useMemo(() => (isLocal ? localPage(slug) : null), [slug, isLocal])
  const [remote, setRemote] = useState<{ slug: string; data?: PageData; error?: string }>()

  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex, nofollow'
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  useEffect(() => {
    if (isLocal) return
    let cancelled = false
    ;(async () => {
      // When I open my own page while logged in, don't count it as an owner view.
      const session = supabase ? (await supabase.auth.getSession()).data.session : null
      const res = await fetch(`/api/page?slug=${encodeURIComponent(slug)}`, { headers: session ? { 'x-sitescout-owner': '1' } : {} })
      const json = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) return setRemote({ slug, error: json.error ?? 'notFound' })
      const business = json.business as Business
      const lang = json.page.lang as Lang
      // Pages published before the full-site builder only have a description → use it as "About".
      const content = cleanContent(json.page.content, templateContent(business, lang, json.page.description))
      setRemote({ slug, data: { business, lang, content, attribution: json.attribution, isSample: false } })
    })().catch(() => !cancelled && setRemote({ slug, error: 'notFound' }))
    return () => {
      cancelled = true
    }
  }, [slug, isLocal])

  const data = isLocal ? local : remote?.slug === slug ? (remote.data ?? null) : null
  const failed = isLocal ? (local ? undefined : 'notFound') : remote?.slug === slug ? remote.error : undefined

  useEffect(() => {
    if (data) document.title = `${data.business.name} — ${t(data.lang, 'previewBadge')}`
  }, [data])

  if (failed) return <div className="landing-empty">{failed === 'notFound' ? t('en', 'notFound') : failed}</div>
  if (!data) return <div className="landing-empty">{t('en', 'loading')}</div>

  return <DemoSite business={data.business} lang={data.lang} content={data.content} attribution={data.attribution} inert={data.isSample} />
}
