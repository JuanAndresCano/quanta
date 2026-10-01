import { describe, expect, it } from 'vitest'
import { initialState, reducer } from './reducer'
import {
  MAX_DIGITS,
  MAX_OPERAND_LENGTH,
  type Action,
  type CalculatorState,
  type Digit,
  type Operator,
} from './types'

const OPERATORS: Record<string, Operator> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
}

/**
 * Tiny DSL to keep the tables readable: digits, `.`, `~` (toggle sign),
 * `+ - * / ^` (operators), `%` (percent), `=` (equals) and `C` (clear).
 */
function keys(input: string): Action[] {
  return [...input].map((ch): Action => {
    if (ch === '.') return { type: 'decimal' }
    if (ch === '~') return { type: 'toggleSign' }
    if (ch === '=') return { type: 'equals' }
    if (ch === '%') return { type: 'percent' }
    if (ch === 'C') return { type: 'clear' }
    if (ch in OPERATORS) return { type: 'operator', operator: OPERATORS[ch] }
    return { type: 'digit', digit: ch as Digit }
  })
}

function press(input: string, from: CalculatorState = initialState): CalculatorState {
  return keys(input).reduce(reducer, from)
}

function answer(state: CalculatorState, result: string): CalculatorState {
  return reducer(state, { type: 'resolve', result })
}

describe('typing a number', () => {
  it.each([
    { input: '123', want: '123' },
    { input: '007', want: '7' },
    { input: '00', want: '0' },
    { input: '0.5', want: '0.5' },
    { input: '.5', want: '0.5' },
    { input: '.', want: '0.' },
    { input: '1.', want: '1.' },
    { input: '1.2.3', want: '1.23' },
    { input: '5~', want: '-5' },
    { input: '5~~', want: '5' },
    { input: '~', want: '0' },
    { input: '0.5~', want: '-0.5' },
    { input: '~5', want: '5' },
  ])('"$input" displays "$want"', ({ input, want }) => {
    expect(press(input).display).toBe(want)
  })

  it('caps the number of digits', () => {
    expect(press('1'.repeat(MAX_DIGITS + 3)).display).toBe('1'.repeat(MAX_DIGITS))
    expect(press('1'.repeat(MAX_DIGITS + 3) + '~').display).toBe('-' + '1'.repeat(MAX_DIGITS))
  })

  it('counts digits after the decimal point but not the dot itself', () => {
    expect(press('1.' + '2'.repeat(20)).display).toBe('1.' + '2'.repeat(MAX_DIGITS - 1))
  })

  it('still allows the decimal point and the sign when the cap is reached', () => {
    expect(press('1'.repeat(MAX_DIGITS) + '.').display).toBe('1'.repeat(MAX_DIGITS) + '.')
    expect(press('1'.repeat(MAX_DIGITS) + '~').display).toBe('-' + '1'.repeat(MAX_DIGITS))
  })
})

describe('choosing an operator', () => {
  it.each([
    { input: '2+', operator: 'add', accumulator: '2' },
    { input: '9-', operator: 'subtract', accumulator: '9' },
    { input: '3*', operator: 'multiply', accumulator: '3' },
    { input: '8/', operator: 'divide', accumulator: '8' },
    { input: '2.+', operator: 'add', accumulator: '2' },
    { input: '+', operator: 'add', accumulator: '0' },
    { input: '2+*', operator: 'multiply', accumulator: '2' },
    { input: '2+*/', operator: 'divide', accumulator: '2' },
  ])('"$input" holds $accumulator and $operator', ({ input, operator, accumulator }) => {
    expect(press(input)).toMatchObject({
      accumulator,
      operator,
      overwrite: true,
      pending: null,
      error: null,
    })
  })

  it('keeps the operand on the display', () => {
    expect(press('42+').display).toBe('42')
  })

  it('does nothing on equals without an operator', () => {
    expect(press('=')).toEqual(initialState)
    expect(press('5=')).toMatchObject({ display: '5', pending: null })
  })
})

