import { useState, useEffect, useRef } from 'react'
import { PageShell } from '../PageShell'

function calcular(a: number, b: number, op: string): number | null {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? null : a / b
    default:
      return b
  }
}

function formatarDisplay(valor: number): string {
  const str = String(valor)
  if (str.length > 12) return valor.toExponential(6)
  return str.includes('.') ? parseFloat(valor.toPrecision(12)).toString() : str
}

function teclaEmInput(e: KeyboardEvent): boolean {
  const el = e.target
  if (!(el instanceof HTMLElement)) return false
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable
}

export function CalculadoraPage() {
  const [display, setDisplay] = useState('0')
  const [anterior, setAnterior] = useState<number | null>(null)
  const [operacao, setOperacao] = useState<string | null>(null)
  const [aguardando, setAguardando] = useState(false)

  function inputDigito(digito: string) {
    if (aguardando) {
      setDisplay(digito === '.' ? '0.' : digito)
      setAguardando(false)
      return
    }
    if (digito === '.' && display.includes('.')) return
    if (display === '0' && digito !== '.') {
      setDisplay(digito)
    } else {
      setDisplay(display + digito)
    }
  }

  function limpar() {
    setDisplay('0')
    setAnterior(null)
    setOperacao(null)
    setAguardando(false)
  }

  function apagarUltimo() {
    if (display === 'Erro') {
      limpar()
      return
    }
    if (display.length <= 1) {
      setDisplay('0')
    } else {
      setDisplay(display.slice(0, -1))
    }
    setAguardando(false)
  }

  function inverterSinal() {
    if (display === 'Erro') return
    setDisplay(formatarDisplay(parseFloat(display) * -1))
  }

  function percentual() {
    if (display === 'Erro') return
    setDisplay(formatarDisplay(parseFloat(display) / 100))
  }

  function escolherOperacao(op: string) {
    const atual = display === 'Erro' ? 0 : parseFloat(display)
    if (anterior !== null && operacao && !aguardando) {
      const resultado = calcular(anterior, atual, operacao)
      if (resultado === null) {
        setDisplay('Erro')
        setAnterior(null)
        setOperacao(null)
        return
      }
      setDisplay(formatarDisplay(resultado))
      setAnterior(resultado)
    } else {
      setAnterior(atual)
    }
    setOperacao(op)
    setAguardando(true)
  }

  function igual() {
    if (anterior === null || !operacao) return
    const atual = display === 'Erro' ? 0 : parseFloat(display)
    const resultado = calcular(anterior, atual, operacao)
    if (resultado === null) {
      setDisplay('Erro')
    } else {
      setDisplay(formatarDisplay(resultado))
    }
    setAnterior(null)
    setOperacao(null)
    setAguardando(true)
  }

  function handleBotao(label: string) {
    if (label === 'C') limpar()
    else if (label === '⌫') apagarUltimo()
    else if (label === '±') inverterSinal()
    else if (label === '%') percentual()
    else if (['+', '-', '×', '÷'].includes(label)) escolherOperacao(label)
    else if (label === '=') igual()
    else inputDigito(label)
  }

  const handleBotaoRef = useRef(handleBotao)
  handleBotaoRef.current = handleBotao

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (teclaEmInput(e)) return

      const { key, code } = e

      if (/^[0-9]$/.test(key) || /^Numpad[0-9]$/.test(code)) {
        e.preventDefault()
        handleBotaoRef.current(key.length === 1 ? key : code.replace('Numpad', ''))
        return
      }

      if (key === '.' || key === ',' || code === 'NumpadDecimal') {
        e.preventDefault()
        handleBotaoRef.current('.')
        return
      }

      if (key === '+' || code === 'NumpadAdd') {
        e.preventDefault()
        handleBotaoRef.current('+')
        return
      }

      if (key === '-' || code === 'NumpadSubtract') {
        e.preventDefault()
        handleBotaoRef.current('-')
        return
      }

      if (key === '*' || key === 'x' || key === 'X' || code === 'NumpadMultiply') {
        e.preventDefault()
        handleBotaoRef.current('×')
        return
      }

      if (key === '/' || code === 'NumpadDivide') {
        e.preventDefault()
        handleBotaoRef.current('÷')
        return
      }

      if (key === 'Enter' || key === '=' || code === 'NumpadEnter') {
        e.preventDefault()
        handleBotaoRef.current('=')
        return
      }

      if (key === 'Escape' || key === 'Delete') {
        e.preventDefault()
        handleBotaoRef.current('C')
        return
      }

      if (key === 'Backspace') {
        e.preventDefault()
        handleBotaoRef.current('⌫')
        return
      }

      if (key === '%') {
        e.preventDefault()
        handleBotaoRef.current('%')
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const botoes = [
    ['C', '±', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['0', '.', '='],
  ]

  return (
    <PageShell
      title="Calculadora"
      subtitle="Use o teclado numérico ou digite diretamente: números, + − × ÷, Enter (=), Esc (limpar), Backspace (apagar)"
      width="form"
    >
      <div className="calc-panel calc-wrapper">
        <div className="calc-display" aria-live="polite">
          {operacao && anterior !== null && (
            <span className="calc-expressao">
              {formatarDisplay(anterior)} {operacao}
            </span>
          )}
          <span className="calc-valor">{display}</span>
        </div>

        <div className="calc-teclado">
          {botoes.map((linha, i) => (
            <div key={i} className="calc-linha">
              {linha.map((label) => (
                <button
                  key={label}
                  type="button"
                  className={`calc-btn ${
                    ['+', '-', '×', '÷', '='].includes(label)
                      ? 'calc-btn-op'
                      : ['C', '±', '%'].includes(label)
                        ? 'calc-btn-func'
                        : 'calc-btn-num'
                  } ${label === '0' ? 'calc-btn-zero' : ''}`}
                  onClick={() => handleBotao(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  )
}
