import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'

export interface ComboOption {
  value: string
  hint?: string
  group?: string
}

interface Props {
  id: string
  value: string
  onChange: (value: string) => void
  options: ComboOption[]
  placeholder?: string
  required?: boolean
  maxLength?: number
}

/** Accent- and case-insensitive text for matching ("Kraków" ≈ "krakow"). */
function norm(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

/**
 * Lightweight combobox: type anything, or pick from a filtered list.
 * Replaces <datalist>, which is slow and inconsistent in Safari/Chrome on macOS and
 * hides every other option once a value is filled in.
 */
export function Combobox({ id, value, onChange, options, placeholder, required, maxLength = 80 }: Props) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState<string | null>(null) // null = show all (just opened)
  const listRef = useRef<HTMLUListElement>(null)

  const filtered = useMemo(() => {
    if (query === null || !query.trim()) return options
    const q = norm(query.trim())
    const starts = options.filter((o) => norm(o.value).startsWith(q) || (o.hint && norm(o.hint).startsWith(q)))
    const contains = options.filter((o) => !starts.includes(o) && (norm(o.value).includes(q) || (o.hint && norm(o.hint).includes(q))))
    return [...starts, ...contains]
  }, [options, query])

  function choose(v: string) {
    onChange(v)
    setOpen(false)
    setQuery(null)
  }

  function move(delta: number) {
    if (!open) {
      setOpen(true)
      return
    }
    const next = (active + delta + filtered.length) % Math.max(1, filtered.length)
    setActive(next)
    listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      move(1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      move(-1)
    } else if (e.key === 'Enter' && open && filtered[active]) {
      e.preventDefault()
      choose(filtered[active].value)
    } else if (e.key === 'Escape' && open) {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="combo">
      <input
        id={id}
        className="input combo-input"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && filtered[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        required={required}
        maxLength={maxLength}
        onChange={(e) => {
          onChange(e.target.value)
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={(e) => {
          e.target.select()
          setQuery(null)
          // Highlight the current value so the list opens "at" it.
          setActive(Math.max(0, options.findIndex((o) => norm(o.value) === norm(value))))
          setOpen(true)
          requestAnimationFrame(() => listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' }))
        }}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="combo-toggle"
        tabIndex={-1}
        aria-label="Show options"
        onMouseDown={(e) => {
          e.preventDefault()
          setQuery(null)
          setOpen((o) => !o)
          document.getElementById(id)?.focus()
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && filtered.length > 0 && (
        <ul id={listId} ref={listRef} className="combo-list" role="listbox">
          {filtered.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={'combo-option' + (i === active ? ' active' : '')}
              onMouseDown={(e) => {
                e.preventDefault() // keep focus in the input
                choose(o.value)
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span>{o.value}</span>
              {o.hint && <span className="combo-hint">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
