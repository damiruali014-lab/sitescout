import { parsePhoneNumberFromString } from 'libphonenumber-js/max'
import type { Business, PhoneType } from './types.js'

/**
 * Mobile or landline? Offline check with Google's libphonenumber metadata — no API, no cost.
 * Landlines (e.g. French 01–05 numbers) can't have WhatsApp, so the UI offers call/email/Instagram instead.
 * Some countries (US, PL…) don't separate the ranges → 'unknown'.
 */
export function phoneType(phone: string | undefined, country?: string): PhoneType | undefined {
  if (!phone) return undefined
  const parsed = parsePhoneNumberFromString(phone, (country?.toUpperCase() || undefined) as never)
  if (!parsed?.isValid()) return 'unknown'
  const t = parsed.getType()
  if (t === 'MOBILE') return 'mobile'
  if (t === 'FIXED_LINE' || t === 'TOLL_FREE' || t === 'SHARED_COST' || t === 'PREMIUM_RATE') return 'landline'
  return 'unknown'
}

/** Adds phoneType to every business that has a phone (the explicit WhatsApp number wins). */
export function withPhoneTypes<T extends Business>(list: T[], country?: string): T[] {
  return list.map((b) => (b.phone ? { ...b, phoneType: b.whatsapp ? 'mobile' : phoneType(b.phone, country) } : b))
}
