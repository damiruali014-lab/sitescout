import { describe, expect, it } from 'vitest'
import { phoneType, withPhoneTypes } from './phone'
import type { Business } from './types'

describe('phoneType', () => {
  it('tells French landlines from mobiles', () => {
    expect(phoneType('04 78 42 10 10', 'FR')).toBe('landline') // Lyon
    expect(phoneType('+33 6 12 34 56 78')).toBe('mobile')
  })
  it('works for Kazakhstan', () => {
    expect(phoneType('+7 701 555 0142', 'KZ')).toBe('mobile')
    expect(phoneType('+7 727 250 0000', 'KZ')).toBe('landline')
  })
  it('is unknown for junk', () => {
    expect(phoneType('123', 'FR')).toBe('unknown')
    expect(phoneType(undefined)).toBeUndefined()
  })
  it('trusts an explicit WhatsApp number', () => {
    const [b] = withPhoneTypes<Business>([{ key: 'g:1', source: 'google', sourceId: '1', name: 'X', phone: '04 78 42 10 10', whatsapp: '+33612345678' }], 'FR')
    expect(b.phoneType).toBe('mobile')
  })
})
