import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { apiCalculate } from './api/client'
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
  '^': 'power',
  '=': 'equals',
  '.': 'decimal point',
  '~': 'toggle sign',
  '%': 'percent',
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

  it('enables the percent key', () => {
    setup(vi.fn())
    expect(screen.getByRole('button', { name: 'percent' })).toBeEnabled()
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

  it('sends percent as a one-operand request and shows the result', async () => {
    const calculate = vi.fn<CalculateFn>().mockResolvedValue('0.5')
    const { press, display } = setup(calculate)

    await press('5', '0', '%')

    expect(calculate).toHaveBeenCalledWith(
      { operator: 'percentage', value: '50' },
      expect.any(AbortSignal),
    )
    await waitFor(() => expect(display()).toHaveTextContent('0.5'))
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

describe('through the API client', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function stubBackend(status: number, body: unknown) {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify(body), {
          status,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('shows 0.1 + 0.2 as 0.3, sending the operands as JSON strings', async () => {
    const fetchMock = stubBackend(200, { result: '0.3' })
    const { press, display } = setup(apiCalculate)

    await press('0', '.', '1', '+', '0', '.', '2', '=')

    await waitFor(() => expect(display()).toHaveTextContent('0.3'))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/add')
    expect(init.body).toBe('{"a":"0.1","b":"0.2"}')
  })

  it('sends percent as {"value": ...} and shows the exact result', async () => {
    const fetchMock = stubBackend(200, { result: '0.125' })
    const { press, display } = setup(apiCalculate)

    await press('1', '2', '.', '5', '%')

    await waitFor(() => expect(display()).toHaveTextContent('0.125'))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/percentage')
    expect(init.body).toBe('{"value":"12.5"}')
  })

  it('sends power as a binary request and shows the result', async () => {
    const fetchMock = stubBackend(200, { result: '1024' })
    const { press, display } = setup(apiCalculate)

    await press('2', '^', '1', '0', '=')

    await waitFor(() => expect(display()).toHaveTextContent('1,024'))
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/power')
    expect(init.body).toBe('{"a":"2","b":"10"}')
  })

  it('shows the friendly message for a 422 invalid_exponent', async () => {
    stubBackend(422, { error: { code: 'invalid_exponent', message: 'invalid exponent: ...' } })
    const { press, display } = setup(apiCalculate)

    await press('2', '^', '0', '.', '5', '=')

    await waitFor(() => expect(display()).toHaveTextContent('Invalid exponent'))
  })

  it('shows a 16-decimal division result untouched', async () => {
    stubBackend(200, { result: '0.3333333333333333' })
    const { press, display } = setup(apiCalculate)

    await press('1', '/', '3', '=')

    await waitFor(() => expect(display()).toHaveTextContent('0.3333333333333333'))
  })

  it('shows the friendly message for a 422 division_by_zero', async () => {
    stubBackend(422, { error: { code: 'division_by_zero', message: 'division by zero' } })
    const { press, display } = setup(apiCalculate)

    await press('1', '/', '0', '=')

    await waitFor(() => expect(display()).toHaveTextContent('Cannot divide by zero'))
  })

  it('shows "Cannot reach the server" when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const { press, display } = setup(apiCalculate)

    await press('1', '+', '1', '=')

    await waitFor(() => expect(display()).toHaveTextContent('Cannot reach the server'))
  })
})
