import { afterEach, describe, expect, it, vi } from 'vitest'
import { dgisSearch } from './dgis'
import { scoreLead } from './score'

// Shape copied from a real 2GIS demo-key response (Almaty, "салон красоты") — note: no contact_groups.
const realItem = {
  id: '70000001018942310',
  name: 'Viva, салон красоты',
  name_ex: { primary: 'Viva', extension: 'салон красоты' },
  address_name: 'проспект Сейфуллина, 483',
  reviews: { general_rating: 4.8, general_review_count: 1173, org_rating: 4.3, org_review_count: 2187 },
  rubrics: [{ name: 'Парикмахерские услуги', kind: 'primary' }],
  schedule: { Mon: { working_hours: [{ from: '10:00', to: '22:00' }] } },
}

function mockFetch(calls: string[]) {
  return vi.fn(async (url: URL | string) => {
    const u = String(url)
    calls.push(u)
    if (u.includes('region/search')) return new Response(JSON.stringify({ meta: { code: 200 }, result: { items: [{ id: '67' }] } }))
    return new Response(JSON.stringify({ meta: { code: 200 }, result: { total: 5920, items: [realItem] } }))
  })
}

afterEach(() => vi.unstubAllGlobals())

describe('dgisSearch with a demo key', () => {
  it('flags hidden contacts instead of pretending there is no website', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', mockFetch(calls))
    const res = await dgisSearch('k', 'Almaty', 'салон красоты', 'en', 1)
    const b = res.results[0]
    expect(b.name).toBe('Viva')
    expect(b.rating).toBe(4.8)
    expect(b.contactsHidden).toBe(true)
    expect(res.notice).toMatch(/contact/i)
    expect(res.next).toBe('2')
    // en_KZ is not a valid 2GIS locale — English must fall back to ru_KZ
    expect(calls.find((c) => c.includes('/3.0/items'))).toContain('locale=ru_KZ')
    const s = scoreLead(b)
    expect(s.reasons[0]).toMatch(/unknown/i)
    expect(s.tier).not.toBe('hot') // unknown website must not look like a guaranteed lead
  })
})
