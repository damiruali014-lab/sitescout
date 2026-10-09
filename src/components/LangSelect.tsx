import type { Lang } from '../../api/_lib/types'

export function LangSelect({ value, onChange, id }: { value: Lang; onChange: (l: Lang) => void; id?: string }) {
  return (
    <select id={id} className="select select-sm" value={value} onChange={(e) => onChange(e.target.value as Lang)} aria-label="Language">
      <option value="en">English</option>
      <option value="ru">Русский</option>
      <option value="kk">Қазақша</option>
    </select>
  )
}
