import { useState } from 'react'
import { PageShell } from '../PageShell'
import { formatarMoeda } from '../../utils'

type Modo = 'de' | 'qual' | 'variacao' | 'desconto'

const MODOS: { id: Modo; label: string; desc: string }[] = [
  { id: 'de', label: 'Quanto é X% de Y?', desc: 'Ex: 10% de R$ 200' },
  { id: 'qual', label: 'X é quantos % de Y?', desc: 'Ex: 50 é quantos % de 200' },
  { id: 'variacao', label: 'Variação percentual', desc: 'De um valor para outro' },
  { id: 'desconto', label: 'Desconto / acréscimo', desc: 'Aplicar % sobre um valor' },
]

function calcular(modo: Modo, a: number, b: number): number | null {
  switch (modo) {
    case 'de':
      return (a / 100) * b
    case 'qual':
      return b === 0 ? null : (a / b) * 100
    case 'variacao':
      return b === 0 ? null : ((a - b) / b) * 100
    case 'desconto':
      return b * (1 - a / 100)
    default:
      return null
  }
}

function formatarResultado(modo: Modo, valor: number): string {
  if (modo === 'qual' || modo === 'variacao') {
    const sinal = valor > 0 ? '+' : ''
    return `${sinal}${valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`
  }
  return formatarMoeda(valor)
}

export function CalculadoraPorcentagemPage() {
  const [modo, setModo] = useState<Modo>('de')
  const [valorA, setValorA] = useState('')
  const [valorB, setValorB] = useState('')

  const a = parseFloat(valorA.replace(',', '.'))
  const b = parseFloat(valorB.replace(',', '.'))
  const valido = !Number.isNaN(a) && !Number.isNaN(b)
  const resultado = valido ? calcular(modo, a, b) : null

  const labels: Record<Modo, [string, string]> = {
    de: ['Percentual (%)', 'Valor base (R$)'],
    qual: ['Valor (R$)', 'Total (R$)'],
    variacao: ['Valor final (R$)', 'Valor inicial (R$)'],
    desconto: ['Percentual (%)', 'Valor original (R$)'],
  }

  return (
    <PageShell
      title="Calculadora de Porcentagem"
      subtitle="Calcule percentuais, descontos e variações"
      width="form"
    >
      <div className="page-stack">
        <div className="form-card form-card--full">
          <div className="pct-modos">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`pct-modo-btn ${modo === m.id ? 'pct-modo-btn-ativo' : ''}`}
                onClick={() => setModo(m.id)}
              >
                <strong>{m.label}</strong>
                <span>{m.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="form-card form-card--full">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">{labels[modo][0]}</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={valorA}
                onChange={(e) => setValorA(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">{labels[modo][1]}</label>
              <input
                type="text"
                inputMode="decimal"
                className="form-input"
                value={valorB}
                onChange={(e) => setValorB(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="pct-resultado">
            {valido && resultado !== null ? (
              <>
                <span className="pct-resultado-label">Resultado</span>
                <span className="pct-resultado-valor">{formatarResultado(modo, resultado)}</span>
              </>
            ) : valido && resultado === null ? (
              <span className="error-message pct-erro">Divisão por zero</span>
            ) : (
              <span className="pct-resultado-placeholder">Preencha os valores acima</span>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  )
}
