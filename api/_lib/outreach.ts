import type { Business, Lang, SiteCheck } from './types.js'

/**
 * Outreach messages — shared by the browser (Demo mode / fallback templates) and /api/message.
 * The opt-out line is ALWAYS appended by code, never left to the AI.
 */
export type Channel = 'whatsapp' | 'instagram' | 'email'

export interface OutreachMessage {
  subject?: string
  body: string
}

export const OPT_OUT: Record<Lang, string> = {
  en: 'If this isn’t relevant, just reply “stop” and I won’t message again.',
  ru: 'Если неактуально — ответьте «стоп», и я больше не буду писать.',
  kk: 'Егер қажет болмаса, «стоп» деп жауап беріңіз — қайта жазбаймын.',
}

const SENDER = { en: 'Damir Uali', ru: 'Дамир Уали', kk: 'Дамир Уали' }

function host(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** The single specific, verifiable detail we mention. */
export function hookDetail(b: Business, lang: Lang): string {
  const street = (b.address ?? '').split(',')[0]
  if (b.rating != null && (b.reviews ?? 0) >= 50) {
    const r = b.rating.toFixed(1)
    return lang === 'ru'
      ? `рейтинг ${r} из ${b.reviews} отзывов — это впечатляет`
      : lang === 'kk'
        ? `${b.reviews} пікірден ${r} рейтинг — өте жақсы көрсеткіш`
        : `a ${r}★ rating from ${b.reviews} reviews is impressive`
  }
  if (b.rating != null && b.rating >= 4.5) {
    const r = b.rating.toFixed(1)
    return lang === 'ru' ? `у вас отличный рейтинг ${r}` : lang === 'kk' ? `рейтингіңіз керемет — ${r}` : `you have a great ${r}★ rating`
  }
  return lang === 'ru' ? `вы находитесь на ${street}` : lang === 'kk' ? `сіз ${street} мекенжайында орналасқансыз` : `you're on ${street}`
}

export function issueLine(b: Business, check: SiteCheck | undefined, lang: Lang): string {
  const status = check?.status ?? (b.website ? undefined : 'none')
  const h = host(check?.url ?? b.website)
  const social = /social|instagram|facebook|link/i.test(check?.note ?? '') || (!b.website && b.instagram)
  const L = {
    en: {
      social: 'I noticed you only have a social media page, so new customers can’t find a proper website.',
      none: 'I noticed you don’t have a website yet, so customers can only find you on maps.',
      unreachable: `Your site ${h} didn’t load when I tried to open it.`,
      no_https: `Your site ${h} opens without HTTPS, so browsers mark it “Not secure”.`,
      no_viewport: `Your site ${h} isn’t adapted for phones, where most customers look.`,
      ok: `I looked at ${h} and had a few ideas to bring you more bookings.`,
    },
    ru: {
      social: 'Я заметил, что у вас есть только страница в соцсетях, а полноценного сайта нет.',
      none: 'Я заметил, что у вас пока нет сайта — клиенты находят вас только на картах.',
      unreachable: `Ваш сайт ${h} не открылся, когда я попробовал зайти.`,
      no_https: `Ваш сайт ${h} открывается без HTTPS, и браузеры помечают его «Не защищено».`,
      no_viewport: `Ваш сайт ${h} не адаптирован для телефонов, а большинство клиентов смотрит именно с них.`,
      ok: `Я посмотрел ${h} и у меня есть пара идей, как получать больше записей.`,
    },
    kk: {
      social: 'Сізде тек әлеуметтік желідегі парақша бар екенін байқадым, толыққанды сайт жоқ.',
      none: 'Сізде әлі сайт жоқ екенін байқадым — клиенттер сізді тек картадан табады.',
      unreachable: `${h} сайтыңыз ашылмады.`,
      no_https: `${h} сайтыңыз HTTPS-сіз ашылады, браузерлер оны «Қауіпсіз емес» деп белгілейді.`,
      no_viewport: `${h} сайтыңыз телефонға бейімделмеген, ал клиенттердің көбі телефоннан қарайды.`,
      ok: `${h} сайтыңызды қарап шықтым, көбірек клиент тартуға бірнеше идеям бар.`,
    },
  }[lang]
  if (status === 'none' && social) return L.social
  return L[status ?? 'none']
}

/** Deterministic template — used in Demo mode and whenever the AI is unavailable. */
export function templateMessage(b: Business, check: SiteCheck | undefined, lang: Lang, channel: Channel, link: string): OutreachMessage {
  const detail = hookDetail(b, lang)
  const issue = issueLine(b, check, lang)
  const name = b.name
  let subject: string | undefined
  let body: string
  if (lang === 'ru') {
    subject = `Бесплатный концепт сайта для ${name}`
    body =
      (channel === 'email' ? 'Здравствуйте!\n\n' : `Здравствуйте, ${name}! `) +
      `Нашёл вас на картах: ${detail}. ${issue} Меня зовут Дамир, я веб-разработчик, и я сделал бесплатную демо-страницу, чтобы показать, как мог бы выглядеть ваш сайт: ${link}\n` +
      'Если понравится — с радостью расскажу подробнее.'
  } else if (lang === 'kk') {
    subject = `${name} үшін тегін сайт үлгісі`
    body =
      (channel === 'email' ? 'Сәлеметсіз бе!\n\n' : `Сәлеметсіз бе, ${name}! `) +
      `Сізді картадан таптым: ${detail}. ${issue} Менің атым Дамир, мен веб-әзірлеушімін. Сайтыңыз қалай көрінуі мүмкін екенін көрсету үшін тегін демо-бет жасадым: ${link}\n` +
      'Ұнаса, толығырақ айтып беремін.'
  } else {
    subject = `A free website concept for ${name}`
    body =
      (channel === 'email' ? 'Hello,\n\n' : `Hi ${name}! `) +
      `I found you on the map — ${detail}. ${issue} I’m Damir, a web developer, and I made a free concept page to show how your website could look: ${link}\n` +
      'If you like it, I’d be happy to tell you more.'
  }
  return finalize({ subject: channel === 'email' ? subject : undefined, body }, lang, channel)
}

/** Adds the sign-off (email) and the mandatory opt-out line. */
export function finalize(msg: OutreachMessage, lang: Lang, channel: Channel): OutreachMessage {
  let body = msg.body.trim()
  if (channel === 'email') {
    const regards = lang === 'ru' ? 'С уважением,' : lang === 'kk' ? 'Құрметпен,' : 'Best regards,'
    body += `\n\n${regards}\n${SENDER[lang]}\nhttps://damiruali014-lab.github.io`
  }
  body += `\n\n${OPT_OUT[lang]}`
  return { subject: msg.subject, body }
}
