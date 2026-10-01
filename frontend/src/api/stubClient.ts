import type { CalculateFn } from '../calculator/types'

/**
 * TEMPORARY stand-in used until `feat/frontend-api-integration` adds the real
 * client. It answers every request with "42" so the keypad, the display and
 * the chaining can be tried without a backend. It does no arithmetic on purpose.
 */
export const stubCalculate: CalculateFn = () =>
  new Promise((resolve) => setTimeout(() => resolve('42'), 150))
