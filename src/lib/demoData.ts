import type { Business, SearchResponse, SiteCheck, SiteStatus } from '../../api/_lib/types'

/**
 * Demo mode dataset — FICTIONAL businesses (invented names, 555 phone numbers) on real streets,
 * so portfolio visitors can try the whole flow without keys, login or real API calls.
 */
export interface DemoPreset {
  id: string
  city: string
  category: string
  label: string
  businesses: (Business & { site: Omit<SiteCheck, 'checkedAt'> })[]
}

const WEEK_STD = ['Mon–Fri: 09:00–20:00', 'Sat: 10:00–18:00', 'Sun: Closed']
const WEEK_LONG = ['Mon–Sun: 09:00–21:00']
const WEEK_CAFE = ['Mon–Fri: 07:30–22:00', 'Sat–Sun: 09:00–23:00']
const WEEK_DENT = ['Mon–Fri: 08:00–19:00', 'Sat: 09:00–14:00', 'Sun: Closed']

type Row = [
  name: string,
  category: string,
  address: string,
  phone: string | undefined,
  rating: number | undefined,
  reviews: number | undefined,
  website: string | undefined,
  status: SiteStatus,
  note: string | undefined,
  hours: string[],
  instagram?: string,
]

function build(prefix: string, city: string, rows: Row[]): DemoPreset['businesses'] {
  return rows.map(([name, category, address, phone, rating, reviews, website, status, note, hours, instagram], i) => {
    const id = `${prefix}-${i + 1}`
    return {
      key: `demo:${id}`,
      source: 'demo',
      sourceId: id,
      name,
      category,
      address: `${address}, ${city}`,
      phone,
      rating,
      reviews,
      website,
      instagram,
      hours,
      city,
      site: {
        status,
        url: website,
        finalUrl: status === 'ok' || status === 'no_viewport' ? website : undefined,
        note,
        ms: status === 'unreachable' ? 5000 : status === 'none' ? undefined : 300 + ((i * 137) % 900),
        httpStatus: status === 'unreachable' || status === 'none' ? undefined : 200,
      },
    }
  })
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    id: 'almaty-beauty',
    city: 'Almaty',
    category: 'Beauty salons',
    label: 'Beauty salons, Almaty',
    businesses: build('alm', 'Almaty', [
      ['Aru Beauty Studio', 'Beauty salon', 'Abylai Khan Ave 58', '+7 701 555 0142', 4.9, 412, undefined, 'none', 'Only an Instagram profile', WEEK_LONG, 'aru.beauty.studio'],
      ['Salon Zhibek', 'Beauty salon', 'Dostyk Ave 89', '+7 707 555 0187', 4.7, 268, 'http://zhibek-salon.kz', 'no_https', 'Site only works over plain http://', WEEK_STD],
      ['Nail Bar Shugyla', 'Nail salon', 'Tole Bi St 104', '+7 702 555 0119', 4.8, 197, undefined, 'none', undefined, WEEK_LONG, 'shugyla.nails'],
      ['Grace Hair & Spa', 'Hair salon', 'Al-Farabi Ave 77/8', '+7 727 555 0164', 4.6, 341, 'https://gracespa-almaty.kz', 'ok', 'HTTPS + mobile viewport', WEEK_STD],
      ['Barbershop Tumar', 'Barber shop', 'Zhibek Zholy St 50', '+7 705 555 0133', 4.8, 156, 'https://tumar-barber.kz', 'no_viewport', 'No viewport meta tag — not mobile-friendly', WEEK_LONG],
      ['Lash & Brow Ainur', 'Beauty salon', 'Satpaev St 30A', '+7 708 555 0171', 4.5, 64, undefined, 'none', undefined, WEEK_STD],
      ['Studio Marzhan', 'Beauty salon', 'Gogol St 86', '+7 701 555 0108', 4.2, 38, 'http://marzhan-studio.kz', 'unreachable', 'No response within 5 s', WEEK_STD],
      ['Belle Époque Almaty', 'Beauty salon', 'Kabanbay Batyr St 122', '+7 727 555 0150', 4.4, 129, 'https://belle-almaty.kz', 'ok', 'HTTPS + mobile viewport', WEEK_STD],
      ['Kokem Cosmetology', 'Cosmetologist', 'Zheltoksan St 115', undefined, 3.9, 21, undefined, 'none', undefined, WEEK_STD],
      ['Silk Hair Lab', 'Hair salon', 'Nauryzbay Batyr St 31', '+7 747 555 0126', 4.7, 88, 'https://silkhairlab.kz', 'no_viewport', 'No viewport meta tag — not mobile-friendly', WEEK_LONG],
    ]),
  },
  {
    id: 'krakow-dentists',
    city: 'Kraków',
    category: 'Dentists',
    label: 'Dentists, Kraków',
    businesses: build('krk', 'Kraków', [
      ['Gabinet Stomatologiczny Wawel Smile', 'Dentist', 'ul. Grodzka 42', '+48 12 555 01 21', 4.9, 287, undefined, 'none', undefined, WEEK_DENT],
      ['Dentica Kazimierz', 'Dental clinic', 'ul. Józefa 17', '+48 12 555 01 48', 4.8, 203, 'http://dentica-kazimierz.pl', 'no_https', 'Site only works over plain http://', WEEK_DENT],
      ['Dr. Nowak Family Dentistry', 'Dentist', 'ul. Karmelicka 25', '+48 12 555 01 77', 4.6, 119, 'https://nowak-dentysta.pl', 'no_viewport', 'No viewport meta tag — not mobile-friendly', WEEK_DENT],
      ['Smile Point Podgórze', 'Dental clinic', 'ul. Kalwaryjska 9', '+48 12 555 01 35', 4.7, 164, 'https://smilepoint-krakow.pl', 'ok', 'HTTPS + mobile viewport', WEEK_DENT],
      ['Stomatologia Rynek', 'Dentist', 'ul. Floriańska 3', '+48 12 555 01 90', 4.3, 57, 'http://stomatologia-rynek.pl', 'unreachable', 'Connection refused', WEEK_DENT],
      ['Ortho Studio Bronowice', 'Orthodontist', 'ul. Balicka 18', '+48 12 555 01 12', 4.9, 92, undefined, 'none', 'Only a Facebook page', WEEK_DENT],
      ['Dental Art Nowa Huta', 'Dentist', 'os. Centrum C 7', '+48 12 555 01 63', 4.1, 44, undefined, 'none', undefined, WEEK_DENT],
      ['Vita Dent Krowodrza', 'Dental clinic', 'ul. Królewska 57', '+48 12 555 01 84', 4.5, 138, 'https://vitadent.pl', 'ok', 'HTTPS + mobile viewport', WEEK_DENT],
    ]),
  },
  {
    id: 'astana-coffee',
    city: 'Astana',
    category: 'Coffee shops',
    label: 'Coffee shops, Astana',
    businesses: build('ast', 'Astana', [
      ['Coffee Dala', 'Coffee shop', 'Kunayev St 12/1', '+7 701 555 0211', 4.8, 523, undefined, 'none', 'Only an Instagram profile', WEEK_CAFE, 'coffeedala.ast'],
      ['Baursak & Brew', 'Café', 'Turan Ave 37', '+7 702 555 0245', 4.7, 301, 'http://baursakbrew.kz', 'no_https', 'Site only works over plain http://', WEEK_CAFE],
      ['Esil Roasters', 'Coffee roaster', 'Dostyk St 5', '+7 705 555 0278', 4.9, 188, 'https://esilroasters.kz', 'ok', 'HTTPS + mobile viewport', WEEK_CAFE],
      ['Kofeinya Saryarka', 'Coffee shop', 'Saryarka Ave 6', '+7 707 555 0230', 4.4, 96, undefined, 'none', undefined, WEEK_CAFE],
      ['Nomad Beans', 'Coffee shop', 'Kabanbay Batyr Ave 21', '+7 747 555 0262', 4.6, 147, 'https://nomadbeans.kz', 'no_viewport', 'No viewport meta tag — not mobile-friendly', WEEK_CAFE],
      ['Latte Lab Left Bank', 'Café', 'Mangilik El Ave 55', '+7 708 555 0219', 4.0, 33, 'http://lattelab.kz', 'unreachable', 'DNS lookup failed', WEEK_CAFE],
      ['Tea & Coffee Bayterek', 'Café', 'Nurzhol Blvd 14', '+7 701 555 0293', 4.5, 210, undefined, 'none', undefined, WEEK_CAFE],
      ['Daily Grind Astana', 'Coffee shop', 'Republic Ave 24', '+7 776 555 0204', 4.3, 72, 'https://dailygrind.kz', 'ok', 'HTTPS + mobile viewport', WEEK_CAFE],
    ]),
  },
]

