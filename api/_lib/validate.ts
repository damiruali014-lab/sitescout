import type { Lang } from './types.js'

export function cleanText(v: unknown, max = 80): string {
  return typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : ''
}

export function cleanLang(v: unknown): Lang {
  return v === 'ru' || v === 'kk' ? v : 'en'
}

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T
  } catch {
    return null
  }
}
