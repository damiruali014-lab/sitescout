import { useState } from 'react'
import { copyText } from '../lib/clipboard'
import { CopyIcon } from './Icons'

export function CopyButton({
  text,
  label = 'Copy',
  className = 'btn btn-sm',
  onCopied,
}: {
  text: string
  label?: string
  className?: string
  onCopied?: () => void
}) {
  const [state, setState] = useState<'idle' | 'ok' | 'fail'>('idle')
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const ok = await copyText(text)
        setState(ok ? 'ok' : 'fail')
        if (ok) onCopied?.()
        setTimeout(() => setState('idle'), 1600)
      }}
    >
      <CopyIcon size={14} /> {state === 'ok' ? 'Copied' : state === 'fail' ? 'Select & copy manually' : label}
    </button>
  )
}
