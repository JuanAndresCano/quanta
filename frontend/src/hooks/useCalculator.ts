import { useEffect, useReducer, type ActionDispatch } from 'react'
import { CalculationError } from '../calculator/errors'
import { initialState, reducer } from '../calculator/reducer'
import type { Action, CalculateFn, CalculatorState } from '../calculator/types'

/**
 * Connects the pure reducer to an asynchronous `calculate` function: when the
 * state holds a `pending` request it is sent, and the answer is dispatched
 * back as `resolve` or `fail`.
 */
export function useCalculator(
  calculate: CalculateFn,
): [CalculatorState, ActionDispatch<[Action]>] {
  const [state, dispatch] = useReducer(reducer, initialState)
  const { pending } = state

  useEffect(() => {
    if (!pending) return

    const controller = new AbortController()
    const { operator, a, b } = pending

    // Pressing AC aborts the request; its outcome no longer matters, even if
    // `calculate` ignores the signal and settles anyway.
    calculate({ operator, a, b }, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        dispatch({ type: 'resolve', result })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        const code = error instanceof CalculationError ? error.code : 'network_error'
        dispatch({ type: 'fail', code })
      })

    return () => controller.abort()
  }, [pending, calculate])

  return [state, dispatch]
}
