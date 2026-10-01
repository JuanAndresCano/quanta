import { countDigits, normalizeOperand } from './operand'
import {
  MAX_DIGITS,
  MAX_OPERAND_LENGTH,
  type Action,
  type CalculatorState,
  type Operator,
} from './types'

export const initialState: CalculatorState = {
  display: '0',
  accumulator: null,
  operator: null,
  overwrite: false,
  pending: null,
  error: null,
}

/**
 * Pure state machine behind the keypad. It never calls the API: when an
 * operation must be computed it stores a `pending` request, and the caller
 * answers with a `resolve` or `fail` action.
 */
export function reducer(state: CalculatorState, action: Action): CalculatorState {
  switch (action.type) {
    case 'clear':
      return initialState
    case 'resolve':
      return resolve(state, action.result)
    case 'fail':
      return state.pending ? { ...initialState, error: action.code } : state
  }

  // While a request is in flight the keypad is locked (only `clear` gets through).
  if (state.pending) return state

  // After an error only typing a new number is allowed; it starts from scratch.
  let current = state
  if (state.error) {
    if (action.type !== 'digit' && action.type !== 'decimal') return state
    current = initialState
  }

  switch (action.type) {
    case 'digit':
      return typeDigit(current, action.digit)
    case 'decimal':
      return typeDecimal(current)
    case 'toggleSign':
      return toggleSign(current)
    case 'operator':
      return chooseOperator(current, action.operator)
    case 'equals':
      return equals(current)
    case 'percent':
      return percent(current)
  }
}

function typeDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.overwrite) return { ...state, display: digit, overwrite: false }
  if (countDigits(state.display) >= MAX_DIGITS) return state
  return { ...state, display: state.display === '0' ? digit : state.display + digit }
}

function typeDecimal(state: CalculatorState): CalculatorState {
  if (state.overwrite) return { ...state, display: '0.', overwrite: false }
  if (state.display.includes('.')) return state
  return { ...state, display: `${state.display}.` }
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.display === '0') return state
  const display = state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`
  return { ...state, display }
}

function chooseOperator(state: CalculatorState, operator: Operator): CalculatorState {
  if (state.accumulator !== null && state.operator !== null) {
    // Pressing two operators in a row just replaces the first one.
    if (state.overwrite) return { ...state, operator }
    // Otherwise evaluate what we have and carry on with the new operator.
    return request(state, state.accumulator, state.operator, operator)
  }

  const accumulator = normalizeOperand(state.display)
  if (accumulator.length > MAX_OPERAND_LENGTH) return tooLong()
  return { ...state, accumulator, operator, overwrite: true }
}

function equals(state: CalculatorState): CalculatorState {
  if (state.accumulator === null || state.operator === null) return state
  return request(state, state.accumulator, state.operator, null)
}

/**
 * Replaces the number on the display with its hundredth. A pending operator
 * and accumulator are kept, so `200 + 10 % =` computes `200 + 0.1`.
 */
function percent(state: CalculatorState): CalculatorState {
  const value = normalizeOperand(state.display)
  if (value.length > MAX_OPERAND_LENGTH) return tooLong()
  return { ...state, pending: { operator: 'percentage', value, next: null } }
}

function request(
  state: CalculatorState,
  a: string,
  operator: Operator,
  next: Operator | null,
): CalculatorState {
  const b = normalizeOperand(state.display)
  if (a.length > MAX_OPERAND_LENGTH || b.length > MAX_OPERAND_LENGTH) return tooLong()
  return { ...state, pending: { operator, a, b, next } }
}

function resolve(state: CalculatorState, result: string): CalculatorState {
  const { pending } = state
  if (!pending) return state // stale answer, e.g. the user pressed AC meanwhile
  if (pending.operator === 'percentage') {
    return { ...state, display: result, overwrite: true, pending: null, error: null }
  }
  return {
    display: result,
    accumulator: pending.next ? result : null,
    operator: pending.next,
    overwrite: true,
    pending: null,
    error: null,
  }
}

function tooLong(): CalculatorState {
  return { ...initialState, error: 'operand_too_long' }
}
