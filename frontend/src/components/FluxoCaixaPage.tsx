import { useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '../api'
import { formatarMoeda, formatarPeriodo } from '../utils'
import { KPICard } from './KPICard'
import type { SaidaPorPeriodo, VendaPorPeriodo } from '../types'

function ultimos30DiasParams(): Record<string, string> {
  const fim = new Date()
  const inicio = new Date()
  inicio.setDate(inicio.getDate() - 29)
  return {
    filtro: 'periodo',
    data_inicio: inicio.toISOString(),
    data_fim: fim.toISOString(),
  }
}

export function FluxoCaixaPage() {
  const [vendas, setVendas] = useState<VendaPorPeriodo[]>([])
  const [saidas, setSaidas] = useState<SaidaPorPeriodo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setErro('')
      try {
        const params = ultimos30DiasParams()
        const [v, s] = await Promise.all([
          api.getVendasPeriodo({ ...params, periodo: 'dia' }),
          api.getSaidasPeriodo({ ...params, periodo: 'dia' }),
        ])
        setVendas(v)
        setSaidas(s)
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro ao carregar fluxo de caixa')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [])

  const { dadosGrafico, totais } = useMemo(() => {
    const mapa = new Map<string, { periodo: string; entradas: number; saidas: number }>()

    for (const v of vendas) {
      const atual = mapa.get(v.periodo) ?? { periodo: v.periodo, entradas: 0, saidas: 0 }
      atual.entradas += v.total
      mapa.set(v.periodo, atual)
    }
    for (const s of saidas) {
      const atual = mapa.get(s.periodo) ?? { periodo: s.periodo, entradas: 0, saidas: 0 }
      atual.saidas += s.total
      mapa.set(s.periodo, atual)
    }

    let saldo = 0
    const ordenado = Array.from(mapa.values())
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .map((item) => {
        const liquido = item.entradas - item.saidas
        saldo += liquido
        return {
          ...item,
          label: formatarPeriodo(item.periodo),
          liquido,
          saldoAcumulado: saldo,
        }
      })

    const totalEntradas = vendas.reduce((acc, v) => acc + v.total, 0)
    const totalSaidas = saidas.reduce((acc, s) => acc + s.total, 0)

    return {
      dadosGrafico: ordenado,
      totais: {
        entradas: totalEntradas,
        saidas: totalSaidas,
        liquido: totalEntradas - totalSaidas,
      },
    }
  }, [vendas, saidas])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fluxo de Caixa</h1>
        <p className="page-subtitle">
          Entradas (vendas pagas) e saídas dos últimos 30 dias, com saldo acumulado
        </p>
      </div>

      {erro && <div className="error-message">{erro}</div>}

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Entradas (30 dias)"
          value={formatarMoeda(totais.entradas)}
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          label="Saídas (30 dias)"
          value={formatarMoeda(totais.saidas)}
          icon={TrendingUp}
          iconColor="red"
        />
        <KPICard
          label="Saldo do período"
          value={formatarMoeda(totais.liquido)}
          icon={TrendingUp}
          iconColor={totais.liquido >= 0 ? 'blue' : 'purple'}
        />
      </div>

      <div className="chart-card">
        <h3 className="chart-title">Entradas × Saídas por dia</h3>
        {loading ? (
          <div className="loading">Carregando gráfico...</div>
        ) : dadosGrafico.length === 0 ? (
          <div className="empty-state">
            <p>Sem movimentação no período</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={dadosGrafico}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(value: number) => formatarMoeda(value)}
                contentStyle={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                }}
              />
              <Legend />
              <Bar dataKey="entradas" name="Entradas" fill="var(--success)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {!loading && dadosGrafico.length > 0 && (
        <div className="table-card" style={{ marginTop: '1.5rem' }}>
          <h3 className="chart-title" style={{ padding: '1rem 1rem 0' }}>
            Saldo acumulado por dia
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Dia</th>
                  <th>Entradas</th>
                  <th>Saídas</th>
                  <th>Líquido</th>
                  <th>Acumulado</th>
                </tr>
              </thead>
              <tbody>
                {dadosGrafico.map((row) => (
                  <tr key={row.periodo}>
                    <td>{row.label}</td>
                    <td style={{ color: 'var(--success)' }}>{formatarMoeda(row.entradas)}</td>
                    <td className="text-saida">{formatarMoeda(row.saidas)}</td>
                    <td>{formatarMoeda(row.liquido)}</td>
                    <td><strong>{formatarMoeda(row.saldoAcumulado)}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
