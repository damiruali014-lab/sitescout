/**
 * Countries offered in the search form. `provider` is the default data source:
 * 2GIS where people actually use it (Kazakhstan), free OpenStreetMap in Europe (great coverage,
 * no quota — Google is then used only to double-check a chosen lead), Google everywhere else.
 * Cities are suggestions only — any city can be typed.
 */
export interface Country {
  code: string // ISO 3166-1 alpha-2, also used as Google's regionCode
  name: string
  provider: '2gis' | 'google' | 'osm'
  cities: string[]
}

export const COUNTRIES: Country[] = [
  {
    code: 'KZ',
    name: 'Kazakhstan',
    provider: '2gis',
    cities: [
      'Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe', 'Taraz', 'Pavlodar', 'Oskemen', 'Semey', 'Atyrau',
      'Kostanay', 'Kyzylorda', 'Oral', 'Petropavl', 'Aktau', 'Turkistan', 'Kokshetau', 'Taldykorgan',
    ],
  },
  { code: 'PL', name: 'Poland', provider: 'osm', cities: ['Warsaw', 'Kraków', 'Wrocław', 'Gdańsk', 'Poznań', 'Łódź', 'Katowice', 'Lublin'] },
  { code: 'DE', name: 'Germany', provider: 'osm', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne', 'Leipzig', 'Dresden', 'Stuttgart'] },
  { code: 'CZ', name: 'Czech Republic', provider: 'osm', cities: ['Prague', 'Brno', 'Ostrava', 'Plzeň', 'Olomouc'] },
  { code: 'AT', name: 'Austria', provider: 'osm', cities: ['Vienna', 'Graz', 'Linz', 'Salzburg', 'Innsbruck'] },
  { code: 'NL', name: 'Netherlands', provider: 'osm', cities: ['Amsterdam', 'Rotterdam', 'The Hague', 'Utrecht', 'Eindhoven'] },
  { code: 'FR', name: 'France', provider: 'osm', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice', 'Bordeaux'] },
  { code: 'ES', name: 'Spain', provider: 'osm', cities: ['Madrid', 'Barcelona', 'Valencia', 'Seville', 'Málaga', 'Bilbao'] },
  { code: 'PT', name: 'Portugal', provider: 'osm', cities: ['Lisbon', 'Porto', 'Braga', 'Coimbra', 'Faro'] },
  { code: 'IT', name: 'Italy', provider: 'osm', cities: ['Rome', 'Milan', 'Naples', 'Turin', 'Florence', 'Bologna'] },
  { code: 'GB', name: 'United Kingdom', provider: 'osm', cities: ['London', 'Manchester', 'Birmingham', 'Edinburgh', 'Glasgow', 'Bristol'] },
  { code: 'IE', name: 'Ireland', provider: 'osm', cities: ['Dublin', 'Cork', 'Galway', 'Limerick'] },
  { code: 'LT', name: 'Lithuania', provider: 'osm', cities: ['Vilnius', 'Kaunas', 'Klaipėda'] },
  { code: 'LV', name: 'Latvia', provider: 'osm', cities: ['Riga', 'Daugavpils', 'Liepāja'] },
  { code: 'EE', name: 'Estonia', provider: 'osm', cities: ['Tallinn', 'Tartu', 'Pärnu'] },
  { code: 'HU', name: 'Hungary', provider: 'osm', cities: ['Budapest', 'Debrecen', 'Szeged'] },
  { code: 'RO', name: 'Romania', provider: 'osm', cities: ['Bucharest', 'Cluj-Napoca', 'Timișoara', 'Iași'] },
  { code: 'GE', name: 'Georgia', provider: 'google', cities: ['Tbilisi', 'Batumi', 'Kutaisi'] },
  { code: 'TR', name: 'Turkey', provider: 'google', cities: ['Istanbul', 'Ankara', 'Izmir', 'Antalya'] },
  { code: 'AE', name: 'United Arab Emirates', provider: 'google', cities: ['Dubai', 'Abu Dhabi', 'Sharjah'] },
  { code: 'MY', name: 'Malaysia', provider: 'google', cities: ['Kuala Lumpur', 'Ipoh', 'Penang', 'Johor Bahru', 'Seri Iskandar'] },
]

export function findCountry(code?: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code?.toUpperCase())
}

export const MAX_RESULTS = 50
