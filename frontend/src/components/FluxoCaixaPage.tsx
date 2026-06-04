import { useEffect, useMemo, useState } from 'react'
import { Filter, TrendingUp } from 'lucide-react'
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
import {
  buildFluxoCaixaQuery,
  fluxoCaixaFiltrosIniciais,
  PRESETS_FLUXO_CAIXA,
  type FluxoCaixaFiltros,
  type PresetFluxoCaixa,
} from '../fluxoCaixaFilters'
import { KPICard } from './KPICard'
import type { SaidaPorPeriodo, VendaPorPeriodo } from '../types'

export function FluxoCaixaPage() {
  const [filtros, setFiltros] = useState<FluxoCaixaFiltros>(fluxoCaixaFiltrosIniciais)
  const [vendas, setVendas] = useState<VendaPorPeriodo[]>([])
  const [saidas, setSaidas] = useState<SaidaPorPeriodo[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const query = useMemo(() => buildFluxoCaixaQuery(filtros), [filtros])

  useEffect(() => {
    async function carregar() {
      if (!query) {
        setVendas([])
        setSaidas([])
        setLoading(false)
        return
      }

      setLoading(true)
      setErro('')
      try {
        const { params } = query
        const [v, s] = await Promise.all([
          api.getVendasPeriodo(params),
          api.getSaidasPeriodo(params),
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
  }, [query])

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

  function setPreset(preset: PresetFluxoCaixa) {
    setFiltros((atual) => ({ ...atual, preset }))
  }

  const descricaoPeriodo = query?.descricao ?? 'Selecione o período'
  const labelAgrupamento = query?.labelAgrupamento ?? 'Período'
  const aguardandoPersonalizado = filtros.preset === 'personalizado' && !query

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fluxo de Caixa</h1>
        <p className="page-subtitle">
          Entradas (vendas pagas) e saídas com saldo acumulado no período escolhido
        </p>
      </div>

      <div className="dashboard-filtros" style={{ marginBottom: '1.5rem' }}>
        <div className="dashboard-filtros-top">
          <div className="dashboard-filtros-title">
            <Filter size={18} />
            <span>Período de análise</span>
          </div>
          <span className="dashboard-filtros-resumo">{descricaoPeriodo}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setFiltros(fluxoCaixaFiltrosIniciais)}
          >
            Restaurar padrão
          </button>
        </div>

        <div className="kpi-filtros-periodo">
          {PRESETS_FLUXO_CAIXA.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`kpi-filtro-btn ${filtros.preset === id ? 'active' : ''}`}
              onClick={() => setPreset(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {filtros.preset === 'personalizado' && (
          <div className="kpi-filtros-datas">
            <input
              type="date"
              className="form-input form-input-sm"
              value={filtros.dataInicio}
              onChange={(e) =>
                setFiltros((atual) => ({ ...atual, dataInicio: e.target.value }))
              }
            />
            <span className="kpi-filtro-sep">até</span>
            <input
              type="date"
              className="form-input form-input-sm"
              value={filtros.dataFim}
              onChange={(e) =>
                setFiltros((atual) => ({ ...atual, dataFim: e.target.value }))
              }
            />
          </div>
        )}
      </div>

      {erro && <div className="error-message">{erro}</div>}

      {aguardandoPersonalizado && (
        <div className="form-card form-card--full form-card--stack">
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            Informe a data inicial e final para carregar o fluxo de caixa.
          </p>
        </div>
      )}

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label={`Entradas (${descricaoPeriodo})`}
          value={formatarMoeda(totais.entradas)}
          icon={TrendingUp}
          iconColor="green"
        />
        <KPICard
          label={`Saídas (${descricaoPeriodo})`}
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
        <h3 className="chart-title">
          Entradas × Saídas por {labelAgrupamento.toLowerCase()}
        </h3>
        {loading ? (
          <div className="loading">Carregando gráfico...</div>
        ) : aguardandoPersonalizado ? (
          <div className="empty-state">
            <p>Escolha as datas do período personalizado</p>
          </div>
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

      {!loading && !aguardandoPersonalizado && dadosGrafico.length > 0 && (
        <div className="table-card" style={{ marginTop: '1.5rem' }}>
          <h3 className="chart-title" style={{ padding: '1rem 1rem 0' }}>
            Saldo acumulado por {labelAgrupamento.toLowerCase()}
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>{labelAgrupamento}</th>
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
