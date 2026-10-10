import { describe, expect, it } from 'vitest'
import { analyseBio, classifyLink, cleanHandle } from './instagram'

describe('instagram bio analysis', () => {
  it('cleans handles and profile links', () => {
    expect(cleanHandle('@Nails.Lyon')).toBe('nails.lyon')
    expect(cleanHandle('https://www.instagram.com/nails.lyon/?hl=fr')).toBe('nails.lyon')
  })
  it('classifies links', () => {
    expect(classifyLink('https://linktr.ee/x')).toBe('link_in_bio')
    expect(classifyLink('www.planity.com/salon-x')).toBe('booking')
    expect(classifyLink('https://salon-x.fr')).toBe('own_site')
  })
  it('prefers an own website found in the bio text', () => {
    const r = analyseBio('https://linktr.ee/salonx', '💅 Lyon 3e · RDV sur salon-x.fr')
    expect(r.kind).toBe('own_site')
    expect(r.website).toBe('salon-x.fr')
  })
  it('booking page only → still a lead', () => {
    expect(analyseBio('https://www.planity.com/salon-x-69003-lyon', '').kind).toBe('booking')
    expect(analyseBio(undefined, 'Just nails, DM to book').kind).toBe('none')
  })
  it('ignores emails', () => {
    expect(analyseBio(undefined, 'contact: hello@salon.fr').kind).toBe('none')
  })
})
