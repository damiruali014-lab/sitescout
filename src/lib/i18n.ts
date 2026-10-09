import type { Lang } from '../../api/_lib/types'

/** Labels for the public demo landing page (shown to business owners in their language). */
export const PAGE_TEXT: Record<Lang, Record<string, string>> = {
  en: {
    call: 'Call',
    whatsapp: 'WhatsApp',
    directions: 'Directions',
    about: 'About',
    hours: 'Opening hours',
    location: 'Location',
    reviews: 'reviews',
    book: 'Book a visit',
    openMaps: 'Open in maps',
    previewBadge: 'Concept preview',
    previewNote: 'This is a concept website made by {owner} to show what {name} could look like online. It is not the official website of {name}.',
    wantIt: 'Like it? This site can be yours.',
    contactOwner: 'Contact {owner}',
    loading: 'Loading preview…',
    notFound: 'This preview does not exist or has expired.',
  },
  ru: {
    call: 'Позвонить',
    whatsapp: 'WhatsApp',
    directions: 'Маршрут',
    about: 'О нас',
    hours: 'Часы работы',
    location: 'Адрес',
    reviews: 'отзывов',
    book: 'Записаться',
    openMaps: 'Открыть на карте',
    previewBadge: 'Демо-версия',
    previewNote: 'Это демо-сайт, который сделал {owner}, чтобы показать, как {name} может выглядеть в интернете. Это не официальный сайт {name}.',
    wantIt: 'Нравится? Этот сайт может стать вашим.',
    contactOwner: 'Написать {owner}',
    loading: 'Загружаем…',
    notFound: 'Эта демо-страница не найдена или устарела.',
  },
  kk: {
    call: 'Қоңырау шалу',
    whatsapp: 'WhatsApp',
    directions: 'Бағыт',
    about: 'Біз туралы',
    hours: 'Жұмыс уақыты',
    location: 'Мекенжай',
    reviews: 'пікір',
    book: 'Жазылу',
    openMaps: 'Картадан ашу',
    previewBadge: 'Демо-нұсқа',
    previewNote: 'Бұл — {name} интернетте қалай көрінуі мүмкін екенін көрсету үшін {owner} жасаған демо-сайт. Бұл {name} ресми сайты емес.',
    wantIt: 'Ұнады ма? Бұл сайт сіздікі бола алады.',
    contactOwner: '{owner}-ға жазу',
    loading: 'Жүктелуде…',
    notFound: 'Бұл демо-бет табылмады немесе мерзімі өтті.',
  },
}

export function t(lang: Lang, key: string, vars: Record<string, string> = {}): string {
  let s = PAGE_TEXT[lang][key] ?? PAGE_TEXT.en[key] ?? key
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v)
  return s
}

/** Category names for the demo dataset in RU/KK. */
const CATEGORY: Record<string, { ru: string; kk: string }> = {
  'Beauty salon': { ru: 'Салон красоты', kk: 'Сұлулық салоны' },
  'Nail salon': { ru: 'Ногтевая студия', kk: 'Маникюр студиясы' },
  'Hair salon': { ru: 'Парикмахерская', kk: 'Шаштараз' },
  'Barber shop': { ru: 'Барбершоп', kk: 'Барбершоп' },
  Cosmetologist: { ru: 'Косметология', kk: 'Косметология' },
  Dentist: { ru: 'Стоматология', kk: 'Стоматология' },
  'Dental clinic': { ru: 'Стоматологическая клиника', kk: 'Стоматологиялық клиника' },
  Orthodontist: { ru: 'Ортодонтия', kk: 'Ортодонтия' },
  'Coffee shop': { ru: 'Кофейня', kk: 'Кофехана' },
  'Café': { ru: 'Кафе', kk: 'Кафе' },
  'Coffee roaster': { ru: 'Обжарка кофе', kk: 'Кофе қуыру' },
}

export function localCategory(category: string | undefined, lang: Lang): string | undefined {
  if (!category || lang === 'en') return category
  return CATEGORY[category]?.[lang] ?? category
}

const DAYS: Record<'ru' | 'kk', [RegExp, string][]> = {
  ru: [[/Mon/g, 'Пн'], [/Tue/g, 'Вт'], [/Wed/g, 'Ср'], [/Thu/g, 'Чт'], [/Fri/g, 'Пт'], [/Sat/g, 'Сб'], [/Sun/g, 'Вс'], [/Closed/g, 'Выходной']],
  kk: [[/Mon/g, 'Дс'], [/Tue/g, 'Сс'], [/Wed/g, 'Ср'], [/Thu/g, 'Бс'], [/Fri/g, 'Жм'], [/Sat/g, 'Сн'], [/Sun/g, 'Жс'], [/Closed/g, 'Демалыс']],
}

/** Demo hours are stored in English ("Mon–Fri: 09:00–20:00"); translate day names for RU/KK pages. */
export function localHours(hours: string[] | undefined, lang: Lang): string[] | undefined {
  if (!hours || lang === 'en') return hours
  return hours.map((h) => DAYS[lang].reduce((s, [re, v]) => s.replace(re, v), h))
}
