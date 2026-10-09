import { requireOwner } from './_lib/auth.js'
import { businessFacts, askClaude, LANG_NAME } from './_lib/claude.js'
import { clientIp, error, json } from './_lib/http.js'
import { rateLimited } from './_lib/ratelimit.js'
import type { Business } from './_lib/types.js'
import { cleanLang, cleanText, readJson } from './_lib/validate.js'

export const config = { maxDuration: 25 }

const SYSTEM =
  'You write copy for a one-page website of a small local business. ' +
  'Write 2 short sentences (max 45 words) that a customer would find useful and warm. ' +
  'Use ONLY the facts given. Never invent services, prices, staff, awards, years or claims. ' +
  'No emojis, no hashtags, no quotes. Output only the text.'

/** POST { business, lang } → { description } */
export async function POST(request: Request): Promise<Response> {
  const denied = await requireOwner(request)
  if (denied) return denied
  if (rateLimited(`ai:${clientIp(request)}`, 20)) return error('Too many AI requests — wait a minute.', 429)

  const body = await readJson<{ business?: Partial<Business>; lang?: string }>(request)
  const b = body?.business
  const name = cleanText(b?.name, 120)
  if (!name) return error('Missing business.')
  const lang = cleanLang(body?.lang)
  const facts = businessFacts({
    name,
    category: cleanText(b?.category, 80) || undefined,
    address: cleanText(b?.address, 200) || undefined,
    rating: typeof b?.rating === 'number' ? b.rating : undefined,
    reviews: typeof b?.reviews === 'number' ? b.reviews : undefined,
  })
  try {
    const description = await askClaude(SYSTEM, `Language: ${LANG_NAME[lang]}\n${facts}`, 200)
    return json({ description: description.slice(0, 600) })
  } catch (e) {
    return error((e as Error).message, 502)
  }
}
