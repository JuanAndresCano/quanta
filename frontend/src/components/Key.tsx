export type KeyVariant = 'digit' | 'function' | 'operator'

interface KeyProps {
  label: string
  variant: KeyVariant
  onPress: () => void
  /** Accessible name when the visible label is only a symbol. */
  ariaLabel?: string
  /** Spans two columns (the `0` key). */
  wide?: boolean
  /** Half of the short top row (the `√` and `xʸ` keys). */
  slim?: boolean
  /** Highlights the operator that is waiting for its second operand. */
  active?: boolean
  disabled?: boolean
}

export function Key({ label, variant, onPress, ariaLabel, wide, slim, active, disabled }: KeyProps) {
  const classes = ['key', `key--${variant}`]
  if (wide) classes.push('key--wide')
  if (slim) classes.push('key--slim')
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
