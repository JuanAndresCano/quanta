import { ERROR_MESSAGES } from '../calculator/errors'
import { displaySize, formatDisplay } from '../calculator/format'
import type { ErrorCode } from '../calculator/types'

interface DisplayProps {
  value: string
  error: ErrorCode | null
  loading: boolean
}

export function Display({ value, error, loading }: DisplayProps) {
  const text = error ? ERROR_MESSAGES[error] : formatDisplay(value)
  const size = error ? 'error' : displaySize(text)

  return (
    <output className={`display display--${size}`} aria-live="polite" aria-busy={loading}>
      {text}
    </output>
  )
}
