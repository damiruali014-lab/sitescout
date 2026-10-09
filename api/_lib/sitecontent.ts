import type { Business, Lang } from './types.js'

/**
 * Content of a generated demo website. Facts (rating, address, hours, phone) always come live from
 * the provider; this holds the WRITTEN parts, which I review and edit before publishing.
 */
export interface SiteContent {
  tagline: string
  about: string
  highlights: { title: string; text: string }[]
  /** Typical services for the category — a suggestion I must check against the business's Instagram/2GIS */
  services: string[]
  cta: string
}

export type SiteGroup = 'beauty' | 'food' | 'health' | 'sport' | 'auto' | 'education' | 'stay' | 'shops' | 'services'

const GROUP_WORDS: [SiteGroup, RegExp][] = [
  ['beauty', /beauty|barber|hair|nail|spa|lash|brow|tattoo|cosmet|massage|салон|барбер|парикмах|маникюр|ногт|космет|массаж|ресниц|бров|тату|визаж|сұлулық|шаштараз/i],
  ['food', /caf[eé]|coffee|restaurant|bakery|confection|food|pizza|sushi|кафе|кофе|ресторан|пекар|кондитер|еды|пицц|суши|кофехана|асхана/i],
  ['health', /dent|clinic|medical|physio|veterin|vet|стомат|клиник|медиц|реабил|ветерин|груминг|животн/i],
  ['sport', /gym|fitness|yoga|dance|martial|фитнес|йог|танц|единоборств|спорт/i],
  ['auto', /car |car$|tire|tyre|auto|driving|авто|шин|мойк/i],
  ['education', /school|course|tutor|kindergarten|language|music|школ|курс|обучен|учебн|детский сад|языков/i],
  ['stay', /hotel|hostel|гостин|хостел|отел/i],
  ['shops', /shop|store|boutique|flower|florist|furniture|clothing|магазин|цвет|одежд|мебел|бутик/i],
]

export function siteGroup(category?: string): SiteGroup {
  if (!category) return 'services'
  return GROUP_WORDS.find(([, re]) => re.test(category))?.[0] ?? 'services'
}

type L = Record<Lang, string>

const SERVICES: Record<SiteGroup, L[]> = {
  beauty: [
    { en: 'Haircuts & styling', ru: 'Стрижки и укладки', kk: 'Шаш қию және сәндеу' },
    { en: 'Colouring', ru: 'Окрашивание', kk: 'Шаш бояу' },
    { en: 'Manicure & pedicure', ru: 'Маникюр и педикюр', kk: 'Маникюр және педикюр' },
    { en: 'Care treatments', ru: 'Уходовые процедуры', kk: 'Күтім процедуралары' },
  ],
  food: [
    { en: 'Coffee & drinks', ru: 'Кофе и напитки', kk: 'Кофе және сусындар' },
    { en: 'Breakfasts', ru: 'Завтраки', kk: 'Таңғы ас' },
    { en: 'Desserts', ru: 'Десерты', kk: 'Десерттер' },
    { en: 'Takeaway', ru: 'Навынос', kk: 'Өзімен алып кету' },
  ],
  health: [
    { en: 'Consultations', ru: 'Консультации', kk: 'Кеңес беру' },
    { en: 'Diagnostics', ru: 'Диагностика', kk: 'Диагностика' },
    { en: 'Treatment', ru: 'Лечение', kk: 'Емдеу' },
    { en: 'Check-ups', ru: 'Профилактические осмотры', kk: 'Профилактикалық тексеру' },
  ],
  sport: [
    { en: 'Group classes', ru: 'Групповые занятия', kk: 'Топтық сабақтар' },
    { en: 'Personal training', ru: 'Персональные тренировки', kk: 'Жеке жаттығулар' },
    { en: 'Memberships', ru: 'Абонементы', kk: 'Абонементтер' },
    { en: 'Beginner sessions', ru: 'Занятия для начинающих', kk: 'Жаңадан бастаушыларға' },
  ],
  auto: [
    { en: 'Diagnostics', ru: 'Диагностика', kk: 'Диагностика' },
    { en: 'Repairs', ru: 'Ремонт', kk: 'Жөндеу' },
    { en: 'Maintenance', ru: 'Техобслуживание', kk: 'Техникалық қызмет' },
    { en: 'Tyre service', ru: 'Шиномонтаж', kk: 'Шина жөндеу' },
  ],
  education: [
    { en: 'Group lessons', ru: 'Групповые занятия', kk: 'Топтық сабақтар' },
    { en: 'Individual lessons', ru: 'Индивидуальные занятия', kk: 'Жеке сабақтар' },
    { en: 'Free trial lesson', ru: 'Пробный урок', kk: 'Сынақ сабағы' },
    { en: 'Courses for all levels', ru: 'Курсы для всех уровней', kk: 'Барлық деңгейге арналған курстар' },
  ],
  stay: [
    { en: 'Comfortable rooms', ru: 'Уютные номера', kk: 'Жайлы бөлмелер' },
    { en: 'Online booking', ru: 'Онлайн-бронирование', kk: 'Онлайн брондау' },
    { en: '24/7 check-in', ru: 'Заселение 24/7', kk: '24/7 қоныстану' },
    { en: 'Central location', ru: 'Удобное расположение', kk: 'Ыңғайлы орналасу' },
  ],
  shops: [
    { en: 'New arrivals', ru: 'Новые поступления', kk: 'Жаңа тауарлар' },
    { en: 'Gift ideas', ru: 'Идеи для подарков', kk: 'Сыйлық идеялары' },
    { en: 'Orders by phone', ru: 'Заказ по телефону', kk: 'Телефон арқылы тапсырыс' },
    { en: 'Delivery', ru: 'Доставка', kk: 'Жеткізу' },
  ],
  services: [
    { en: 'Consultation', ru: 'Консультация', kk: 'Кеңес' },
    { en: 'Individual approach', ru: 'Индивидуальный подход', kk: 'Жеке көзқарас' },
    { en: 'Fair prices', ru: 'Честные цены', kk: 'Әділ бағалар' },
    { en: 'Quick start', ru: 'Быстрый старт', kk: 'Жылдам бастау' },
  ],
}

