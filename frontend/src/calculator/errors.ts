import type { ErrorCode } from './types'

/** Raised by a `CalculateFn` when the calculation fails for a known reason. */
export class CalculationError extends Error {
  readonly code: ErrorCode

  constructor(code: ErrorCode, message = code) {
    super(message)
    this.name = 'CalculationError'
    this.code = code
  }
}

/** Friendly text for each error code. The UI branches on the code, never on a server message. */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  division_by_zero: 'Cannot divide by zero',
  invalid_operand: 'Invalid number',
  invalid_request: 'Invalid request',
  invalid_exponent: 'Invalid exponent',
  internal_error: 'Server error',
  network_error: 'Cannot reach the server',
  operand_too_long: 'Number too long',
}
