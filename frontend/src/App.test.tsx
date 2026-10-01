import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { CalculationError } from './calculator/errors'
import type { CalculateFn } from './calculator/types'

function setup(calculate: CalculateFn) {
  const user = userEvent.setup()
  render(<App calculate={calculate} />)

  return {
    display: () => screen.getByRole('status'),
    // Presses keys by accessible name; digits and symbols are mapped below.
    press: async (...keys: string[]) => {
      for (const key of keys) {
        await user.click(screen.getByRole('button', { name: KEY_NAMES[key] ?? key }))
      }
    },
  }
}

const KEY_NAMES: Record<string, string> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '=': 'equals',
  '.': 'decimal point',
  '~': 'toggle sign',
  C: 'clear',
}

/** A promise settled by hand, to observe the "request in flight" state. */
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

describe('typing', () => {
  it('shows the number being typed, with thousands separators', async () => {
    const { press, display } = setup(vi.fn())
    await press('1', '2', '3', '4')
    expect(display()).toHaveTextContent('1,234')
  })

  it('keeps the decimal point the user just typed', async () => {
    const { press, display } = setup(vi.fn())
    await press('1', '.')
    expect(display()).toHaveTextContent('1.')
  })

  it('flips the sign', async () => {
    const { press, display } = setup(vi.fn())
    await press('5', '~')
    expect(display()).toHaveTextContent('-5')
  })

  it('highlights the operator that is waiting for its second operand', async () => {
    const { press } = setup(vi.fn())
    const add = screen.getByRole('button', { name: 'add' })
    expect(add).toHaveAttribute('aria-pressed', 'false')

    await press('2', '+')
    expect(add).toHaveAttribute('aria-pressed', 'true')

    await press('3')
    expect(add).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps the percent key disabled until it is implemented', () => {
    setup(vi.fn())
    expect(screen.getByRole('button', { name: 'percent' })).toBeDisabled()
  })
})

describe('calculating', () => {
  it('sends operands as strings and shows the result', async () => {
    const calculate = vi.fn<CalculateFn>().mockResolvedValue('5')
    const { press, display } = setup(calculate)

    await press('2', '+', '3', '=')

    expect(calculate).toHaveBeenCalledWith(
      { operator: 'add', a: '2', b: '3' },
      expect.any(AbortSignal),
    )
    await waitFor(() => expect(display()).toHaveTextContent('5'))
  })

  it('shows 0.1 + 0.2 as exactly 0.3', async () => {
    const calculate = vi.fn<CalculateFn>().mockResolvedValue('0.3')
    const { press, display } = setup(calculate)

    await press('0', '.', '1', '+', '0', '.', '2', '=')

    expect(calculate.mock.calls[0]?.[0]).toEqual({ operator: 'add', a: '0.1', b: '0.2' })
    await waitFor(() => expect(display()).toHaveTextContent('0.3'))
  })

  it('normalizes a trailing dot before sending', async () => {
    const calculate = vi.fn<CalculateFn>().mockResolvedValue('7')
    const { press } = setup(calculate)

    await press('5', '.', '+', '2', '.', '=')

    expect(calculate.mock.calls[0]?.[0]).toEqual({ operator: 'add', a: '5', b: '2' })
  })

  it('chains operations from left to right', async () => {
    const calculate = vi.fn<CalculateFn>().mockResolvedValueOnce('5').mockResolvedValueOnce('20')
    const { press, display } = setup(calculate)

    await press('2', '+', '3', '*')
    await waitFor(() => expect(display()).toHaveTextContent('5'))

    await press('4', '=')
    expect(calculate.mock.calls[1]?.[0]).toEqual({ operator: 'multiply', a: '5', b: '4' })
    await waitFor(() => expect(display()).toHaveTextContent('20'))
  })
})

describe('while waiting for the backend', () => {
  it('locks the keypad except for clear', async () => {
    const pending = deferred<string>()
    const { press, display } = setup(() => pending.promise)

    await press('2', '+', '3', '=')

    expect(display()).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'equals' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'clear' })).toBeEnabled()

    pending.resolve('5')
    await waitFor(() => expect(display()).toHaveAttribute('aria-busy', 'false'))
    expect(display()).toHaveTextContent('5')
  })

  it('cancels the request on clear and ignores its late answer', async () => {
    const pending = deferred<string>()
    let signal: AbortSignal | undefined
    const { press, display } = setup((_request, s) => {
      signal = s
      return pending.promise
    })

    await press('2', '+', '3', '=', 'C')
    expect(signal?.aborted).toBe(true)

    pending.resolve('5')
    await Promise.resolve()
    expect(display()).toHaveTextContent('0')
  })
})

describe('errors', () => {
  it.each([
    { error: new CalculationError('division_by_zero'), message: 'Cannot divide by zero' },
    { error: new CalculationError('internal_error'), message: 'Server error' },
    { error: new CalculationError('invalid_operand'), message: 'Invalid number' },
    { error: new Error('connection refused'), message: 'Cannot reach the server' },
  ])('shows "$message"', async ({ error, message }) => {
    const { press, display } = setup(() => Promise.reject(error))

    await press('1', '/', '0', '=')

    await waitFor(() => expect(display()).toHaveTextContent(message))
  })

  it('recovers when a new number is typed', async () => {
    const { press, display } = setup(() =>
      Promise.reject(new CalculationError('division_by_zero')),
    )

    await press('1', '/', '0', '=')
    await waitFor(() => expect(display()).toHaveTextContent('Cannot divide by zero'))

    await press('8')
    expect(display()).toHaveTextContent('8')
  })
})
