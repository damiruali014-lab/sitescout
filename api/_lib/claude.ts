import { env } from './http.js'

/**
 * Minimal Claude Messages API call (no SDK — one fetch). Defaults to the cheapest model.
 * Prompts are kept short on purpose: a description or message costs a fraction of a cent.
 */
export async function askClaude(system: string, user: string, maxTokens = 300): Promise<string> {
  const key = env('ANTHROPIC_API_KEY')
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set on the server.')
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env('ANTHROPIC_MODEL') ?? 'claude-haiku-5-5',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
    signal: AbortSignal.timeout(20_000),
  })
  const data = (await res.json().catch(() => ({}))) as {
    content?: { type: string; text?: string }[]
    error?: { message?: string }
  }
  if (!res.ok) throw new Error(`Claude API: ${data.error?.message ?? res.status}`)
  const text = (data.content ?? []).filter((c) => c.type === 'text').map((c) => c.text).join('').trim()
  if (!text) throw new Error('Claude returned an empty answer.')
  return text
}

export const LANG_NAME = { en: 'English', ru: 'Russian', kk: 'Kazakh' } as const

/** Only the facts we actually have — the model is told not to invent anything else. */
export function businessFacts(b: {
  name: string
  category?: string
  address?: string
  rating?: number
  reviews?: number
  hours?: string[]
}): string {
  return [
    `Name: ${b.name}`,
    b.category && `Category: ${b.category}`,
    b.address && `Address: ${b.address}`,
    b.rating != null && `Rating: ${b.rating} from ${b.reviews ?? 0} reviews`,
    b.hours?.length && `Hours: ${b.hours.slice(0, 7).join('; ')}`,
  ]
    .filter(Boolean)
    .join('\n')
}