describe('equals requests a calculation', () => {
  it.each([
    { input: '2+3=', want: { operator: 'add', a: '2', b: '3', next: null } },
    { input: '5-8=', want: { operator: 'subtract', a: '5', b: '8', next: null } },
    { input: '4*0.5=', want: { operator: 'multiply', a: '4', b: '0.5', next: null } },
    { input: '9/3=', want: { operator: 'divide', a: '9', b: '3', next: null } },
    { input: '2+=', want: { operator: 'add', a: '2', b: '2', next: null } },
    { input: '1.5+2.=', want: { operator: 'add', a: '1.5', b: '2', next: null } },
    { input: '2+3~=', want: { operator: 'add', a: '2', b: '-3', next: null } },
    { input: '5+0.~=', want: { operator: 'add', a: '5', b: '0', next: null } },
    { input: '.5*.5=', want: { operator: 'multiply', a: '0.5', b: '0.5', next: null } },
  ])('"$input" sends $want', ({ input, want }) => {
    expect(press(input).pending).toEqual(want)
  })
})

describe('chaining operations (left to right, like iOS)', () => {
  it('evaluates the pending operation when a new operator is pressed', () => {
    const state = press('2+3*')
    expect(state.pending).toEqual({ operator: 'add', a: '2', b: '3', next: 'multiply' })
  })

  it('continues with the new operator once the result arrives', () => {
    const state = answer(press('2+3*'), '5')
    expect(state).toMatchObject({
      display: '5',
      accumulator: '5',
      operator: 'multiply',
      overwrite: true,
      pending: null,
    })

    const next = press('4=', state)
    expect(next.pending).toEqual({ operator: 'multiply', a: '5', b: '4', next: null })
    expect(answer(next, '20').display).toBe('20')
  })
})

describe('after a result', () => {
  const afterEquals = () => answer(press('2+3='), '5')

  it('shows the result and clears the operation', () => {
    expect(afterEquals()).toEqual({
      display: '5',
      accumulator: null,
      operator: null,
      overwrite: true,
      pending: null,
      error: null,
    })
  })

  it('starts a new number when a digit is typed', () => {
    expect(press('7', afterEquals()).display).toBe('7')
    expect(press('.', afterEquals()).display).toBe('0.')
  })

  it('reuses the result when an operator is pressed', () => {
    expect(press('*', afterEquals())).toMatchObject({ accumulator: '5', operator: 'multiply' })
    expect(press('*2=', afterEquals()).pending).toEqual({
      operator: 'multiply',
      a: '5',
      b: '2',
      next: null,
    })
  })

  it('lets the user flip the sign of the result', () => {
    expect(press('~', afterEquals()).display).toBe('-5')
  })
})

describe('while a request is in flight', () => {
  const busy = press('2+3=')

  it.each(['4', '.', '~', '+', '='])('ignores "%s"', (input) => {
    expect(press(input, busy)).toBe(busy)
  })

  it('can be cancelled with clear, and a late answer is then ignored', () => {
    const cleared = press('C', busy)
    expect(cleared).toEqual(initialState)
    expect(answer(cleared, '5')).toBe(cleared)
  })
})

describe('failures', () => {
  const failed = reducer(press('1/0='), { type: 'fail', code: 'division_by_zero' })

  it('shows the error and resets the operation', () => {
    expect(failed).toEqual({ ...initialState, error: 'division_by_zero' })
  })

  it('ignores a failure nobody asked for', () => {
    const state = press('5')
    expect(reducer(state, { type: 'fail', code: 'internal_error' })).toBe(state)
  })

  it.each(['+', '=', '~'])('ignores "%s" until a new number is typed', (input) => {
    expect(press(input, failed)).toBe(failed)
  })

  it('recovers by typing a new number', () => {
    expect(press('5', failed)).toEqual({ ...initialState, display: '5' })
    expect(press('.', failed)).toEqual({ ...initialState, display: '0.' })
  })

  it('recovers with clear', () => {
    expect(press('C', failed)).toEqual(initialState)
  })
})

