/** Largest number of digits the user can type into a single operand. */
export const MAX_DIGITS = 12

/** Longest operand string the backend accepts (see the API contract). */
export const MAX_OPERAND_LENGTH = 64

/** Operator names match the backend routes: `POST /api/v1/<operator>`. */
export type Operator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'

export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'

/**
 * Failures the calculator can show. All but the last two mirror the backend
 * `error.code` values; `network_error` and `operand_too_long` are produced on the client.
 */
export type ErrorCode =
  | 'division_by_zero'
  | 'invalid_operand'
  | 'invalid_request'
  | 'invalid_exponent'
  | 'internal_error'
  | 'network_error'
  | 'operand_too_long'

/** A two-operand request: `POST /api/v1/<operator>` with `{a, b}`. */
export interface BinaryRequest {
  operator: Operator
  a: string
  b: string
}

/** The one-operand request: `POST /api/v1/percentage` with `{value}`. */
export interface PercentageRequest {
  operator: 'percentage'
  value: string
}

export type CalculationRequest = BinaryRequest | PercentageRequest

/** A request the UI layer must send to the backend. */
export type PendingRequest =
  | (BinaryRequest & {
      /** Operator to continue with once the result arrives (chained operations). */
      next: Operator | null
    })
  | (PercentageRequest & { next: null })

/**
 * Computes one operation. Operands and the result are decimal strings. It
 * rejects with a `CalculationError` for known failures; any other rejection
 * is treated as a network error.
 */
export type CalculateFn = (request: CalculationRequest, signal: AbortSignal) => Promise<string>

/**
 * Every numeric value is a string, from the keypad to the display to the
 * request: nothing here is ever converted to a JS number.
 */
export interface CalculatorState {
  display: string
  accumulator: string | null
  operator: Operator | null
  /** The next digit replaces the display instead of extending it. */
  overwrite: boolean
  pending: PendingRequest | null
  error: ErrorCode | null
}

export type Action =
  | { type: 'digit'; digit: Digit }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'operator'; operator: Operator }
  | { type: 'equals' }
  | { type: 'percent' }
  | { type: 'clear' }
  | { type: 'resolve'; result: string }
  | { type: 'fail'; code: ErrorCode }