const CTA: Record<SiteGroup, L> = {
  beauty: { en: 'Book a visit', ru: 'Записаться', kk: 'Жазылу' },
  food: { en: 'Visit us today', ru: 'Ждём вас в гости', kk: 'Бізге келіңіз' },
  health: { en: 'Book an appointment', ru: 'Записаться на приём', kk: 'Қабылдауға жазылу' },
  sport: { en: 'Book a trial session', ru: 'Записаться на пробное', kk: 'Сынақ сабаққа жазылу' },
  auto: { en: 'Book a service', ru: 'Записаться на сервис', kk: 'Сервиске жазылу' },
  education: { en: 'Book a trial lesson', ru: 'Записаться на пробный урок', kk: 'Сынақ сабағына жазылу' },
  stay: { en: 'Book a room', ru: 'Забронировать', kk: 'Брондау' },
  shops: { en: 'Order now', ru: 'Заказать', kk: 'Тапсырыс беру' },
  services: { en: 'Get in touch', ru: 'Связаться', kk: 'Хабарласу' },
}

function street(b: Business): string {
  return (b.address ?? '').split(',').filter((p) => p.trim() !== b.city).slice(0, 1).join('').trim() || (b.address ?? '')
}

/** Deterministic, facts-only content — Demo mode, and the fallback when the AI isn't available. */
export function templateContent(b: Business, lang: Lang, about?: string): SiteContent {
  const group = siteGroup(b.category)
  const city = b.city ?? ''
  const rated = b.rating != null && (b.reviews ?? 0) > 0
  const r = b.rating?.toFixed(1)
  const T = {
    en: {
      tagline: `${b.category ?? 'Local business'}${city ? ' in ' + city : ''}`,
      about: about ?? `${b.name} is a ${(b.category ?? 'local business').toLowerCase()} on ${street(b)}${city ? ' in ' + city : ''}. Call or message us to book a time that suits you.`,
      h1: rated ? { title: `${r}★ rating`, text: `Trusted by customers — ${b.reviews} reviews.` } : { title: 'Local favourite', text: `Part of the ${city} neighbourhood.` },
      h2: { title: 'Easy to find', text: `${street(b)}${city ? ', ' + city : ''}.` },
      h3: { title: 'Book in one tap', text: 'Call or message us on WhatsApp.' },
    },
    ru: {
      tagline: `${b.category ?? 'Местный бизнес'}${city ? ' в городе ' + city : ''}`,
      about: about ?? `${b.name} — ${(b.category ?? 'местный бизнес').toLowerCase()} по адресу ${street(b)}${city ? ', ' + city : ''}. Позвоните или напишите, чтобы записаться в удобное время.`,
      h1: rated ? { title: `Рейтинг ${r}★`, text: `Нам доверяют — ${b.reviews} отзывов.` } : { title: 'Любимое место', text: `Рядом с вами в городе ${city}.` },
      h2: { title: 'Легко найти', text: `${street(b)}${city ? ', ' + city : ''}.` },
      h3: { title: 'Запись в один клик', text: 'Позвоните или напишите в WhatsApp.' },
    },
    kk: {
      tagline: `${b.category ?? 'Жергілікті бизнес'}${city ? ', ' + city : ''}`,
      about: about ?? `${b.name} — ${street(b)}${city ? ', ' + city : ''} мекенжайындағы ${(b.category ?? 'бизнес').toLowerCase()}. Ыңғайлы уақытқа жазылу үшін қоңырау шалыңыз немесе жазыңыз.`,
      h1: rated ? { title: `${r}★ рейтинг`, text: `Клиенттер сенеді — ${b.reviews} пікір.` } : { title: 'Сүйікті орын', text: `${city} қаласында.` },
      h2: { title: 'Табу оңай', text: `${street(b)}${city ? ', ' + city : ''}.` },
      h3: { title: 'Бір рет басып жазылу', text: 'Қоңырау шалыңыз немесе WhatsApp-қа жазыңыз.' },
    },
  }[lang]
  return {
    tagline: T.tagline,
    about: T.about,
    highlights: [T.h1, T.h2, T.h3],
    services: SERVICES[group].map((s) => s[lang]),
    cta: CTA[group][lang],
  }
}

/** Accept anything shaped roughly like SiteContent (AI output, DB json) and make it safe. */
export function cleanContent(raw: unknown, fallback: SiteContent): SiteContent {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const str = (v: unknown, max: number, fb: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fb)
  const hs = Array.isArray(o.highlights) ? o.highlights : []
  return {
    tagline: str(o.tagline, 120, fallback.tagline),
    about: str(o.about, 600, fallback.about),
    highlights: fallback.highlights.map((fb, i) => {
      const h = (hs[i] ?? {}) as Record<string, unknown>
      return { title: str(h.title, 60, fb.title), text: str(h.text, 160, fb.text) }
    }),
    services: (Array.isArray(o.services) ? o.services : fallback.services)
      .filter((s): s is string => typeof s === 'string' && Boolean(s.trim()))
      .map((s) => s.trim().slice(0, 60))
      .slice(0, 8),
    cta: str(o.cta, 40, fallback.cta),
  }
}
