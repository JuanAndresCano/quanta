import { apiCalculate } from './api/client'
import type { CalculateFn } from './calculator/types'
import { Display } from './components/Display'
import { Keypad } from './components/Keypad'
import { useCalculator } from './hooks/useCalculator'
import './App.css'

interface AppProps {
  calculate?: CalculateFn
}

export default function App({ calculate = apiCalculate }: AppProps) {
  const [state, dispatch] = useCalculator(calculate)

  return (
    <main className="calculator">
      <Display value={state.display} error={state.error} loading={state.pending !== null} />
      <Keypad state={state} dispatch={dispatch} />
    </main>
  )
}
