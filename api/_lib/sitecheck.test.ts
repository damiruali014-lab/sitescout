import { describe, expect, it } from 'vitest'
import { checkSite, isPrivateIp } from './sitecheck'

describe('isPrivateIp (SSRF guard)', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '169.254.169.254', '100.64.0.1', '::1', 'fd00::1', '::ffff:10.0.0.1'])(
    'refuses %s',
    (ip) => expect(isPrivateIp(ip)).toBe(true),
  )
  it.each(['8.8.8.8', '93.184.216.34', '2606:4700::1111'])('allows %s', (ip) => expect(isPrivateIp(ip)).toBe(false))
})

describe('checkSite without network', () => {
  it('returns none when there is no website', async () => {
    expect((await checkSite(undefined)).status).toBe('none')
  })
  it('treats an Instagram link as no website', async () => {
    const r = await checkSite('https://instagram.com/aru.beauty')
    expect(r.status).toBe('none')
    expect(r.note).toMatch(/instagram/)
  })
  it('refuses localhost / metadata IPs', async () => {
    expect((await checkSite('http://169.254.169.254/latest/meta-data')).status).toBe('unreachable')
    expect((await checkSite('http://127.0.0.1')).note).toMatch(/refused/i)
  })
})
