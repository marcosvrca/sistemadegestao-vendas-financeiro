import { useState, FormEvent } from 'react'
import { Lock, X } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataIso } from '../utils'
import type { CaixaDiario } from '../types'

interface EditarFechamentoCaixaModalProps {
  caixa: CaixaDiario
  onClose: () => void
  onSuccess?: () => void
}

export function EditarFechamentoCaixaModal({
  caixa,
  onClose,
  onSuccess,
}: EditarFechamentoCaixaModalProps) {
  const [valorFechamento, setValorFechamento] = useState(
    caixa.valor_fechamento != null ? String(caixa.valor_fechamento) : '',
  )
  const [observacao, setObservacao] = useState(caixa.observacao_fechamento ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const valor = parseFloat(valorFechamento)
    if (Number.isNaN(valor) || valor < 0) {
      setError('Informe o valor contado no caixa (0 ou mais)')
      return
    }

    setLoading(true)
    try {
      await api.atualizarFechamentoCaixa({
        data: caixa.data.slice(0, 10),
        valor_fechamento: valor,
        observacao: observacao || undefined,
      })
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar fechamento')
    } finally {
      setLoading(false)
    }
  }

  const novaDiferenca =
    caixa.saldo_esperado != null && valorFechamento !== ''
      ? parseFloat(valorFechamento) - caixa.saldo_esperado
      : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Editar fechamento</h2>
            <p className="modal-subtitle">
              Caixa de {formatarDataIso(caixa.data.slice(0, 10))}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {caixa.saldo_esperado != null && (
          <div className="form-preview" style={{ marginBottom: '1.25rem' }}>
            <div>
              <span className="form-preview-label">Saldo esperado</span>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-primary)' }}>
                {formatarMoeda(caixa.saldo_esperado)}
              </p>
            </div>
            {novaDiferenca != null && !Number.isNaN(novaDiferenca) && (
              <div style={{ textAlign: 'right' }}>
                <span className="form-preview-label">Nova diferença</span>
                <span
                  className="form-preview-value"
                  style={{ color: novaDiferenca === 0 ? 'var(--success)' : 'var(--danger)' }}
                >
                  {formatarMoeda(novaDiferenca)}
                </span>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Valor contado no caixa (R$)</label>
            <input
              type="number"
              className="form-input"
              min={0}
              step={0.01}
              value={valorFechamento}
              onChange={(e) => setValorFechamento(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Observação (opcional)</label>
            <textarea
              className="form-textarea"
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex.: conferência após contagem"
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Lock size={18} />
              {loading ? 'Salvando...' : 'Salvar fechamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
