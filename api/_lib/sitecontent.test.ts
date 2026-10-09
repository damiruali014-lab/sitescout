import { describe, expect, it } from 'vitest'
import { cleanContent, siteGroup, templateContent } from './sitecontent'
import type { Business } from './types'

const cafe: Business = {
  key: '2gis:1', source: '2gis', sourceId: '1', name: 'Bodrum coffee', category: 'Кофейни',
  address: 'Astana, улица Толе би, 52', city: 'Astana', rating: 4.9, reviews: 2917, phone: '+7 700 000 0000',
}

describe('demo website content', () => {
  it('detects the kind of business from RU/EN categories', () => {
    expect(siteGroup('Кофейни')).toBe('food')
    expect(siteGroup('Барбершопы')).toBe('beauty')
    expect(siteGroup('Language schools')).toBe('education')
    expect(siteGroup('Something else')).toBe('services')
  })

  it('builds a full, facts-only template in every language', () => {
    for (const lang of ['en', 'ru', 'kk'] as const) {
      const c = templateContent(cafe, lang)
      expect(c.highlights).toHaveLength(3)
      expect(c.services.length).toBeGreaterThanOrEqual(4)
      expect(c.highlights[0].title).toContain('4.9')
      expect(c.about).toContain('Bodrum coffee')
      expect(c.about).not.toMatch(/\d+\s?(₸|tg|\$|€)/) // never invents prices
    }
  })

  it('sanitises AI/DB output and falls back field by field', () => {
    const fb = templateContent(cafe, 'en')
    const c = cleanContent({ tagline: 'Best coffee on Tole Bi', highlights: [{ title: 'x' }], services: ['Latte', 42, ''] }, fb)
    expect(c.tagline).toBe('Best coffee on Tole Bi')
    expect(c.about).toBe(fb.about)
    expect(c.highlights[0]).toEqual({ title: 'x', text: fb.highlights[0].text })
    expect(c.highlights[2]).toEqual(fb.highlights[2])
    expect(c.services).toEqual(['Latte'])
    expect(cleanContent(null, fb)).toEqual(fb)
  })
})
