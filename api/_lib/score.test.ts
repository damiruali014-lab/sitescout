import { describe, expect, it } from 'vitest'
import { scoreLead } from './score'
import type { Business } from './types'

const base: Business = { key: 'demo:x', source: 'demo', sourceId: 'x', name: 'X', phone: '+7 700 555 0000' }
const at = new Date().toISOString()

describe('scoreLead', () => {
  it('ranks a loved business with no website as a top (hot) lead', () => {
    const s = scoreLead({ ...base, rating: 4.9, reviews: 412 }, { status: 'none', checkedAt: at })
    expect(s.score).toBe(100)
    expect(s.tier).toBe('hot')
  })

  it('ranks a business with a good website low', () => {
    const s = scoreLead({ ...base, website: 'https://x.kz', rating: 4.6, reviews: 341 }, { status: 'ok', checkedAt: at })
    expect(s.tier).toBe('cold')
    expect(s.reasons).toContain('Already has a good website')
  })

  it('orders website problems: none > unreachable > no HTTPS > not mobile > ok', () => {
    const order = (['none', 'unreachable', 'no_https', 'no_viewport', 'ok'] as const).map(
      (status) => scoreLead({ ...base, rating: 4.5, reviews: 50 }, { status, checkedAt: at }).score,
    )
    expect([...order].sort((a, b) => b - a)).toEqual(order)
  })

  it('treats a missing website as "none" even before checking', () => {
    expect(scoreLead({ ...base }).reasons[0]).toBe('No website')
  })

  it('penalises businesses you cannot contact', () => {
    const withPhone = scoreLead({ ...base }).score
    const noContact = scoreLead({ ...base, phone: undefined }).score
    expect(withPhone - noContact).toBe(10)
  })

  it('never goes above 100 or below 0', () => {
    const s = scoreLead({ ...base, rating: 5, reviews: 1e6, instagram: 'x' }, { status: 'none', checkedAt: at })
    expect(s.score).toBeLessThanOrEqual(100)
    expect(scoreLead({ ...base, phone: undefined, website: 'x' }, { status: 'ok', checkedAt: at }).score).toBeGreaterThanOrEqual(0)
  })
})

import { resolveCategory } from './categories'
describe('resolveCategory', () => {
  it('uses exact 2GIS rubrics and Google types for known categories', () => {
    expect(resolveCategory('Language schools', '2gis')).toEqual({ q: 'языковые курсы', rubricId: '675' })
    expect(resolveCategory('Barbershops', 'google')).toEqual({ q: 'Barbershops', includedType: 'barber_shop' })
    expect(resolveCategory('барбершоп', '2gis').rubricId).toBe('110998')
  })
  it('passes custom text through unchanged, with no type filter', () => {
    expect(resolveCategory('  yurt rentals ', '2gis')).toEqual({ q: 'yurt rentals' })
  })
})
