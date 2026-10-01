import type { Action, CalculatorState, Digit, Operator } from '../calculator/types'
import { Key } from './Key'

interface KeypadProps {
  state: CalculatorState
  dispatch: (action: Action) => void
}

const OPERATOR_KEYS: Record<Operator, { label: string; name: string }> = {
  divide: { label: '÷', name: 'divide' },
  multiply: { label: '×', name: 'multiply' },
  subtract: { label: '−', name: 'subtract' },
  add: { label: '+', name: 'add' },
}

export function Keypad({ state, dispatch }: KeypadProps) {
  // While a request is in flight only AC is available.
  const busy = state.pending !== null

  const digit = (value: Digit, wide = false) => (
    <Key
      key={value}
      label={value}
      variant="digit"
      wide={wide}
      disabled={busy}
      onPress={() => dispatch({ type: 'digit', digit: value })}
    />
  )

  const operator = (value: Operator) => (
    <Key
      label={OPERATOR_KEYS[value].label}
      ariaLabel={OPERATOR_KEYS[value].name}
      variant="operator"
      active={state.operator === value && state.overwrite}
      disabled={busy}
      onPress={() => dispatch({ type: 'operator', operator: value })}
    />
  )

  return (
    <div className="keypad">
      <Key label="AC" ariaLabel="clear" variant="function" onPress={() => dispatch({ type: 'clear' })} />
      <Key
        label="±"
        ariaLabel="toggle sign"
        variant="function"
        disabled={busy}
        onPress={() => dispatch({ type: 'toggleSign' })}
      />
      {/* Enabled by feat/advanced-operations. */}
      <Key label="%" ariaLabel="percent" variant="function" disabled onPress={() => {}} />
      {operator('divide')}

      {digit('7')}
      {digit('8')}
      {digit('9')}
      {operator('multiply')}

      {digit('4')}
      {digit('5')}
      {digit('6')}
      {operator('subtract')}

      {digit('1')}
      {digit('2')}
      {digit('3')}
      {operator('add')}

      {digit('0', true)}
      <Key
        label="."
        ariaLabel="decimal point"
        variant="digit"
        disabled={busy}
        onPress={() => dispatch({ type: 'decimal' })}
      />
      <Key
        label="="
        ariaLabel="equals"
        variant="operator"
        disabled={busy}
        onPress={() => dispatch({ type: 'equals' })}
      />
    </div>
  )
}