describe('numbers longer than the backend accepts', () => {
  const tooLong = '9'.repeat(MAX_OPERAND_LENGTH + 1)
  const tooLongError = { ...initialState, error: 'operand_too_long' }

  it('rejects a long result when it is reused as an operand', () => {
    const state = answer(press('2+3='), tooLong)
    expect(state.display).toBe(tooLong)
    expect(press('+', state)).toEqual(tooLongError)
  })

  it('rejects a long result carried through a chained operation', () => {
    const state = answer(press('2+3*'), tooLong)
    expect(press('4=', state)).toEqual(tooLongError)
  })

  it('accepts a result exactly at the limit', () => {
    const atLimit = '9'.repeat(MAX_OPERAND_LENGTH)
    const state = press('+', answer(press('2+3='), atLimit))
    expect(state).toMatchObject({ accumulator: atLimit, operator: 'add', error: null })
  })
})

describe('string contract', () => {
  it.each(['0.3', '-0.30000000000000004', '12345678901234567890.123456789', '0.3333333333333333'])(
    'keeps the result "%s" exactly as the API returned it',
    (result) => {
      const resolved = answer(press('1+2='), result)
      expect(resolved.display).toBe(result)
      expect(typeof resolved.display).toBe('string')
    },
  )

  it('carries the exact result into the next request', () => {
    const state = answer(press('1+2*'), '0.1000000000000001')
    expect(press('3=', state).pending).toEqual({
      operator: 'multiply',
      a: '0.1000000000000001',
      b: '3',
      next: null,
    })
  })
})

describe('percent', () => {
  it.each([
    { input: '50%', value: '50' },
    { input: '5.%', value: '5' },
    { input: '.5%', value: '0.5' },
    { input: '5~%', value: '-5' },
    { input: '0%', value: '0' },
    { input: '%', value: '0' },
  ])('"$input" requests the percentage of "$value"', ({ input, value }) => {
    expect(press(input).pending).toEqual({ operator: 'percentage', value, next: null })
  })

  it('locks the keypad while the request is in flight', () => {
    const state = press('50%')
    expect(press('7+%=', state)).toBe(state)
  })

  it('replaces the display with the result and starts a new number on the next digit', () => {
    const state = answer(press('50%'), '0.5')
    expect(state).toMatchObject({ display: '0.5', overwrite: true, pending: null, error: null })
    expect(press('7', state).display).toBe('7')
  })

  it('keeps the pending operator, so 200 + 10 % = adds a tenth', () => {
    const afterPercent = answer(press('200+10%'), '0.1')
    expect(afterPercent).toMatchObject({ accumulator: '200', operator: 'add', display: '0.1' })
    expect(press('=', afterPercent).pending).toEqual({
      operator: 'add',
      a: '200',
      b: '0.1',
      next: null,
    })
  })

  it('does nothing special after an error except what typing does', () => {
    const failed = reducer(press('5%'), { type: 'fail', code: 'internal_error' })
    expect(reducer(failed, { type: 'percent' })).toBe(failed)
    expect(press('3%', failed).pending).toEqual({ operator: 'percentage', value: '3', next: null })
  })

  it('ignores a late answer after AC', () => {
    const cleared = press('50%C')
    expect(answer(cleared, '0.5')).toBe(cleared)
  })

  it('rejects a value longer than the backend accepts', () => {
    const state = answer(press('7+3='), '1'.repeat(MAX_OPERAND_LENGTH + 1))
    expect(press('%', state)).toMatchObject({ error: 'operand_too_long', pending: null })
  })
})

describe('power', () => {
  it.each([
    { input: '2^10=', want: { operator: 'power', a: '2', b: '10', next: null } },
    { input: '2^3~=', want: { operator: 'power', a: '2', b: '-3', next: null } },
    { input: '1.5^2.=', want: { operator: 'power', a: '1.5', b: '2', next: null } },
    { input: '5~^2=', want: { operator: 'power', a: '-5', b: '2', next: null } },
    { input: '2^=', want: { operator: 'power', a: '2', b: '2', next: null } },
  ])('"$input" requests the power', ({ input, want }) => {
    expect(press(input).pending).toEqual(want)
  })

  it('chains from left to right like the other operators', () => {
    const state = press('2^3+')
    expect(state.pending).toEqual({ operator: 'power', a: '2', b: '3', next: 'add' })
    expect(answer(state, '8')).toMatchObject({ accumulator: '8', operator: 'add', display: '8' })
  })

  it('replaces a power operator pressed twice', () => {
    expect(press('2^*')).toMatchObject({ operator: 'multiply', pending: null })
  })
})
