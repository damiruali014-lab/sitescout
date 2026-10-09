import { requireOwner } from './_lib/auth.js'
import { askClaude, businessFacts, LANG_NAME } from './_lib/claude.js'
import { clientIp, error, json } from './_lib/http.js'
import { flushUsage } from './_lib/usage.js'
import { finalize, hookDetail, issueLine, templateMessage, type Channel } from './_lib/outreach.js'
import { rateLimited } from './_lib/ratelimit.js'
import type { Business, SiteCheck } from './_lib/types.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 25 }

const CHANNEL_HINT: Record<Channel, string> = {
  whatsapp: 'a WhatsApp message (max 60 words, plain text, no subject)',
  instagram: 'an Instagram direct message (max 50 words, plain text, no subject)',
  email: 'an email (max 90 words). First line must be "Subject: …", then a blank line, then the body. Do not add a signature.',
}

/** POST { business, check?, lang, channel, link } → { subject?, body, source: 'ai'|'template' } */
async function handle(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`ai:${clientIp(request)}`, 20)) return error('Too many AI requests — wait a minute.', 429)

  const body = await readJson<{ business?: Business; check?: SiteCheck; lang?: string; channel?: string; link?: string }>(request)
  const b = body?.business
  if (!b || !cleanText(b.name, 120)) return error('Missing business.')
  const lang = cleanLang(body?.lang)
  const channel: Channel = body?.channel === 'email' || body?.channel === 'instagram' ? body.channel : 'whatsapp'
  const link = cleanText(body?.link, 300)
  if (!/^https:\/\/\S+$/.test(link)) return error('Publish a demo page first — the message needs its link.')
  const check = body?.check?.status ? body.check : undefined

  const system =
    `You write a short, personal first message from Damir, a freelance web developer, to the owner of a small local business. ` +
    `Write ${CHANNEL_HINT[channel]} in ${LANG_NAME[lang]}. Tone: friendly, respectful, no pressure, no hype, no emojis. ` +
    `Mention exactly this specific detail: "${hookDetail(b, lang)}". State the website problem plainly. ` +
    `Include this link exactly once: ${link} . Use ONLY the facts given; never invent anything. ` +
    `Do not add an opt-out line (it is added automatically). Output only the message.`
  const facts = businessFacts(b) + `\nWebsite problem: ${issueLine(b, check, lang)}`

  try {
    const text = await askClaude(system, facts, 350)
    let subject: string | undefined
    let msg = text
    const m = /^\s*(?:subject|тема|тақырып)\s*:\s*(.+)\n+/i.exec(text)
    if (channel === 'email' && m) {
      subject = m[1].trim()
      msg = text.slice(m[0].length)
    }
    if (!msg.includes(link)) msg += `\n${link}` // the link is the whole point — make sure it's there
    return json({ ...finalize({ subject, body: msg }, lang, channel), source: 'ai' })
  } catch (e) {
    console.error('message AI failed, using template', e)
    return json({ ...templateMessage(b, check, lang, channel, link), source: 'template' })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } finally {
    await flushUsage() // record paid API calls for the Usage page
  }
}
