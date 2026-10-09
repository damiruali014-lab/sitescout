/**
 * Business categories offered in the search form — small local businesses that usually need a website.
 * `ru` is what we send to 2GIS (its catalogue is Russian-first); Google gets the English label.
 */
export interface Category {
  en: string
  ru: string
  group: string
}

export const CATEGORIES: Category[] = [
  { group: 'Beauty', en: 'Beauty salons', ru: 'салон красоты' },
  { group: 'Beauty', en: 'Barbershops', ru: 'барбершоп' },
  { group: 'Beauty', en: 'Hair salons', ru: 'парикмахерская' },
  { group: 'Beauty', en: 'Nail salons', ru: 'маникюр' },
  { group: 'Beauty', en: 'Lash & brow studios', ru: 'наращивание ресниц' },
  { group: 'Beauty', en: 'Cosmetology', ru: 'косметология' },
  { group: 'Beauty', en: 'Massage & spa', ru: 'массажный салон' },
  { group: 'Beauty', en: 'Tattoo studios', ru: 'тату-салон' },
  { group: 'Health', en: 'Dentists', ru: 'стоматология' },
  { group: 'Health', en: 'Medical clinics', ru: 'медицинский центр' },
  { group: 'Health', en: 'Physiotherapy', ru: 'реабилитационный центр' },
  { group: 'Health', en: 'Veterinary clinics', ru: 'ветеринарная клиника' },
  { group: 'Health', en: 'Pet grooming', ru: 'груминг' },
  { group: 'Sport', en: 'Fitness gyms', ru: 'фитнес-клуб' },
  { group: 'Sport', en: 'Yoga studios', ru: 'йога-студия' },
  { group: 'Sport', en: 'Dance studios', ru: 'школа танцев' },
  { group: 'Sport', en: 'Martial arts', ru: 'секция единоборств' },
  { group: 'Food', en: 'Cafés', ru: 'кафе' },
  { group: 'Food', en: 'Coffee shops', ru: 'кофейня' },
  { group: 'Food', en: 'Restaurants', ru: 'ресторан' },
  { group: 'Food', en: 'Bakeries', ru: 'пекарня' },
  { group: 'Food', en: 'Confectioneries', ru: 'кондитерская' },
  { group: 'Food', en: 'Food delivery', ru: 'доставка еды' },
  { group: 'Shops', en: 'Flower shops', ru: 'цветочный магазин' },
  { group: 'Shops', en: 'Clothing boutiques', ru: 'магазин одежды' },
  { group: 'Shops', en: 'Furniture makers', ru: 'мебель на заказ' },
  { group: 'Auto', en: 'Car repair', ru: 'автосервис' },
  { group: 'Auto', en: 'Car wash', ru: 'автомойка' },
  { group: 'Auto', en: 'Tire service', ru: 'шиномонтаж' },
  { group: 'Auto', en: 'Driving schools', ru: 'автошкола' },
  { group: 'Services', en: 'Dry cleaning', ru: 'химчистка' },
  { group: 'Services', en: 'Tailors', ru: 'ателье' },
  { group: 'Services', en: 'Photo studios', ru: 'фотостудия' },
  { group: 'Services', en: 'Cleaning services', ru: 'клининговая компания' },
  { group: 'Services', en: 'Repair services', ru: 'ремонт квартир' },
  { group: 'Services', en: 'Event venues', ru: 'банкетный зал' },
  { group: 'Services', en: 'Real estate agencies', ru: 'агентство недвижимости' },
  { group: 'Services', en: 'Lawyers', ru: 'юридические услуги' },
  { group: 'Services', en: 'Accountants', ru: 'бухгалтерские услуги' },
  { group: 'Education', en: 'Language schools', ru: 'языковые курсы' },
  { group: 'Education', en: 'Tutoring centers', ru: 'учебный центр' },
  { group: 'Education', en: 'Private kindergartens', ru: 'частный детский сад' },
  { group: 'Education', en: 'Music schools', ru: 'музыкальная школа' },
  { group: 'Stay', en: 'Hotels', ru: 'гостиница' },
  { group: 'Stay', en: 'Hostels', ru: 'хостел' },
]

/** The search term to send to a provider: Russian for 2GIS when the category is one of ours. */
export function categoryQuery(input: string, provider: '2gis' | 'google'): string {
  const v = input.trim().toLowerCase()
  const known = CATEGORIES.find((c) => c.en.toLowerCase() === v || c.ru === v)
  if (!known) return input.trim()
  return provider === '2gis' ? known.ru : known.en
}
