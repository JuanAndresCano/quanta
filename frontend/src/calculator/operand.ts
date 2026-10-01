/**
 * Turns what is on the display into the format the API accepts
 * (`^-?\d+(\.\d+)?$`): `.5` becomes `0.5`, `5.` becomes `5` and negative
 * zero becomes `0`. Pure string manipulation, no numeric conversion.
 */
export function normalizeOperand(raw: string): string {
  const negative = raw.startsWith('-')
  let value = negative ? raw.slice(1) : raw

  if (value.startsWith('.')) value = `0${value}`
  if (value.endsWith('.')) value = value.slice(0, -1)
  if (value === '') value = '0'

  const isZero = /^0(\.0*)?$/.test(value)
  return negative && !isZero ? `-${value}` : value
}

/** Counts the digits of a displayed value, ignoring the sign and the dot. */
export function countDigits(value: string): number {
  return value.replace(/\D/g, '').length
}
