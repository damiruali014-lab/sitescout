import { useState } from 'react'
import { templateMessage, type Channel, type OutreachMessage } from '../../api/_lib/outreach'
import type { Business, Lang, SiteCheck } from '../../api/_lib/types'
import { apiPost } from '../lib/api'
import { useSearchState } from '../lib/searchStore'
import { demoSlug } from '../lib/templates'
import { CopyButton } from './CopyButton'
import { ExternalIcon } from './Icons'
import { LangSelect } from './LangSelect'

interface Props {
  business: Business
  check?: SiteCheck | 'pending'
  live: boolean
  /** Called after you open WhatsApp / email / copy the message (used by the tracker) */
  onSent?: (channel: Channel) => void
}

const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'email', label: 'Email' },
]

/** Step 6: a short, personal first message with the demo-page link and an opt-out line. */
export function MessageCard({ business: b, check, live, onSent }: Props) {
  const s = useSearchState()
  const [lang, setLang] = useState<Lang>(s.lang)
  const landline = b.phoneType === 'landline' && !b.whatsapp
  const [channel, setChannel] = useState<Channel>(
    (b.instagram && (!b.phone || landline)) ? 'instagram' : landline && b.email ? 'email' : 'whatsapp',
  )
  const [msg, setMsg] = useState<OutreachMessage & { source?: string }>()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()
  const realCheck = check && check !== 'pending' ? check : undefined
  const link = live ? s.pages[b.key] : `${window.location.origin}/p/${demoSlug(b, lang)}`

  async function generate() {
    if (!link) return
    setErr(undefined)
    if (!live) {
      setMsg({ ...templateMessage(b, realCheck, lang, channel, link), source: 'template' })
      return
    }
    setBusy(true)
    try {
      setMsg(await apiPost<OutreachMessage & { source: string }>('/api/message', { business: b, check: realCheck, lang, channel, link }))
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const full = msg ? (msg.subject ? `${msg.subject}\n\n${msg.body}` : msg.body) : ''
  const waNumber = landline ? undefined : (b.whatsapp ?? b.phone)?.replace(/\D/g, '')
  const igHandle = b.instagram?.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '')

  return (
    <section className="card stack-sm" aria-labelledby="msg-h">
      <div className="row">
        <h2 id="msg-h">Outreach message</h2>
        <span className="spacer" />
        <LangSelect value={lang} onChange={(l) => (setLang(l), setMsg(undefined))} />
      </div>
      <div className="segmented" role="group" aria-label="Channel">
        {CHANNELS.map((c) => (
          <button key={c.value} type="button" aria-pressed={channel === c.value} onClick={() => (setChannel(c.value), setMsg(undefined))}>
            {c.label}
          </button>
        ))}
      </div>

      {channel === 'whatsapp' && landline && (
        <p className="small banner" role="note">
          <strong>{b.phone}</strong> is a landline, so it can’t have WhatsApp. Call them instead
          {b.instagram || b.email ? ', or switch to Instagram / Email above' : ' — or find their Instagram'}.
        </p>
      )}
      {!link ? (
        <p className="small muted">Publish the demo page above first — the message links to it.</p>
      ) : !msg ? (
        <div>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
            {busy && <span className="spinner" />} {live ? 'Write message with AI' : 'Write message'}
          </button>
        </div>
      ) : (
        <>
          {msg.subject !== undefined && (
            <>
              <label className="label" htmlFor="msg-subject">
                Subject
              </label>
              <input id="msg-subject" className="input" value={msg.subject} onChange={(e) => setMsg({ ...msg, subject: e.target.value })} />
            </>
          )}
          <label className="label" htmlFor="msg-body">
            Message {msg.source === 'template' && live && <span className="muted">(template — AI was unavailable)</span>}
          </label>
          <textarea id="msg-body" className="textarea msg-text" rows={9} value={msg.body} onChange={(e) => setMsg({ ...msg, body: e.target.value })} />
          <div className="row">
            <CopyButton text={full} label="Copy message" className="btn btn-primary btn-sm" onCopied={() => onSent?.(channel)} />
            {channel === 'whatsapp' && waNumber && (
              <a
                className="btn btn-sm"
                href={live ? `https://wa.me/${waNumber}?text=${encodeURIComponent(full)}` : undefined}
                aria-disabled={!live}
                title={live ? 'Opens WhatsApp with the message pre-filled' : 'Disabled in Demo mode (fictional number)'}
                target="_blank"
                rel="noreferrer"
                onClick={() => live && onSent?.('whatsapp')}
              >
                <ExternalIcon size={14} /> Open WhatsApp
              </a>
            )}
            {channel === 'email' && b.email && (
              <a
                className="btn btn-sm"
                href={live ? `mailto:${b.email}?subject=${encodeURIComponent(msg.subject ?? '')}&body=${encodeURIComponent(msg.body)}` : undefined}
                aria-disabled={!live}
                onClick={() => live && onSent?.('email')}
              >
                <ExternalIcon size={14} /> Open email
              </a>
            )}
            {channel === 'instagram' && igHandle && live && (
              <a className="btn btn-sm" href={`https://instagram.com/${igHandle}`} target="_blank" rel="noreferrer">
                <ExternalIcon size={14} /> Open Instagram
              </a>
            )}
            <button type="button" className="btn btn-ghost btn-sm" onClick={generate} disabled={busy}>
              {busy && <span className="spinner" />} Rewrite
            </button>
          </div>
          <p className="small muted">You send it yourself — SiteScout never messages anyone automatically. The opt-out line is always included.</p>
        </>
      )}
      {err && <p className="small banner banner-error">{err}</p>}
    </section>
  )
}
