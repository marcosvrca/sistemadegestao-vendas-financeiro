import { useEffect, useMemo, useState } from 'react'
import { Wallet, Lock, AlertCircle, TrendingUp, Pencil } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataIso, toDateInput } from '../utils'
import { KPICard } from './KPICard'
import { EditarFechamentoCaixaModal } from './EditarFechamentoCaixaModal'
import type { CaixaDiario, CaixaDiarioListItem } from '../types'
import type { Pagina } from '../navigation'

interface CaixaVisaoGeralPageProps {
  onNavigate?: (pagina: Pagina) => void
}

export function CaixaVisaoGeralPage({ onNavigate }: CaixaVisaoGeralPageProps) {
  const hoje = toDateInput()
  const [caixaHoje, setCaixaHoje] = useState<CaixaDiario | null>(null)
  const [historico, setHistorico] = useState<CaixaDiarioListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [editando, setEditando] = useState<CaixaDiario | null>(null)
  const [abrindoEdicao, setAbrindoEdicao] = useState(false)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const [dia, lista] = await Promise.all([
        api.getCaixaDia(hoje),
        api.getCaixaLista(30),
      ])
      setCaixaHoje(dia)
      setHistorico(lista)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar visão do caixa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [hoje])

  async function abrirEdicaoFechamento(item: CaixaDiarioListItem) {
    setAbrindoEdicao(true)
    setErro('')
    try {
      const dia = await api.getCaixaDia(item.data.slice(0, 10))
      setEditando(dia)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar fechamento')
    } finally {
      setAbrindoEdicao(false)
    }
  }

  const stats = useMemo(() => {
    const abertos = historico.filter((h) => !h.fechado_em)
    const fechados = historico.filter((h) => h.fechado_em)
    const comDiferenca = fechados.filter((h) => h.diferenca != null && h.diferenca !== 0)
    const faturamento30 = historico.reduce((s, h) => s + h.faturamento, 0)
    return { abertos, fechados, comDiferenca, faturamento30 }
  }, [historico])

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Caixa — Visão Geral</h1>
        <p className="page-subtitle">Situação atual e resumo dos últimos dias com caixa registrado</p>
      </div>

      {erro && <div className="error-message">{erro}</div>}

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Caixa de hoje"
          value={
            loading
              ? '...'
              : !caixaHoje?.aberto
                ? 'Sem abertura'
                : caixaHoje.fechado
                  ? 'Fechado'
                  : 'Aberto'
          }
          icon={Wallet}
          iconColor={caixaHoje?.fechado ? 'green' : caixaHoje?.aberto ? 'gold' : 'blue'}
          subtitle={formatarDataIso(hoje)}
        />
        <KPICard
          label="Dias abertos"
          value={stats.abertos.length.toString()}
          icon={Lock}
          iconColor="gold"
          subtitle="Aguardando fechamento"
        />
        <KPICard
          label="Diferenças (30 dias)"
          value={stats.comDiferenca.length.toString()}
          icon={AlertCircle}
          iconColor="red"
          subtitle="Caixas fechados com sobra ou falta"
        />
        <KPICard
          label="Faturamento (30 dias)"
          value={formatarMoeda(stats.faturamento30)}
          icon={TrendingUp}
          iconColor="green"
          subtitle={`${historico.length} dia${historico.length !== 1 ? 's' : ''} com registro`}
        />
      </div>

      {!loading && caixaHoje?.aberto && (
        <div className="form-card form-card--full form-card--stack">
          <h3 className="chart-title" style={{ marginBottom: '0.75rem' }}>Hoje em detalhe</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Faturamento: {formatarMoeda(caixaHoje.resumo_sistema.faturamento)} · Dinheiro:{' '}
            {formatarMoeda(caixaHoje.resumo_sistema.vendas_dinheiro)} · Saídas dinheiro:{' '}
            {formatarMoeda(caixaHoje.resumo_sistema.saidas_dinheiro)}
            {caixaHoje.saldo_esperado != null && (
              <> · Saldo esperado: {formatarMoeda(caixaHoje.saldo_esperado)}</>
            )}
          </p>
          {onNavigate && !caixaHoje.fechado && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onNavigate('caixa-abertura-fechamento')}
            >
              Ir para abertura / fechamento
            </button>
          )}
        </div>
      )}

      <div className="table-card">
        <h3 className="chart-title" style={{ padding: '1rem 1rem 0' }}>
          Últimos registros de caixa
        </h3>
        {loading ? (
          <div className="loading" style={{ padding: '2rem' }}>Carregando...</div>
        ) : historico.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem' }}>
            <Wallet size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum caixa registrado ainda</p>
            {onNavigate && (
              <button
                type="button"
                className="btn btn-primary"
                style={{ marginTop: 12 }}
                onClick={() => onNavigate('caixa-abertura-fechamento')}
              >
                Registrar abertura de hoje
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Inicial</th>
                  <th>Faturamento</th>
                  <th>Diferença</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {historico.slice(0, 10).map((item) => (
                  <tr key={item.id}>
                    <td>{formatarDataIso(item.data.slice(0, 10))}</td>
                    <td>
                      <span className="badge">{item.fechado_em ? 'Fechado' : 'Aberto'}</span>
                    </td>
                    <td>{formatarMoeda(item.valor_inicial)}</td>
                    <td>{formatarMoeda(item.faturamento)}</td>
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
                    <td className="actions">
                      {item.fechado_em ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => abrirEdicaoFechamento(item)}
                          disabled={abrindoEdicao}
                          title="Editar fechamento"
                        >
                          <Pencil size={14} />
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <EditarFechamentoCaixaModal
          caixa={editando}
          onClose={() => setEditando(null)}
          onSuccess={carregar}
        />
      )}
    </div>
  )
}
