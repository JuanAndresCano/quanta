import { describe, expect, it } from 'vitest'
import { displaySize, formatDisplay } from './format'

describe('formatDisplay', () => {
  it.each([
    { value: '0', want: '0' },
    { value: '999', want: '999' },
    { value: '1000', want: '1,000' },
    { value: '1234567', want: '1,234,567' },
    { value: '-1234567', want: '-1,234,567' },
    { value: '1234.5678', want: '1,234.5678' },
    { value: '0.1234567', want: '0.1234567' },
    { value: '1000.', want: '1,000.' },
    { value: '0.', want: '0.' },
    { value: '12345678901234567890.123456789', want: '12,345,678,901,234,567,890.123456789' },
  ])('"$value" is shown as "$want"', ({ value, want }) => {
    expect(formatDisplay(value)).toBe(want)
  })

  it('leaves anything that is not a plain number untouched', () => {
    expect(formatDisplay('abc')).toBe('abc')
    expect(formatDisplay('')).toBe('')
  })

  it('only adds separators: removing them gives back the original value', () => {
    for (const value of ['1234567.890', '-98765432101', '1000.']) {
      expect(formatDisplay(value).replaceAll(',', '')).toBe(value)
    }
  })
})

describe('displaySize', () => {
  it.each([
    { text: '0', want: 'large' },
    { text: '1,234,567', want: 'medium' },
    { text: '123,456,789.1', want: 'small' },
    { text: '12,345,678,901,234', want: 'tiny' },
  ])('"$text" uses the $want size', ({ text, want }) => {
    expect(displaySize(text)).toBe(want)
  })
})
