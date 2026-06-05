import { useEffect, useMemo, useState } from 'react'
import {
  ClipboardList,
  Search,
  CheckCircle,
  AlertTriangle,
  Clock,
  Package,
  Pencil,
  Trash2,
} from 'lucide-react'
import { api } from '../api'
import {
  STATUS_PEDIDO_LABEL,
  badgeClassStatusPedido,
  diasAteDataPrevista,
  labelDataPrevista,
} from '../pedidosUi'
import { formatarMoeda, formatarDataIso } from '../utils'
import { KPICard } from './KPICard'
import { PedidoEditModal } from './PedidoEditModal'
import type { Pagina } from '../navigation'
import type { Pedido, PedidosResumo, StatusPedido } from '../types'

interface PedidosPageProps {
  onRefresh?: () => void
  onNavigate?: (pagina: Pagina) => void
}

type FiltroStatus = '' | 'ativo' | StatusPedido

export function PedidosPage({ onRefresh, onNavigate }: PedidosPageProps) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [resumo, setResumo] = useState<PedidosResumo | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('ativo')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [finalizando, setFinalizando] = useState<number | null>(null)
  const [editando, setEditando] = useState<Pedido | null>(null)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const params: Record<string, string> = { limite: '500' }
      if (filtroStatus) params.status = filtroStatus
      const [pedidosData, resumoData] = await Promise.all([
        api.getPedidos(params),
        api.getPedidosResumo(),
      ])
      setPedidos(pedidosData)
      setResumo(resumoData)
    } catch (err) {
      setPedidos([])
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar os pedidos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregar()
  }, [filtroStatus])

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return pedidos
    return pedidos.filter(
      (p) =>
        p.dados.toLowerCase().includes(termo)
        || p.tipo.toLowerCase().includes(termo)
        || (p.observacao?.toLowerCase().includes(termo) ?? false),
    )
  }, [pedidos, busca])

  async function handleFinalizar(pedido: Pedido) {
    if (!confirm(`Finalizar o pedido #${pedido.id}?`)) return
    setFinalizando(pedido.id)
    try {
      await api.finalizarPedido(pedido.id)
      carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao finalizar pedido')
    } finally {
      setFinalizando(null)
    }
  }

  async function handleStatusChange(pedido: Pedido, novoStatus: StatusPedido) {
    try {
      await api.updatePedido(pedido.id, { status: novoStatus })
      carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  async function handleExcluir(pedido: Pedido) {
    if (!confirm(`Deseja excluir o pedido #${pedido.id}?`)) return
    try {
      await api.deletePedido(pedido.id)
      carregar()
      onRefresh?.()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao excluir pedido')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Pedidos — Visão Geral</h1>
        <p className="page-subtitle">
          Acompanhe pedidos pendentes, em andamento e finalizados
        </p>
      </div>

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Pendentes"
          value={formatarMoeda(resumo?.total_pendente ?? 0)}
          icon={Clock}
          iconColor="gold"
          subtitle={`${resumo?.quantidade_pendente ?? 0} pedido${(resumo?.quantidade_pendente ?? 0) !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Em andamento"
          value={formatarMoeda(resumo?.total_em_andamento ?? 0)}
          icon={Package}
          iconColor="purple"
          subtitle={`${resumo?.quantidade_em_andamento ?? 0} pedido${(resumo?.quantidade_em_andamento ?? 0) !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Atrasados"
          value={(resumo?.quantidade_atrasados ?? 0).toString()}
          icon={AlertTriangle}
          iconColor="red"
          subtitle={
            (resumo?.quantidade_atrasados ?? 0) > 0
              ? `Total ${formatarMoeda(resumo?.total_atrasados ?? 0)}`
              : 'Nenhum pedido atrasado'
          }
        />
        <KPICard
          label="Finalizados"
          value={formatarMoeda(resumo?.total_finalizado ?? 0)}
          icon={CheckCircle}
          iconColor="green"
          subtitle={`${resumo?.quantidade_finalizado ?? 0} pedido${(resumo?.quantidade_finalizado ?? 0) !== 1 ? 's' : ''}`}
        />
      </div>

      {erro && <div className="error-message">{erro}</div>}

      <div className="table-card">
        <div className="table-toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#64748b',
              }}
            />
            <input
              className="form-input"
              style={{ paddingLeft: 36, maxWidth: '100%' }}
              placeholder="Buscar pedido ou tipo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
          >
            <option value="ativo">Ativos (pendente + em andamento)</option>
            <option value="">Todos</option>
            <option value="pendente">Pendentes</option>
            <option value="em_andamento">Em andamento</option>
            <option value="finalizado">Finalizados</option>
            <option value="cancelado">Cancelados</option>
          </select>
          {onNavigate && (
            <button className="btn btn-primary" onClick={() => onNavigate('novo-pedido')}>
              Novo Pedido
            </button>
          )}
        </div>

        {loading ? (
          <div className="loading">Carregando pedidos...</div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum pedido encontrado</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tipo</th>
                  <th>Dados do Pedido</th>
                  <th>Data Prevista</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Prazo</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidosFiltrados.map((pedido) => {
                  const dias = diasAteDataPrevista(pedido.data_prevista)
                  const podeFinalizar = pedido.status === 'pendente' || pedido.status === 'em_andamento'
                  return (
                    <tr key={pedido.id}>
                      <td>{pedido.id}</td>
                      <td>
                        <span className="badge badge-saida">{pedido.tipo}</span>
                      </td>
                      <td>{pedido.dados}</td>
                      <td>{formatarDataIso(pedido.data_prevista)}</td>
                      <td>
                        <strong>{formatarMoeda(pedido.valor)}</strong>
                      </td>
                      <td>
                        <span className={`badge ${badgeClassStatusPedido(pedido.status)}`}>
                          {STATUS_PEDIDO_LABEL[pedido.status]}
                        </span>
                      </td>
                      <td>
                        {pedido.status !== 'finalizado' && pedido.status !== 'cancelado' && (
                          <span className={`badge ${dias < 0 ? 'badge-error' : dias <= 2 ? 'badge-warn' : ''}`}>
                            {labelDataPrevista(dias)}
                          </span>
                        )}
                      </td>
                      <td className="actions">
                        {podeFinalizar && (
                          <>
                            {pedido.status === 'pendente' && (
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleStatusChange(pedido, 'em_andamento')}
                                title="Marcar em andamento"
                              >
                                Iniciar
                              </button>
                            )}
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleFinalizar(pedido)}
                              disabled={finalizando === pedido.id}
                              title="Finalizar pedido"
                            >
                              <CheckCircle size={14} />
                              {finalizando === pedido.id ? '...' : 'Finalizar'}
                            </button>
                          </>
                        )}
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditando(pedido)}
                          title="Editar pedido"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleExcluir(pedido)}
                          title="Excluir pedido"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editando && (
        <PedidoEditModal
          pedido={editando}
          onClose={() => setEditando(null)}
          onSuccess={() => {
            carregar()
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
