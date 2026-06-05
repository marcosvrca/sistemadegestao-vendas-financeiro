import { useState, FormEvent } from 'react'
import { Save, X } from 'lucide-react'
import { api } from '../api'
import { STATUS_PEDIDO_LABEL } from '../pedidosUi'
import type { Pedido, PedidoCreate, StatusPedido } from '../types'

interface PedidoEditModalProps {
  pedido: Pedido
  onClose: () => void
  onSuccess?: () => void
}

const STATUS_OPCOES: StatusPedido[] = ['pendente', 'em_andamento', 'finalizado', 'cancelado']

export function PedidoEditModal({ pedido, onClose, onSuccess }: PedidoEditModalProps) {
  const [form, setForm] = useState<PedidoCreate & { status: StatusPedido }>({
    dados: pedido.dados,
    tipo: pedido.tipo,
    valor: pedido.valor,
    data_prevista: pedido.data_prevista,
    observacao: pedido.observacao ?? '',
    status: pedido.status,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleChange(field: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
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

    setLoading(true)
    try {
      await api.updatePedido(pedido.id, {
        dados: form.dados.trim(),
        tipo: form.tipo.trim(),
        valor: form.valor,
        data_prevista: form.data_prevista,
        observacao: form.observacao?.trim() || undefined,
        status: form.status,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar pedido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Editar Pedido #{pedido.id}</h2>
            <p className="modal-subtitle">Altere os dados do pedido</p>
          </div>
          <button className="btn btn-secondary btn-sm modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Tipo do Pedido</label>
              <input
                type="text"
                className="form-input"
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

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
              >
                {STATUS_OPCOES.map((s) => (
                  <option key={s} value={s}>{STATUS_PEDIDO_LABEL[s]}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Dados do Pedido</label>
              <textarea
                className="form-textarea"
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
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <Save size={18} />
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
