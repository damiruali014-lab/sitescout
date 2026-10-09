import { describe, expect, it } from 'vitest'
import { OPT_OUT, templateMessage } from './outreach'
import type { Business } from './types'

const b: Business = { key: 'demo:x', source: 'demo', sourceId: 'x', name: 'Aru Beauty', address: 'Abai Ave 1, Almaty', rating: 4.9, reviews: 412, phone: '+7 701 555 0000' }
const link = 'https://sitescout.example/p/aru-beauty-k3x9q2'
const check = { status: 'none' as const, checkedAt: '' }

describe('templateMessage', () => {
  it.each(['en', 'ru', 'kk'] as const)('always ends with the %s opt-out line and contains the link once', (lang) => {
    const m = templateMessage(b, check, lang, 'whatsapp', link)
    expect(m.body.trim().endsWith(OPT_OUT[lang])).toBe(true)
    expect(m.body.split(link).length - 1).toBe(1)
  })

  it('mentions a specific, verifiable detail (rating + reviews)', () => {
    expect(templateMessage(b, check, 'en', 'whatsapp', link).body).toContain('4.9★ rating from 412 reviews')
  })

  it('adds a subject and signature only for email', () => {
    const email = templateMessage(b, check, 'en', 'email', link)
    const wa = templateMessage(b, check, 'en', 'whatsapp', link)
    expect(email.subject).toMatch(/Aru Beauty/)
    expect(email.body).toContain('Best regards')
    expect(wa.subject).toBeUndefined()
  })

  it('describes the actual website problem', () => {
    const m = templateMessage({ ...b, website: 'http://aru.kz' }, { status: 'no_https', url: 'http://aru.kz', checkedAt: '' }, 'en', 'instagram', link)
    expect(m.body).toContain('aru.kz opens without HTTPS')
  })
})
