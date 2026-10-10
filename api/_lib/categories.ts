/**
 * Business categories offered in the search form — small local businesses that usually need a website.
 * Known categories are searched by exact type, not just text: free-text search for "courses"
 * returned beauty-training courses, so 2GIS gets a rubric id and Google gets includedType.
 */
export interface Category {
  en: string
  ru: string
  group: string
  /** Google Places type for includedType + strictTypeFiltering (verified against the API) */
  gtype?: string
  /** 2GIS rubric id (verified via /2.0/catalog/rubric/search) — exact category instead of free text */
  rubric?: string
  /** OpenStreetMap tag filters for Overpass (any of them matches) */
  osm?: string[]
}

export const CATEGORIES: Category[] = [
  { group: 'Beauty', en: 'Beauty salons', ru: 'салон красоты', gtype: 'beauty_salon', osm: ['["shop"="beauty"]'] },
  { group: 'Beauty', en: 'Barbershops', ru: 'барбершоп', gtype: 'barber_shop', rubric: '110998', osm: ['["shop"="hairdresser"]["hairdresser"~"barber"]', '["shop"="hairdresser"]["name"~"barber",i]'] },
  { group: 'Beauty', en: 'Hair salons', ru: 'парикмахерская', gtype: 'hair_salon', rubric: '305', osm: ['["shop"="hairdresser"]'] },
  { group: 'Beauty', en: 'Nail salons', ru: 'маникюр', gtype: 'nail_salon', rubric: '5603', osm: ['["shop"="beauty"]["beauty"~"nails"]', '["shop"="beauty"]["name"~"nail|ongle|unghie|u\u00f1as|paznok",i]'] },
  { group: 'Beauty', en: 'Lash & brow studios', ru: 'наращивание ресниц', gtype: 'beauty_salon', osm: ['["shop"="beauty"]["beauty"~"lash|brow"]', '["shop"="beauty"]["name"~"lash|cils|brow|sourcil",i]'] },
  { group: 'Beauty', en: 'Cosmetology', ru: 'косметология', gtype: 'skin_care_clinic', rubric: '652', osm: ['["shop"="beauty"]["beauty"~"skin_care|cosmetics"]'] },
  { group: 'Beauty', en: 'Massage & spa', ru: 'массажный салон', gtype: 'massage', rubric: '13726', osm: ['["shop"="massage"]', '["amenity"="spa"]'] },
  { group: 'Beauty', en: 'Tattoo studios', ru: 'тату-салон', rubric: '14942', osm: ['["shop"="tattoo"]'] },
  { group: 'Health', en: 'Dentists', ru: 'стоматология', gtype: 'dentist', rubric: '222', osm: ['["amenity"="dentist"]'] },
  { group: 'Health', en: 'Medical clinics', ru: 'медицинский центр', gtype: 'medical_clinic', rubric: '4521', osm: ['["amenity"="clinic"]'] },
  { group: 'Health', en: 'Physiotherapy', ru: 'реабилитационный центр', gtype: 'physiotherapist', rubric: '15366', osm: ['["healthcare"="physiotherapist"]'] },
  { group: 'Health', en: 'Veterinary clinics', ru: 'ветеринарная клиника', gtype: 'veterinary_care', rubric: '205', osm: ['["amenity"="veterinary"]'] },
  { group: 'Health', en: 'Pet grooming', ru: 'груминг', gtype: 'pet_care', rubric: '16414', osm: ['["shop"="pet_grooming"]'] },
  { group: 'Sport', en: 'Fitness gyms', ru: 'фитнес-клуб', gtype: 'gym', rubric: '268', osm: ['["leisure"="fitness_centre"]'] },
  { group: 'Sport', en: 'Yoga studios', ru: 'йога-студия', gtype: 'yoga_studio', rubric: '20228', osm: ['["sport"="yoga"]'] },
  { group: 'Sport', en: 'Dance studios', ru: 'школа танцев', rubric: '4515', osm: ['["leisure"="dance"]', '["amenity"="dancing_school"]'] },
  { group: 'Sport', en: 'Martial arts', ru: 'секция единоборств', osm: ['["sport"~"martial_arts|karate|judo|boxing|taekwondo|kickboxing|jiu-jitsu"]'] },
  { group: 'Food', en: 'Cafés', ru: 'кафе', gtype: 'cafe', rubric: '161', osm: ['["amenity"="cafe"]'] },
  { group: 'Food', en: 'Coffee shops', ru: 'кофейня', gtype: 'coffee_shop', rubric: '162', osm: ['["amenity"="cafe"]["cuisine"~"coffee"]', '["shop"="coffee"]'] },
  { group: 'Food', en: 'Restaurants', ru: 'ресторан', gtype: 'restaurant', rubric: '164', osm: ['["amenity"="restaurant"]'] },
  { group: 'Food', en: 'Bakeries', ru: 'пекарня', gtype: 'bakery', rubric: '111594', osm: ['["shop"="bakery"]'] },
  { group: 'Food', en: 'Confectioneries', ru: 'кондитерская', gtype: 'confectionery', rubric: '112658', osm: ['["shop"="confectionery"]', '["shop"="pastry"]'] },
  { group: 'Food', en: 'Food delivery', ru: 'доставка еды', gtype: 'meal_delivery', rubric: '1203', osm: ['["amenity"~"fast_food|restaurant"]["delivery"="yes"]'] },
  { group: 'Shops', en: 'Flower shops', ru: 'цветочный магазин', gtype: 'florist', rubric: '389', osm: ['["shop"="florist"]'] },
  { group: 'Shops', en: 'Clothing boutiques', ru: 'магазин одежды', gtype: 'clothing_store', osm: ['["shop"="clothes"]', '["shop"="boutique"]'] },
  { group: 'Shops', en: 'Furniture makers', ru: 'мебель на заказ', gtype: 'furniture_store', rubric: '589', osm: ['["shop"="furniture"]', '["craft"="carpenter"]'] },
  { group: 'Auto', en: 'Car repair', ru: 'автосервис', gtype: 'car_repair', rubric: '9041', osm: ['["shop"="car_repair"]'] },
  { group: 'Auto', en: 'Car wash', ru: 'автомойка', gtype: 'car_wash', rubric: '405', osm: ['["amenity"="car_wash"]'] },
  { group: 'Auto', en: 'Tire service', ru: 'шиномонтаж', gtype: 'tire_shop', rubric: '7689', osm: ['["shop"="tyres"]'] },
  { group: 'Auto', en: 'Driving schools', ru: 'автошкола', rubric: '233', osm: ['["amenity"="driving_school"]'] },
  { group: 'Services', en: 'Dry cleaning', ru: 'химчистка', gtype: 'laundry', rubric: '313', osm: ['["shop"="dry_cleaning"]', '["shop"="laundry"]'] },
  { group: 'Services', en: 'Tailors', ru: 'ателье', gtype: 'tailor', rubric: '302', osm: ['["craft"="tailor"]', '["shop"="tailor"]'] },
  { group: 'Services', en: 'Photo studios', ru: 'фотостудия', rubric: '1015', osm: ['["craft"="photographer"]', '["shop"="photo_studio"]'] },
  { group: 'Services', en: 'Cleaning services', ru: 'клининговая компания', rubric: '709', osm: ['["craft"="cleaning"]', '["office"="cleaning"]'] },
  { group: 'Services', en: 'Repair services', ru: 'ремонт квартир', rubric: '276', osm: ['["craft"="builder"]', '["office"="construction_company"]'] },
  { group: 'Services', en: 'Event venues', ru: 'банкетный зал', gtype: 'event_venue', rubric: '10803', osm: ['["amenity"="events_venue"]'] },
  { group: 'Services', en: 'Real estate agencies', ru: 'агентство недвижимости', gtype: 'real_estate_agency', rubric: '275', osm: ['["office"="estate_agent"]'] },
  { group: 'Services', en: 'Lawyers', ru: 'юридические услуги', gtype: 'lawyer', rubric: '344', osm: ['["office"="lawyer"]'] },
  { group: 'Services', en: 'Accountants', ru: 'бухгалтерские услуги', gtype: 'accounting', rubric: '653', osm: ['["office"="accountant"]'] },
  { group: 'Education', en: 'Language schools', ru: 'языковые курсы', rubric: '675', osm: ['["amenity"="language_school"]'] },
  { group: 'Education', en: 'Tutoring centers', ru: 'учебный центр', rubric: '1181', osm: ['["amenity"="prep_school"]', '["office"="tutoring"]'] },
  { group: 'Education', en: 'Private kindergartens', ru: 'частный детский сад', gtype: 'preschool', rubric: '110405', osm: ['["amenity"="kindergarten"]'] },
  { group: 'Education', en: 'Music schools', ru: 'музыкальная школа', rubric: '56437', osm: ['["amenity"="music_school"]'] },
  { group: 'Stay', en: 'Hotels', ru: 'гостиница', gtype: 'hotel', rubric: '269', osm: ['["tourism"="hotel"]'] },
  { group: 'Stay', en: 'Hostels', ru: 'хостел', gtype: 'hostel', rubric: '52681', osm: ['["tourism"="hostel"]'] },
]

export interface ResolvedCategory {
  /** Text query (English for Google, Russian for 2GIS) */
  q: string
  /** English label (for OSM result cards) */
  label?: string
  osm?: string[]
  includedType?: string
  rubricId?: string
}

/** What to send to a provider for this category. Custom text passes through unchanged. */
export function resolveCategory(input: string, provider: '2gis' | 'google' | 'osm'): ResolvedCategory {
  const v = input.trim().toLowerCase()
  const known = CATEGORIES.find((c) => c.en.toLowerCase() === v || c.ru === v)
  if (!known) return { q: input.trim() }
  if (provider === 'osm') return { q: known.en, label: known.en, osm: known.osm }
  return provider === '2gis' ? { q: known.ru, rubricId: known.rubric } : { q: known.en, includedType: known.gtype }
}
