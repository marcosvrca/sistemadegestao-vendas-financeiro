import { useEffect, useState, FormEvent } from 'react'
import { Save, Trash2, Search, Pencil, ClipboardList, CheckCircle } from 'lucide-react'
import { api } from '../api'
import {
  STATUS_PEDIDO_LABEL,
  badgeClassStatusPedido,
} from '../pedidosUi'
import { formatarMoeda, formatarDataIso, toDateInput } from '../utils'
import type { Pedido, PedidoCreate, StatusPedido } from '../types'

interface NovoPedidoPageProps {
  onRefresh?: () => void
}

const formInicial = (): PedidoCreate => ({
  dados: '',
  tipo: '',
  valor: 0,
  data_prevista: toDateInput(),
  observacao: '',
})

export function NovoPedidoPage({ onRefresh }: NovoPedidoPageProps) {
  const [form, setForm] = useState<PedidoCreate>(formInicial)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [editando, setEditando] = useState<Pedido | null>(null)
  const [finalizando, setFinalizando] = useState<number | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params: Record<string, string> = { status: 'ativo', limite: '100' }
      if (busca) params.busca = busca
      setPedidos(await api.getPedidos(params))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  function handleChange(field: keyof PedidoCreate, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
  }

  function iniciarEdicao(pedido: Pedido) {
    setEditando(pedido)
    setForm({
      dados: pedido.dados,
      tipo: pedido.tipo,
      valor: pedido.valor,
      data_prevista: pedido.data_prevista,
      observacao: pedido.observacao ?? '',
    })
    setError('')
    setSucesso(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm(formInicial())
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.dados.trim()) {
      setError('Informe os dados do pedido')
      return
    }
    if (!form.tipo.trim()) {
      setError('Informe o tipo do pedido')
      return
    }
    if (!form.valor || form.valor <= 0) {
      setError('Informe um valor maior que zero')
      return
    }
    if (!form.data_prevista) {
      setError('Informe a data prevista')
      return
    }

    setSalvando(true)
    const payload = {
      ...form,
      dados: form.dados.trim(),
      tipo: form.tipo.trim(),
      observacao: form.observacao?.trim() || undefined,
    }

    try {
      if (editando) {
        await api.updatePedido(editando.id, payload)
      } else {
        await api.createPedido(payload)
      }
      setForm(formInicial())
      setEditando(null)
      setSucesso(true)
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar pedido')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Deseja excluir este pedido?')) return
    await api.deletePedido(id)
    if (editando?.id === id) cancelarEdicao()
    carregar()
    onRefresh?.()
  }

  async function handleFinalizar(pedido: Pedido) {
    if (!confirm(`Finalizar o pedido #${pedido.id}?`)) return
    setFinalizando(pedido.id)
    try {
      await api.finalizarPedido(pedido.id)
      if (editando?.id === pedido.id) cancelarEdicao()
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao finalizar pedido')
    } finally {
      setFinalizando(null)
    }
  }

  async function handleStatusChange(pedido: Pedido, status: StatusPedido) {
    try {
      await api.updatePedido(pedido.id, { status })
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar status')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Novo Pedido</h1>
        <p className="page-subtitle">
          Registre pedidos com tipo, valor e data prevista de entrega
        </p>
      </div>

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editando ? `Editar Pedido #${editando.id}` : 'Registrar Novo Pedido'}
        </h3>

        {error && <div className="error-message">{error}</div>}
        {sucesso && <div className="success-message">Pedido registrado com sucesso!</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tipo do Pedido</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Encomenda, Reserva, Delivery..."
                value={form.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data Prevista</label>
              <input
                type="date"
                className="form-input"
                value={form.data_prevista}
                onChange={(e) => handleChange('data_prevista', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Valor (R$)</label>
              <input
                type="number"
                className="form-input"
                min={0.01}
                step={0.01}
                value={form.valor || ''}
                onChange={(e) => handleChange('valor', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Dados do Pedido</label>
              <textarea
                className="form-textarea"
                placeholder="Descreva o pedido: itens, cliente, endereço, detalhes..."
                value={form.dados}
                onChange={(e) => handleChange('dados', e.target.value)}
                required
                rows={3}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Observação (opcional)</label>
              <textarea
                className="form-textarea"
                value={form.observacao || ''}
                onChange={(e) => handleChange('observacao', e.target.value)}
                rows={2}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                <Save size={18} />
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Registrar Pedido'}
              </button>
              {editando && (
                <button type="button" className="btn btn-secondary" onClick={cancelarEdicao}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      <div className="table-card">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>Pedidos Ativos</h3>
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
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : pedidos.length === 0 ? (
          <div className="empty-state">
            <ClipboardList size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum pedido ativo</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tipo</th>
                  <th>Dados</th>
                  <th>Data Prevista</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr key={pedido.id}>
                    <td>{pedido.id}</td>
                    <td><span className="badge badge-saida">{pedido.tipo}</span></td>
                    <td>{pedido.dados}</td>
                    <td>{formatarDataIso(pedido.data_prevista)}</td>
                    <td><strong>{formatarMoeda(pedido.valor)}</strong></td>
                    <td>
                      <span className={`badge ${badgeClassStatusPedido(pedido.status)}`}>
                        {STATUS_PEDIDO_LABEL[pedido.status]}
                      </span>
                    </td>
                    <td className="actions">
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
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => iniciarEdicao(pedido)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleExcluir(pedido.id)}
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
