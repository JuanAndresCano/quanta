/**
 * Adds thousands separators for display only. The value kept in the state
 * and sent to the API is never the formatted one. A trailing dot typed by the
 * user ("1.") is preserved.
 */
export function formatDisplay(value: string): string {
  const match = /^(-?)(\d+)(\.\d*)?$/.exec(value)
  if (!match) return value
  const [, sign = '', integer = '', fraction = ''] = match
  return sign + integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + fraction
}

export type DisplaySize = 'large' | 'medium' | 'small' | 'tiny'

/** Picks a font size bucket so long numbers shrink instead of overflowing. */
export function displaySize(text: string): DisplaySize {
  if (text.length <= 7) return 'large'
  if (text.length <= 10) return 'medium'
  if (text.length <= 14) return 'small'
  return 'tiny'
}
