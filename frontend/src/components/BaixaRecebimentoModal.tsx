import { useEffect, useState, FormEvent } from 'react'
import { CheckCircle, X } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, FORMA_CARTAO_CREDITO } from '../utils'
import type { Venda } from '../types'

interface BaixaRecebimentoModalProps {
  venda: Venda
  onClose: () => void
  onSuccess?: () => void
}

export function BaixaRecebimentoModal({ venda, onClose, onSuccess }: BaixaRecebimentoModalProps) {
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [formas, setFormas] = useState<string[]>([])
  const [houveTroco, setHouveTroco] = useState(false)
  const [valorRecebido, setValorRecebido] = useState<number | ''>('')
  const [parcelas, setParcelas] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getFormasPagamentoVenda().then((lista) => {
      setFormas(lista.filter((f) => f !== 'AV'))
    })
  }, [])

  const isDinheiro = formaPagamento === 'Dinheiro'
  const isCredito = formaPagamento === FORMA_CARTAO_CREDITO
  const valorRecebidoNum = typeof valorRecebido === 'number' ? valorRecebido : 0
  const trocoCalculado =
    houveTroco && valorRecebidoNum > 0
      ? Math.max(valorRecebidoNum - venda.valor, 0)
      : 0
  const valorParcela = isCredito && parcelas > 0 ? venda.valor / parcelas : 0

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (houveTroco && isDinheiro && valorRecebidoNum < venda.valor) {
      setError('O valor recebido deve ser maior ou igual ao total da venda')
      return
    }

    setLoading(true)
    try {
      await api.updateVenda(venda.id, {
        forma_pagamento: formaPagamento,
        troco: houveTroco && isDinheiro ? trocoCalculado : undefined,
        valor_recebido: houveTroco && isDinheiro ? valorRecebidoNum : undefined,
        parcelas: isCredito ? parcelas : undefined,
      })
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
            <p className="modal-subtitle">Venda #{venda.id} · {venda.cliente}</p>
          </div>
          <button className="btn btn-secondary btn-sm modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-preview" style={{ marginBottom: '1.25rem' }}>
          <div>
            <span className="form-preview-label">Produto</span>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-primary)' }}>{venda.produto}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="form-preview-label">Valor a receber</span>
            <span className="form-preview-value">{formatarMoeda(venda.valor)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label">Forma de Pagamento</label>
              <select
                className="form-select"
                value={formaPagamento}
                onChange={(e) => {
                  const val = e.target.value
                  setFormaPagamento(val)
                  if (val !== 'Dinheiro') {
                    setHouveTroco(false)
                    setValorRecebido('')
                  }
                  if (val !== FORMA_CARTAO_CREDITO) {
                    setParcelas(1)
                  }
                }}
                required
              >
                {formas.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <p className="av-form-aviso" style={{ color: 'var(--success, #22c55e)' }}>
                Ao confirmar, a venda entra no faturamento com a data de pagamento de hoje.
              </p>
            </div>

            {isCredito && (
              <div className="form-group">
                <label className="form-label">Parcelamento</label>
                <select
                  className="form-select"
                  value={parcelas}
                  onChange={(e) => setParcelas(parseInt(e.target.value, 10) || 1)}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x de {formatarMoeda(venda.valor / n)}
                    </option>
                  ))}
                </select>
                {parcelas > 1 && (
                  <p className="venda-compact-parcelas-hint" style={{ marginTop: '0.35rem' }}>
                    {parcelas}x de {formatarMoeda(valorParcela)}
                  </p>
                )}
              </div>
            )}

            {isDinheiro && (
              <div className="form-group full-width troco-section">
                <label className="import-checkbox">
                  <input
                    type="checkbox"
                    checked={houveTroco}
                    onChange={(e) => {
                      setHouveTroco(e.target.checked)
                      if (!e.target.checked) setValorRecebido('')
                    }}
                  />
                  Houve troco?
                </label>
                {houveTroco && (
                  <div className="troco-fields">
                    <div className="form-group">
                      <label className="form-label">Valor que o cliente passou (R$)</label>
                      <input
                        type="number"
                        className="form-input"
                        min={0}
                        step={0.01}
                        value={valorRecebido}
                        onChange={(e) =>
                          setValorRecebido(e.target.value ? parseFloat(e.target.value) : '')
                        }
                      />
                    </div>
                    <div className="form-preview troco-preview">
                      <span className="form-preview-label">
                        Troco: {formatarMoeda(trocoCalculado)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

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
