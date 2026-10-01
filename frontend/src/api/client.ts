import { CalculationError } from '../calculator/errors'
import type { CalculateFn, ErrorCode } from '../calculator/types'

/** Error codes the backend can answer with (`error.code` in the API contract). */
const BACKEND_ERROR_CODES: readonly ErrorCode[] = [
  'invalid_request',
  'invalid_operand',
  'division_by_zero',
  'invalid_exponent',
  'negative_square_root',
  'result_too_long',
  'internal_error',
]

/**
 * Calls `POST /api/v1/<operator>`. Operands go out as JSON strings and the
 * result comes back as one, so no value is ever converted to a JS number.
 *
 * Known backend failures reject with a `CalculationError` carrying its
 * `error.code` (the message is never inspected). A response that is not the
 * backend's own envelope (server down, proxy error, HTML) is a `network_error`.
 * If `fetch` itself throws, the hook treats it as a `network_error` too.
 */
export const apiCalculate: CalculateFn = async (request, signal) => {
  const payload = 'value' in request ? { value: request.value } : { a: request.a, b: request.b }
  const response = await fetch(`/api/v1/${request.operator}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  })
  const body = await readJson(response)

  if (response.ok) {
    if (isRecord(body) && typeof body.result === 'string') return body.result
    throw new CalculationError('internal_error')
  }

  const envelope = isRecord(body) && isRecord(body.error) ? body.error : null
  if (!envelope) throw new CalculationError('network_error')
  throw new CalculationError(toErrorCode(envelope.code))
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toErrorCode(code: unknown): ErrorCode {
  return BACKEND_ERROR_CODES.find((known) => known === code) ?? 'internal_error'
}
