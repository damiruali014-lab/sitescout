import { requireOwner } from './_lib/auth.js'
import { askClaude, businessFacts, LANG_NAME } from './_lib/claude.js'
import { clientIp, error, json } from './_lib/http.js'
import { flushUsage } from './_lib/usage.js'
import { rateLimited } from './_lib/ratelimit.js'
import { cleanContent, siteGroup, templateContent } from './_lib/sitecontent.js'
import type { Business } from './_lib/types.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 25 }

const SYSTEM =
  'You write the copy for a one-page website of a small local business. Reply with ONLY a JSON object: ' +
  '{"tagline": string (max 8 words), "about": string (2 short sentences, max 45 words), ' +
  '"highlights": [{"title": string (max 4 words), "text": string (max 12 words)} x3], ' +
  '"services": string[] (4-6 short items typical for this kind of business), "cta": string (max 4 words)}. ' +
  'About and highlights must use ONLY the facts given — never invent prices, awards, years, staff or claims. ' +
  'Services are generic suggestions the owner will review. No emojis.'

/** POST { business, lang } → { content: SiteContent, source: 'ai' | 'template' } */
async function handle(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`ai:${clientIp(request)}`, 20)) return error('Too many AI requests — wait a minute.', 429)

  const body = await readJson<{ business?: Partial<Business>; lang?: string }>(request)
  const b = body?.business
  const name = cleanText(b?.name, 120)
  if (!b || !name) return error('Missing business.')
  const lang = cleanLang(body?.lang)
  const business = { ...b, name } as Business
  const fallback = templateContent(business, lang)
  const facts = businessFacts({
    name,
    category: cleanText(b.category, 80) || undefined,
    address: cleanText(b.address, 200) || undefined,
    rating: typeof b.rating === 'number' ? b.rating : undefined,
    reviews: typeof b.reviews === 'number' ? b.reviews : undefined,
    hours: Array.isArray(b.hours) ? b.hours.slice(0, 7).map((h) => cleanText(h, 60)) : undefined,
  })
  try {
    const text = await askClaude(SYSTEM, `Language: ${LANG_NAME[lang]}\nKind of business: ${siteGroup(b.category)}\n${facts}`, 600)
    const jsonText = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    return json({ content: cleanContent(JSON.parse(jsonText), fallback), source: 'ai' })
  } catch (e) {
    console.error('describe AI failed, using template', e)
    return json({ content: fallback, source: 'template' })
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    return await handle(request)
  } finally {
    await flushUsage() // record paid API calls for the Usage page
  }
}
