// End-to-end tests against the running Docker stack, through nginx.
//
//   docker compose up --build --detach --wait
//   node --test "e2e/*.test.mjs"
//
// Set E2E_BASE_URL to point at another address (default http://localhost:3000).
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000'

async function post(path, body, { raw = false } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw ? body : JSON.stringify(body),
  })
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    // not JSON: tests that care inspect `text`
  }
  return { status: response.status, headers: response.headers, text, json }
}

const binary = (op, a, b) => post(`/api/v1/${op}`, { a, b })
const percentage = (value) => post('/api/v1/percentage', { value })
const sqrt = (value) => post('/api/v1/sqrt', { value })

function expectResult(response, result) {
  assert.equal(response.status, 200, response.text)
  assert.deepEqual(response.json, { result })
}

function expectError(response, status, code) {
  assert.equal(response.status, status, response.text)
  assert.equal(response.json?.error?.code, code, response.text)
  assert.ok(response.json.error.message, 'error message is empty')
}

describe('arithmetic is exact and travels as strings', () => {
  it('0.1 + 0.2 is exactly 0.3', async () => expectResult(await binary('add', '0.1', '0.2'), '0.3'))
  it('subtracts into negatives', async () => expectResult(await binary('subtract', '5', '7.5'), '-2.5'))
  it('multiplies negatives', async () => expectResult(await binary('multiply', '-3', '4'), '-12'))
  it('divides with 16 decimals and no trailing zeros', async () => {
    expectResult(await binary('divide', '1', '3'), '0.3333333333333333')
    expectResult(await binary('divide', '10', '4'), '2.5')
  })
  it('keeps precision a JS number cannot hold', async () => {
    expectResult(
      await binary('add', '12345678901234567890.123456789', '0.000000001'),
      '12345678901234567890.12345679',
    )
    expectResult(await binary('multiply', '999999999999', '999999999999'), '999999999998000000000001')
  })
  it('does not produce a negative zero', async () => {
    expectResult(await binary('add', '-0', '0'), '0')
    expectResult(await binary('multiply', '-5', '0'), '0')
  })
  it('accepts a 64-character operand', async () => {
    expectResult(await binary('subtract', '9'.repeat(64), '1'), '9'.repeat(63) + '8')
  })
})

describe('percentage', () => {
  it('divides by 100', async () => expectResult(await percentage('50'), '0.5'))
  it('handles negatives and zero', async () => {
    expectResult(await percentage('-25'), '-0.25')
    expectResult(await percentage('0'), '0')
  })
  it('stays exact beyond 16 decimals', async () =>
    expectResult(await percentage('0.1234567890123456789'), '0.001234567890123456789'))
  it('rejects a binary body', async () =>
    expectError(await post('/api/v1/percentage', { a: '1', b: '2' }), 400, 'invalid_request'))
})

describe('square root', () => {
  it('is exact for perfect squares', async () => {
    expectResult(await sqrt('16'), '4')
    expectResult(await sqrt('0.25'), '0.5')
    expectResult(await sqrt('0'), '0')
  })
  it('rounds to 16 decimals', async () => expectResult(await sqrt('2'), '1.414213562373095'))
  it('rejects a negative number with a 422', async () =>
    expectError(await sqrt('-4'), 422, 'negative_square_root'))
  it('accepts a 64-character operand', async () =>
    expectResult(await sqrt('9'.repeat(64)), '1' + '0'.repeat(32)))
})

describe('power', () => {
  it('raises to positive, zero and negative integer exponents', async () => {
    expectResult(await binary('power', '2', '10'), '1024')
    expectResult(await binary('power', '7', '0'), '1')
    expectResult(await binary('power', '2', '-2'), '0.25')
    expectResult(await binary('power', '3', '-1'), '0.3333333333333333')
  })
  it('handles negative and decimal bases', async () => {
    expectResult(await binary('power', '-2', '3'), '-8')
    expectResult(await binary('power', '1.5', '2'), '2.25')
  })
  it('accepts the exponent limits', async () => {
    expectResult(await binary('power', '1', '1000'), '1')
    expectResult(await binary('power', '1', '-1000'), '1')
  })
  it('rejects a result longer than 64 characters, like an operand', async () => {
    expectResult(await binary('power', '2', '212'), '6582018229284824168619876730229402019930943462534319453394436096')
    expectError(await binary('power', '2', '213'), 422, 'result_too_long')
    expectError(await binary('power', '2', '1000'), 422, 'result_too_long')
    expectError(await binary('multiply', '9'.repeat(64), '9'.repeat(64)), 422, 'result_too_long')
  })
  it('rejects exponents out of range or not integer', async () => {
    expectError(await binary('power', '2', '1001'), 422, 'invalid_exponent')
    expectError(await binary('power', '2', '-1001'), 422, 'invalid_exponent')
    expectError(await binary('power', '2', '0.5'), 422, 'invalid_exponent')
  })
  it('0^0 is undefined and 0^-1 is a division by zero', async () => {
    expectError(await binary('power', '0', '0'), 422, 'invalid_exponent')
    expectError(await binary('power', '0', '-1'), 422, 'division_by_zero')
  })
  it('answers fast for the worst allowed input', async () => {
    const started = Date.now()
    const response = await binary('power', '9'.repeat(64), '1000')
    assert.equal(response.status, 422)
    assert.ok(Date.now() - started < 3000, 'took more than 3 seconds')
  })
})

