import { afterEach, describe, expect, it, vi } from 'vitest'
import { googleSearch } from './google'

afterEach(() => vi.unstubAllGlobals())

describe('googleSearch paging', () => {
  it('fetches up to 3 pages of 20 until the limit, with country bias', async () => {
    const bodies: Record<string, unknown>[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) => {
        const body = JSON.parse(String(init.body))
        bodies.push(body)
        const n = bodies.length
        const places = Array.from({ length: body.pageSize }, (_, i) => ({ id: `p${n}-${i}`, displayName: { text: `Place ${n}-${i}` } }))
        return new Response(JSON.stringify({ places, nextPageToken: n < 3 ? `tok${n}` : undefined }))
      }),
    )
    const res = await googleSearch('k', { city: 'Kraków', category: 'dentists', lang: 'en', limit: 45, countryName: 'Poland', regionCode: 'PL' })
    expect(res.results).toHaveLength(45)
    expect(res.requests).toBe(3)
    expect(bodies.map((b) => b.pageSize)).toEqual([20, 20, 5])
    expect(bodies[0].textQuery).toBe('dentists in Kraków, Poland')
    expect(bodies[0].regionCode).toBe('pl')
    expect(bodies[1].pageToken).toBe('tok1')
  })

  it('uses a single cheap request for small limits', async () => {
    const fetchMock = vi.fn(async (_u: string, init: RequestInit) => {
      const { pageSize } = JSON.parse(String(init.body))
      const places = Array.from({ length: pageSize }, (_, i) => ({ id: `a${i}` }))
      return new Response(JSON.stringify({ places, nextPageToken: 't' }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const res = await googleSearch('k', { city: 'Berlin', category: 'cafes', lang: 'en', limit: 5 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(res.requests).toBe(1)
    expect(res.results).toHaveLength(5)
    expect(res.next).toBe('t')
  })
})
