import type { SiteGroup } from '../../api/_lib/sitecontent'

/** Each demo website gets a palette that fits its kind of business (the SiteScout app itself keeps one accent). */
export const SITE_THEMES: Record<SiteGroup, { accent: string; soft: string; ink: string }> = {
  beauty: { accent: '#b4537a', soft: '#fbeef3', ink: '#3d1a29' },
  food: { accent: '#b45309', soft: '#fdf3e6', ink: '#3b2008' },
  health: { accent: '#0e7490', soft: '#e7f5f8', ink: '#0b2c36' },
  sport: { accent: '#4d7c0f', soft: '#f0f6e6', ink: '#1d2e07' },
  auto: { accent: '#334155', soft: '#eef1f5', ink: '#111827' },
  education: { accent: '#4338ca', soft: '#eef0fd', ink: '#1e1b4b' },
  stay: { accent: '#7c3aed', soft: '#f3eefe', ink: '#2a1458' },
  shops: { accent: '#be123c', soft: '#fdecef', ink: '#3f0a17' },
  services: { accent: '#0f766e', soft: '#e6f2f0', ink: '#0b2e2b' },
}