export const DEMO_ATTRIBUTION = 'Sample data — fictional businesses for demonstration'

export function findDemoPreset(city: string, category: string): DemoPreset | undefined {
  const c = city.trim().toLowerCase()
  const k = category.trim().toLowerCase()
  return DEMO_PRESETS.find(
    (p) =>
      (p.city.toLowerCase().startsWith(c.slice(0, 4)) || c.startsWith(p.city.toLowerCase().slice(0, 4))) &&
      (!k || p.category.toLowerCase().includes(k.slice(0, 4)) || k.includes(p.category.toLowerCase().slice(0, 4))),
  )
}

export function demoSearch(presetId: string): SearchResponse {
  const p = DEMO_PRESETS.find((x) => x.id === presetId) ?? DEMO_PRESETS[0]
  return {
    source: 'demo',
    query: p.label,
    results: p.businesses.map(({ site: _site, ...b }) => b),
    attribution: DEMO_ATTRIBUTION,
  }
}

export function demoBusiness(key: string) {
  for (const p of DEMO_PRESETS) {
    const b = p.businesses.find((x) => x.key === key || x.sourceId === key)
    if (b) return b
  }
  return undefined
}

export function demoSiteCheck(key: string): SiteCheck | undefined {
  const b = demoBusiness(key)
  return b ? { ...b.site, checkedAt: new Date().toISOString() } : undefined
}
