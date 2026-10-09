import { describe, expect, it } from 'vitest'
import { mergeBranches, normaliseName } from './dedupe'
import { scoreLead } from './score'
import type { Business } from './types'

const b = (id: string, name: string, address: string, extra: Partial<Business> = {}): Business => ({
  key: `2gis:${id}`, source: '2gis', sourceId: id, name, address, ...extra,
})

describe('mergeBranches', () => {
  it('merges branches of the same 2GIS organisation into one result (real Astana example)', () => {
    const org = { chainId: '2gis-org:70000001061804530', branchCount: 17 }
    const list = [
      b('1', 'Logovo', 'Astana, проспект Мангилик Ел, 51/2', { ...org, reviews: 2873 }),
      b('2', 'Бравый', 'Astana, проспект Туран, 46/2', { chainId: '2gis-org:7000000103', branchCount: 5 }),
      b('3', 'Logovo', 'Astana, проспект Абылай хана, 20Б', { ...org, reviews: 3248 }),
      b('4', 'Logovo', 'Astana, улица Бейбитшилик, 29', { ...org, reviews: 915 }),
    ]
    const out = mergeBranches(list)
    expect(out.map((x) => x.name)).toEqual(['Logovo', 'Бравый'])
    expect(out[0].reviews).toBe(3248) // the busiest branch represents the chain
    expect(out[0].branchCount).toBe(17)
    expect(out[0].otherAddresses).toHaveLength(2)
  })

  it('merges same-name places without an org id (Google) but keeps different names apart', () => {
    const out = mergeBranches([b('a', '„Old School” Barbershop.', 'x'), b('b', 'Old School Barbershop', 'y'), b('c', 'Barber House', 'z')])
    expect(out).toHaveLength(2)
    expect(out[0].branchCount).toBe(2)
    expect(normaliseName('„Old School” Barbershop.')).toBe('old school barbershop')
  })

  it('scores big chains lower than independent businesses', () => {
    const base = { reviews: 500, rating: 4.9, phone: '1' }
    const solo = scoreLead(b('s', 'Solo', 'a', base))
    const chain = scoreLead(b('c', 'Chain', 'a', { ...base, branchCount: 17 }))
    expect(solo.score - chain.score).toBe(15)
    expect(chain.reasons.join(' ')).toMatch(/Chain with 17 branches/)
  })
})
