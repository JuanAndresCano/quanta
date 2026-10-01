import { describe, expect, it } from 'vitest'
import { countDigits, normalizeOperand } from './operand'

describe('normalizeOperand', () => {
  it.each([
    { raw: '5', want: '5' },
    { raw: '5.', want: '5' },
    { raw: '0.', want: '0' },
    { raw: '.5', want: '0.5' },
    { raw: '-.5', want: '-0.5' },
    { raw: '-5.', want: '-5' },
    { raw: '1.50', want: '1.50' },
    { raw: '-0', want: '0' },
    { raw: '-0.', want: '0' },
    { raw: '-0.0', want: '0.0' },
    { raw: '-0.5', want: '-0.5' },
    { raw: '', want: '0' },
    { raw: '.', want: '0' },
  ])('"$raw" becomes "$want"', ({ raw, want }) => {
    expect(normalizeOperand(raw)).toBe(want)
  })

  it('always produces something the API accepts', () => {
    for (const raw of ['5.', '.5', '-.5', '-0.', '0.', '12.345', '-7']) {
      expect(normalizeOperand(raw)).toMatch(/^-?\d+(\.\d+)?$/)
    }
  })

  it('does not alter long values (no numeric conversion)', () => {
    const long = '12345678901234567890.123456789012345'
    expect(normalizeOperand(long)).toBe(long)
  })
})

describe('countDigits', () => {
  it.each([
    { value: '0', want: 1 },
    { value: '123', want: 3 },
    { value: '-123', want: 3 },
    { value: '0.5', want: 2 },
    { value: '-0.', want: 1 },
  ])('"$value" has $want digits', ({ value, want }) => {
    expect(countDigits(value)).toBe(want)
  })
})
