import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Trash2, Wallet } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataIso } from '../utils'
import { KPICard } from './KPICard'
import type { CaixaDiarioListItem } from '../types'
import type { Pagina } from '../navigation'

interface CaixaRelatoriosPageProps {
  onRefresh?: () => void
  onNavigate?: (pagina: Pagina) => void
}

export function CaixaRelatoriosPage({ onRefresh, onNavigate }: CaixaRelatoriosPageProps) {
  const [historico, setHistorico] = useState<CaixaDiarioListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      setHistorico(await api.getCaixaLista(90))
    } catch (err) {
      setHistorico([])
      setErro(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const resumo = useMemo(() => {
    const fechados = historico.filter((h) => h.fechado_em)
    const diferencaTotal = fechados.reduce((s, h) => s + (h.diferenca ?? 0), 0)
    const faturamentoTotal = historico.reduce((s, h) => s + h.faturamento, 0)
    return {
      dias: historico.length,
      fechados: fechados.length,
      diferencaTotal,
      faturamentoTotal,
    }
  }, [historico])

  async function handleExcluir(id: number) {
    if (!confirm('Deseja excluir este registro de caixa?')) return
    await api.deleteCaixa(id)
    carregar()
    onRefresh?.()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Relatórios de Caixa</h1>
        <p className="page-subtitle">
          Histórico de aberturas, fechamentos, faturamento e diferenças por dia
        </p>
      </div>

      {erro && <div className="error-message">{erro}</div>}

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Dias registrados"
          value={resumo.dias.toString()}
          icon={Wallet}
          iconColor="blue"
        />
        <KPICard
          label="Dias fechados"
          value={resumo.fechados.toString()}
          icon={BarChart3}
          iconColor="green"
        />
        <KPICard
          label="Faturamento total"
          value={formatarMoeda(resumo.faturamentoTotal)}
          icon={BarChart3}
          iconColor="gold"
        />
        <KPICard
          label="Soma das diferenças"
          value={formatarMoeda(resumo.diferencaTotal)}
          icon={BarChart3}
          iconColor={resumo.diferencaTotal === 0 ? 'green' : 'red'}
          subtitle="Fechados com valor contado"
        />
      </div>

      <div className="table-card">
        {loading ? (
          <div className="loading" style={{ padding: '2rem' }}>Carregando...</div>
        ) : historico.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <BarChart3 size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum registro para exibir</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Inicial</th>
                  <th>Faturamento</th>
                  <th>Esperado</th>
                  <th>Contado</th>
                  <th>Diferença</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((item) => (
                  <tr key={item.id}>
                    <td>
                      {onNavigate ? (
                        <button
                          type="button"
                          onClick={() => onNavigate('caixa-controle-diario')}
                          style={{
                            color: 'var(--accent-light)',
                            padding: 0,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            textDecoration: 'underline',
                          }}
                        >
                          {formatarDataIso(item.data.slice(0, 10))}
                        </button>
                      ) : (
                        formatarDataIso(item.data.slice(0, 10))
                      )}
                    </td>
                    <td>{formatarMoeda(item.valor_inicial)}</td>
                    <td>{formatarMoeda(item.faturamento)}</td>
                    <td>
                      {item.saldo_esperado != null ? formatarMoeda(item.saldo_esperado) : '—'}
                    </td>
                    <td>
                      {item.valor_fechamento != null ? formatarMoeda(item.valor_fechamento) : '—'}
                    </td>
                    <td>
                      {item.diferenca != null ? (
                        <span
                          className={item.diferenca === 0 ? '' : 'text-saida'}
                          style={item.diferenca === 0 ? { color: 'var(--success)' } : undefined}
                        >
                          {formatarMoeda(item.diferenca)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className="badge">{item.fechado_em ? 'Fechado' : 'Aberto'}</span>
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleExcluir(item.id)}
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
