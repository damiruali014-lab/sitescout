import { describe, expect, it } from 'vitest'
import { osmToBusiness } from './osm'
import { resolveCategory } from './categories'

describe('OpenStreetMap mapping', () => {
  it('maps tags to a business and splits Instagram from the website', () => {
    const b = osmToBusiness(
      { type: 'node', id: 42, tags: { name: 'Reine des Ongles', 'addr:housenumber': '12', 'addr:street': 'Rue Duguesclin', 'addr:postcode': '69006', phone: '+33 4 78 26 18 50', website: 'https://www.instagram.com/reinedesongles/' } },
      'Nail salons',
      'Lyon',
    )!
    expect(b.key).toBe('osm:node/42')
    expect(b.address).toBe('12 Rue Duguesclin, 69006 Lyon')
    expect(b.website).toBeUndefined() // an Instagram link is not a website
    expect(b.instagram).toBe('@reinedesongles')
  })
  it('skips unnamed places and marks big brands as chains', () => {
    expect(osmToBusiness({ type: 'way', id: 1, tags: { shop: 'beauty' } })).toBeNull()
    expect(osmToBusiness({ type: 'way', id: 2, tags: { name: 'Yves Rocher', 'brand:wikidata': 'Q28496' } })?.branchCount).toBe(3)
  })
  it('every category has OSM tags', () => {
    expect(resolveCategory('Nail salons', 'osm').osm?.length).toBeGreaterThan(0)
    expect(resolveCategory('something custom', 'osm').osm).toBeUndefined()
  })
})
