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
}

export const CATEGORIES: Category[] = [
  { group: 'Beauty', en: 'Beauty salons', ru: 'салон красоты', gtype: 'beauty_salon' },
  { group: 'Beauty', en: 'Barbershops', ru: 'барбершоп', gtype: 'barber_shop', rubric: '110998' },
  { group: 'Beauty', en: 'Hair salons', ru: 'парикмахерская', gtype: 'hair_salon', rubric: '305' },
  { group: 'Beauty', en: 'Nail salons', ru: 'маникюр', gtype: 'nail_salon', rubric: '5603' },
  { group: 'Beauty', en: 'Lash & brow studios', ru: 'наращивание ресниц', gtype: 'beauty_salon' },
  { group: 'Beauty', en: 'Cosmetology', ru: 'косметология', gtype: 'skin_care_clinic', rubric: '652' },
  { group: 'Beauty', en: 'Massage & spa', ru: 'массажный салон', gtype: 'massage', rubric: '13726' },
  { group: 'Beauty', en: 'Tattoo studios', ru: 'тату-салон', rubric: '14942' },
  { group: 'Health', en: 'Dentists', ru: 'стоматология', gtype: 'dentist', rubric: '222' },
  { group: 'Health', en: 'Medical clinics', ru: 'медицинский центр', gtype: 'medical_clinic', rubric: '4521' },
  { group: 'Health', en: 'Physiotherapy', ru: 'реабилитационный центр', gtype: 'physiotherapist', rubric: '15366' },
  { group: 'Health', en: 'Veterinary clinics', ru: 'ветеринарная клиника', gtype: 'veterinary_care', rubric: '205' },
  { group: 'Health', en: 'Pet grooming', ru: 'груминг', gtype: 'pet_care', rubric: '16414' },
  { group: 'Sport', en: 'Fitness gyms', ru: 'фитнес-клуб', gtype: 'gym', rubric: '268' },
  { group: 'Sport', en: 'Yoga studios', ru: 'йога-студия', gtype: 'yoga_studio', rubric: '20228' },
  { group: 'Sport', en: 'Dance studios', ru: 'школа танцев', rubric: '4515' },
  { group: 'Sport', en: 'Martial arts', ru: 'секция единоборств' },
  { group: 'Food', en: 'Cafés', ru: 'кафе', gtype: 'cafe', rubric: '161' },
  { group: 'Food', en: 'Coffee shops', ru: 'кофейня', gtype: 'coffee_shop', rubric: '162' },
  { group: 'Food', en: 'Restaurants', ru: 'ресторан', gtype: 'restaurant', rubric: '164' },
  { group: 'Food', en: 'Bakeries', ru: 'пекарня', gtype: 'bakery', rubric: '111594' },
  { group: 'Food', en: 'Confectioneries', ru: 'кондитерская', gtype: 'confectionery', rubric: '112658' },
  { group: 'Food', en: 'Food delivery', ru: 'доставка еды', gtype: 'meal_delivery', rubric: '1203' },
  { group: 'Shops', en: 'Flower shops', ru: 'цветочный магазин', gtype: 'florist', rubric: '389' },
  { group: 'Shops', en: 'Clothing boutiques', ru: 'магазин одежды', gtype: 'clothing_store' },
  { group: 'Shops', en: 'Furniture makers', ru: 'мебель на заказ', gtype: 'furniture_store', rubric: '589' },
  { group: 'Auto', en: 'Car repair', ru: 'автосервис', gtype: 'car_repair', rubric: '9041' },
  { group: 'Auto', en: 'Car wash', ru: 'автомойка', gtype: 'car_wash', rubric: '405' },
  { group: 'Auto', en: 'Tire service', ru: 'шиномонтаж', gtype: 'tire_shop', rubric: '7689' },
  { group: 'Auto', en: 'Driving schools', ru: 'автошкола', rubric: '233' },
  { group: 'Services', en: 'Dry cleaning', ru: 'химчистка', gtype: 'laundry', rubric: '313' },
  { group: 'Services', en: 'Tailors', ru: 'ателье', gtype: 'tailor', rubric: '302' },
  { group: 'Services', en: 'Photo studios', ru: 'фотостудия', rubric: '1015' },
  { group: 'Services', en: 'Cleaning services', ru: 'клининговая компания', rubric: '709' },
  { group: 'Services', en: 'Repair services', ru: 'ремонт квартир', rubric: '276' },
  { group: 'Services', en: 'Event venues', ru: 'банкетный зал', gtype: 'event_venue', rubric: '10803' },
  { group: 'Services', en: 'Real estate agencies', ru: 'агентство недвижимости', gtype: 'real_estate_agency', rubric: '275' },
  { group: 'Services', en: 'Lawyers', ru: 'юридические услуги', gtype: 'lawyer', rubric: '344' },
  { group: 'Services', en: 'Accountants', ru: 'бухгалтерские услуги', gtype: 'accounting', rubric: '653' },
  { group: 'Education', en: 'Language schools', ru: 'языковые курсы', rubric: '675' },
  { group: 'Education', en: 'Tutoring centers', ru: 'учебный центр', rubric: '1181' },
  { group: 'Education', en: 'Private kindergartens', ru: 'частный детский сад', gtype: 'preschool', rubric: '110405' },
  { group: 'Education', en: 'Music schools', ru: 'музыкальная школа', rubric: '56437' },
  { group: 'Stay', en: 'Hotels', ru: 'гостиница', gtype: 'hotel', rubric: '269' },
  { group: 'Stay', en: 'Hostels', ru: 'хостел', gtype: 'hostel', rubric: '52681' },
]

export interface ResolvedCategory {
  /** Text query (English for Google, Russian for 2GIS) */
  q: string
  includedType?: string
  rubricId?: string
}

/** What to send to a provider for this category. Custom text passes through unchanged. */
export function resolveCategory(input: string, provider: '2gis' | 'google'): ResolvedCategory {
  const v = input.trim().toLowerCase()
  const known = CATEGORIES.find((c) => c.en.toLowerCase() === v || c.ru === v)
  if (!known) return { q: input.trim() }
  return provider === '2gis' ? { q: known.ru, rubricId: known.rubric } : { q: known.en, includedType: known.gtype }
}