describe('errors keep the contract', () => {
  it('division by zero is a 422', async () =>
    expectError(await binary('divide', '1', '0'), 422, 'division_by_zero'))

  const invalidBodies = {
    'a JSON number instead of a string': { a: 1, b: 2 },
    'a missing operand': { a: '1' },
    'a null operand': { a: null, b: '1' },
    'an empty string': { a: '', b: '1' },
  }
  for (const [name, body] of Object.entries(invalidBodies)) {
    it(`rejects ${name}`, async () => {
      const response = await post('/api/v1/add', body)
      assert.equal(response.status, 400, response.text)
      assert.equal(response.json?.error?.code, 'invalid_request')
    })
  }

  const badFormats = ['abc', '1e5', '1e999999999', '+1', '.5', '5.', '1,5', ' 1', '--1', '0x10', '9'.repeat(65)]
  for (const operand of badFormats) {
    it(`rejects the operand "${operand.slice(0, 20)}"`, async () =>
      expectError(await binary('add', operand, '1'), 400, 'invalid_operand'))
  }

  it('rejects malformed JSON and an empty body', async () => {
    expectError(await post('/api/v1/add', '{"a":', { raw: true }), 400, 'invalid_request')
    expectError(await post('/api/v1/add', '', { raw: true }), 400, 'invalid_request')
  })

  it('answers every error as JSON', async () => {
    const response = await binary('divide', '1', '0')
    assert.match(response.headers.get('content-type') ?? '', /application\/json/)
  })
})

describe('nginx in front of the backend', () => {
  it('serves the app at / without caching the HTML', async () => {
    const response = await fetch(`${BASE_URL}/`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type') ?? '', /text\/html/)
    assert.match(response.headers.get('cache-control') ?? '', /no-cache/)
    assert.match(await response.text(), /<title>Calculator<\/title>/)
  })

  it('serves hashed assets compressed and cached for a year', async () => {
    const html = await (await fetch(`${BASE_URL}/`)).text()
    const asset = html.match(/\/assets\/[^"']+\.js/)?.[0]
    assert.ok(asset, 'no JS asset referenced in index.html')

    const response = await fetch(`${BASE_URL}${asset}`, { headers: { 'Accept-Encoding': 'gzip' } })
    assert.equal(response.status, 200)
    assert.match(response.headers.get('cache-control') ?? '', /immutable/)
    assert.match(response.headers.get('cache-control') ?? '', /max-age=31536000/)
  })

  it('does not fall back to index.html for a missing asset', async () => {
    const response = await fetch(`${BASE_URL}/assets/does-not-exist.js`)
    assert.equal(response.status, 404)
  })

  it('does not fall back to index.html for an unknown API route', async () => {
    const response = await post('/api/v1/modulo', { a: '1', b: '2' })
    assert.equal(response.status, 404)
    assert.doesNotMatch(response.text, /<html/i)
  })

  it('rejects a GET on an operation route', async () => {
    const response = await fetch(`${BASE_URL}/api/v1/add`)
    assert.ok([404, 405].includes(response.status), `status ${response.status}`)
  })

  it('rejects a body over the 1 MB nginx limit before it reaches the backend', async () => {
    const response = await post('/api/v1/add', `{"a":"1","b":"${'1'.repeat(2_000_000)}"}`, { raw: true })
    assert.equal(response.status, 413)
  })

  it('handles many requests at once', async () => {
    const responses = await Promise.all(
      Array.from({ length: 50 }, (_, i) => binary('add', String(i), '1')),
    )
    responses.forEach((response, i) => expectResult(response, String(i + 1)))
  })
})
