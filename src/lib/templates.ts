import type { Business, Lang } from '../../api/_lib/types'
import { localCategory } from './i18n'

/**
 * Deterministic text templates — used in Demo mode (no AI calls) and as a fallback
 * when the Claude API isn't configured. Facts only; nothing invented.
 */
function street(b: Business): string {
  return (b.address ?? '').split(',')[0]
}

export function templateDescription(b: Business, lang: Lang): string {
  const cat = localCategory(b.category, lang) ?? ''
  const city = b.city ?? ''
  const rated = b.rating != null && (b.reviews ?? 0) > 0
  if (lang === 'ru') {
    return (
      `${b.name} — ${cat.toLowerCase()} в городе ${city}, на ${street(b)}.` +
      (rated ? ` Клиенты ставят нам ${b.rating!.toFixed(1)} из 5 — это ${b.reviews} отзывов.` : '') +
      ' Позвоните или напишите, чтобы записаться в удобное время.'
    )
  }
  if (lang === 'kk') {
    return (
      `${b.name} — ${city} қаласындағы ${cat.toLowerCase()}, мекенжайы: ${street(b)}.` +
      (rated ? ` Клиенттер бізді ${b.rating!.toFixed(1)}/5 деп бағалайды (${b.reviews} пікір).` : '') +
      ' Ыңғайлы уақытқа жазылу үшін қоңырау шалыңыз немесе жазыңыз.'
    )
  }
  return (
    `${b.name} is a ${cat.toLowerCase()} on ${street(b)} in ${city}.` +
    (rated ? ` Our customers rate us ${b.rating!.toFixed(1)} out of 5 across ${b.reviews} reviews.` : '') +
    ' Call or message us to book a time that suits you.'
  )
}

export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: 'a', ә: 'a', б: 'b', в: 'v', г: 'g', ғ: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
    к: 'k', қ: 'q', л: 'l', м: 'm', н: 'n', ң: 'n', о: 'o', ө: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u',
    ұ: 'u', ү: 'u', ф: 'f', х: 'h', һ: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', і: 'i', э: 'e',
    ю: 'yu', я: 'ya', ъ: '', ь: '',
  }
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function randomSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (x) => (x % 36).toString(36)).join('')
}

/** Demo-mode slugs encode everything needed to rebuild the page from bundled data. */
export function demoSlug(b: Business, lang: Lang): string {
  return `demo-${b.sourceId}-${lang}`
}

export function parseDemoSlug(slug: string): { sourceId: string; lang: Lang } | undefined {
  const m = /^demo-([a-z]+-\d+)-(en|ru|kk)$/.exec(slug)
  return m ? { sourceId: m[1], lang: m[2] as Lang } : undefined
}
