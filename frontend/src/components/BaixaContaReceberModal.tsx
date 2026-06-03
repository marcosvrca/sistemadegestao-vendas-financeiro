import { useEffect, useState, FormEvent } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataIso } from '../utils'
import type { ContaReceber } from '../types'

interface BaixaContaReceberModalProps {
  conta: ContaReceber
  onClose: () => void
  onSuccess?: () => void
}

export function BaixaContaReceberModal({ conta, onClose, onSuccess }: BaixaContaReceberModalProps) {
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [formas, setFormas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getFormasPagamento().then(setFormas)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.baixarContaReceber(conta.id, formaPagamento)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar recebimento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Baixar Recebimento</h2>
            <p className="modal-subtitle">
              Conta #{conta.id} · {conta.cliente}
            </p>
          </div>
          <button className="btn btn-secondary btn-sm modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-preview" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span className="form-preview-label">Descrição</span>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-primary)' }}>{conta.descricao}</p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Vencimento: {formatarDataIso(conta.data_vencimento)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="form-preview-label">Valor</span>
            <span className="form-preview-value">{formatarMoeda(conta.valor)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Forma de Pagamento</label>
              <select
                className="form-select"
                value={formaPagamento}
                onChange={(e) => setFormaPagamento(e.target.value)}
                required
              >
                {formas.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                <CheckCircle size={18} />
                {loading ? 'Registrando...' : 'Confirmar Recebimento'}
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
