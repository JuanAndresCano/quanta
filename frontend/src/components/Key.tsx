export type KeyVariant = 'digit' | 'function' | 'operator'

interface KeyProps {
  label: string
  variant: KeyVariant
  onPress: () => void
  /** Accessible name when the visible label is only a symbol. */
  ariaLabel?: string
  /** The `0` key spans two columns. */
  wide?: boolean
  /** Spans the whole row (the `xʸ` key). */
  full?: boolean
  /** Highlights the operator that is waiting for its second operand. */
  active?: boolean
  disabled?: boolean
}

export function Key({ label, variant, onPress, ariaLabel, wide, full, active, disabled }: KeyProps) {
  const classes = ['key', `key--${variant}`]
  if (wide) classes.push('key--wide')
  if (full) classes.push('key--full')
  if (active) classes.push('key--active')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      aria-label={ariaLabel}
      aria-pressed={variant === 'operator' ? Boolean(active) : undefined}
      disabled={disabled}
      onClick={onPress}
    >
      {label}
    </button>
  )
}
