import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalculationError } from '../calculator/errors'
import { apiCalculate } from './client'

const signal = new AbortController().signal

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn((_url: string, _init?: RequestInit) =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function errorBody(code: string, message = 'whatever') {
  return { error: { code, message } }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('posts the operands as JSON strings to the operation route', async () => {
    const fetchMock = mockFetch(json({ result: '0.3' }))

    await apiCalculate({ operator: 'add', a: '0.1', b: '0.2' }, signal)

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/add')
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(init.body).toBe('{"a":"0.1","b":"0.2"}')
    expect(init.signal).toBe(signal)
  })

  it.each(['add', 'subtract', 'multiply', 'divide', 'power'] as const)('uses the %s route', async (operator) => {
    const fetchMock = mockFetch(json({ result: '1' }))
    await apiCalculate({ operator, a: '1', b: '1' }, signal)
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`/api/v1/${operator}`)
  })

  it('posts percentage as a one-operand body to its own route', async () => {
    const fetchMock = mockFetch(json({ result: '0.5' }))

    await expect(apiCalculate({ operator: 'percentage', value: '50' }, signal)).resolves.toBe('0.5')

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/v1/percentage')
    expect(init.body).toBe('{"value":"50"}')
  })

  it('sends long and negative operands untouched', async () => {
    const a = '-12345678901234567890.123456789'
    const fetchMock = mockFetch(json({ result: '0' }))
    await apiCalculate({ operator: 'multiply', a, b: '0.3333333333333333' }, signal)
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(init.body).toBe(`{"a":"${a}","b":"0.3333333333333333"}`)
  })
})

describe('success', () => {
  it('returns the result string exactly as the server sent it', async () => {
    mockFetch(json({ result: '0.3333333333333333' }))
    await expect(apiCalculate({ operator: 'divide', a: '1', b: '3' }, signal)).resolves.toBe(
      '0.3333333333333333',
    )
  })

  it('does not lose precision on results a JS number could not hold', async () => {
    const result = '12345678901234567890.123456789'
    mockFetch(json({ result }))
    await expect(apiCalculate({ operator: 'add', a: '1', b: '1' }, signal)).resolves.toBe(result)
  })

  it.each([
    ['a JSON number instead of a string', { result: 0.3 }],
    ['no result', {}],
    ['a non-object body', 'ok'],
  ])('rejects a 200 with %s as internal_error', async (_name, body) => {
    mockFetch(json(body))
    await expect(apiCalculate({ operator: 'add', a: '1', b: '1' }, signal)).rejects.toMatchObject({
      name: 'CalculationError',
      code: 'internal_error',
    })
  })
})

describe('errors', () => {
  it.each([
    ['invalid_request', 400],
    ['invalid_operand', 400],
    ['division_by_zero', 422],
    ['invalid_exponent', 422],
    ['internal_error', 500],
  ])('maps the backend code %s (status %i)', async (code, status) => {
    mockFetch(json(errorBody(code), status))
    const rejection = apiCalculate({ operator: 'divide', a: '1', b: '0' }, signal)
    await expect(rejection).rejects.toBeInstanceOf(CalculationError)
    await expect(rejection).rejects.toMatchObject({ code })
  })

  it('branches on the code, not on the message', async () => {
    mockFetch(json(errorBody('division_by_zero', 'a completely different message'), 422))
    await expect(apiCalculate({ operator: 'divide', a: '1', b: '0' }, signal)).rejects.toMatchObject({
      code: 'division_by_zero',
    })
  })

  it('treats an unknown backend code as internal_error', async () => {
    mockFetch(json(errorBody('something_new'), 418))
    await expect(apiCalculate({ operator: 'add', a: '1', b: '1' }, signal)).rejects.toMatchObject({
      code: 'internal_error',
    })
  })

  it.each([
    ['an empty 500 (dev proxy with the backend down)', new Response(null, { status: 500 })],
    ['a 502 with an HTML page', new Response('<html>Bad Gateway</html>', { status: 502 })],
    ['a plain-text 404', new Response('404 page not found', { status: 404 })],
    ['a JSON body without the error envelope', json({ detail: 'nope' }, 503)],
  ])('treats %s as network_error', async (_name, response) => {
    mockFetch(response)
    await expect(apiCalculate({ operator: 'add', a: '1', b: '1' }, signal)).rejects.toMatchObject({
      code: 'network_error',
    })
  })

  it('lets a fetch failure propagate (the hook turns it into network_error)', async () => {
    mockFetch(new TypeError('Failed to fetch'))
    const rejection = apiCalculate({ operator: 'add', a: '1', b: '1' }, signal)
    await expect(rejection).rejects.toBeInstanceOf(TypeError)
    await expect(rejection).rejects.not.toBeInstanceOf(CalculationError)
  })
})
