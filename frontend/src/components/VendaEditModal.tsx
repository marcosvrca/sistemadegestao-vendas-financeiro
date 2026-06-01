import { useEffect, useState, FormEvent } from 'react'
import { Save, X, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'
import {
  apiDatetimeToDatetimeLocal,
  calcularValorTotal,
  datetimeLocalParaApi,
  formatarMoeda,
  FORMA_CARTAO_CREDITO,
} from '../utils'
import type { ItemVenda, ProdutoOpcao, Venda, VendaCreate } from '../types'
import { buscarProdutoOpcao } from '../produtoEstoqueHelpers'

interface VendaEditModalProps {
  venda: Venda
  onClose: () => void
  onSuccess?: () => void
}

interface ItemForm extends ItemVenda {
  key: string
}

function itensParaForm(venda: Venda): ItemForm[] {
  const fonte = venda.itens?.length
    ? venda.itens
    : [{
        produto: venda.produto,
        quantidade: venda.quantidade,
        valor_unitario: venda.valor_unitario,
        desconto: venda.desconto,
      }]

  return fonte.map((item) => ({
    key: crypto.randomUUID(),
    id: item.id,
    produto: item.produto,
    quantidade: item.quantidade,
    valor_unitario: item.valor_unitario,
    desconto: item.desconto,
  }))
}

export function VendaEditModal({ venda, onClose, onSuccess }: VendaEditModalProps) {
  const [data, setData] = useState(apiDatetimeToDatetimeLocal(venda.data))
  const [cliente, setCliente] = useState(venda.cliente)
  const [formaPagamento, setFormaPagamento] = useState(venda.forma_pagamento)
  const [observacao, setObservacao] = useState(venda.observacao ?? '')
  const [itens, setItens] = useState<ItemForm[]>(() => itensParaForm(venda))
  const [formas, setFormas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [houveTroco, setHouveTroco] = useState(Boolean(venda.troco || venda.valor_recebido))
  const [valorRecebido, setValorRecebido] = useState<number | ''>(venda.valor_recebido ?? '')
  const [parcelas, setParcelas] = useState(venda.parcelas ?? 1)
  const [opcoesProduto, setOpcoesProduto] = useState<ProdutoOpcao[]>([])

  useEffect(() => {
    api.getFormasPagamentoVenda().then(setFormas)
    api.getProdutoOpcoes().then(setOpcoesProduto)
  }, [])

  useEffect(() => {
    setData(apiDatetimeToDatetimeLocal(venda.data))
    setCliente(venda.cliente)
    setFormaPagamento(venda.forma_pagamento)
    setObservacao(venda.observacao ?? '')
    setItens(itensParaForm(venda))
    setHouveTroco(Boolean(venda.troco || venda.valor_recebido))
    setValorRecebido(venda.valor_recebido ?? '')
    setParcelas(venda.parcelas ?? 1)
    setError('')
  }, [venda])

  const valorTotal = itens.reduce(
    (acc, item) => acc + calcularValorTotal(item.quantidade, item.valor_unitario, item.desconto),
    0,
  )
  const isDinheiro = formaPagamento === 'Dinheiro'
  const isCredito = formaPagamento === FORMA_CARTAO_CREDITO
  const valorParcela = isCredito && parcelas > 0 ? valorTotal / parcelas : 0
  const valorRecebidoNum = typeof valorRecebido === 'number' ? valorRecebido : 0
  const trocoCalculado =
    houveTroco && valorRecebidoNum > 0
      ? Math.max(valorRecebidoNum - valorTotal, 0)
      : 0

  function atualizarItem(key: string, field: keyof ItemVenda, value: string | number) {
    setItens((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
  }

  function aoConfirmarProduto(key: string, nome: string) {
    const match = buscarProdutoOpcao(nome, opcoesProduto)
    if (!match) return
    setItens((prev) =>
      prev.map((item) =>
        item.key === key
          ? {
              ...item,
              valor_unitario:
                item.valor_unitario <= 0 ? match.preco_venda : item.valor_unitario,
            }
          : item,
      ),
    )
  }

  function adicionarItem() {
    setItens((prev) => [
      ...prev,
      { key: crypto.randomUUID(), produto: '', quantidade: 1, valor_unitario: 0, desconto: 0 },
    ])
  }

  function removerItem(key: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (itens.some((item) => !item.produto.trim() || item.valor_unitario <= 0)) {
      setError('Preencha produto e valor unitário de todos os itens')
      return
    }

    if (houveTroco && isDinheiro && valorRecebidoNum < valorTotal) {
      setError('O valor recebido deve ser maior ou igual ao total da venda')
      return
    }

    setLoading(true)

    const payload: Partial<VendaCreate> = {
      data: datetimeLocalParaApi(data),
      cliente,
      forma_pagamento: formaPagamento,
      observacao: observacao || undefined,
      troco: houveTroco && isDinheiro ? trocoCalculado : null,
      valor_recebido: houveTroco && isDinheiro ? valorRecebidoNum : null,
      parcelas: isCredito ? parcelas : null,
      itens: itens.map(({ produto, quantidade, valor_unitario, desconto }) => ({
        produto: produto.trim(),
        quantidade,
        valor_unitario,
        desconto,
      })),
    }

    try {
      await api.updateVenda(venda.id, payload)
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar alterações')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-content-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Editar Venda #{venda.id}</h2>
            <p className="modal-subtitle">Altere os itens e dados da venda</p>
          </div>
          <button className="btn btn-secondary btn-sm modal-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Data e Hora</label>
              <input
                type="datetime-local"
                className="form-input"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
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
                    {f === 'AV' ? 'AV — Cliente paga depois' : f}
                  </option>
                ))}
              </select>
              {formaPagamento === 'AV' && (
                <p className="av-form-aviso">
                  Pagamento pendente — altere para outra forma quando o cliente quitar.
                </p>
              )}
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
                      {n}x
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

            <div className="form-group full-width">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-input"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <div className="itens-header">
                <h3 className="itens-title">Itens da venda</h3>
                <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarItem}>
                  <Plus size={16} />
                  Adicionar item
                </button>
              </div>

              <div className="itens-lista">
                {itens.map((item, index) => (
                  <div key={item.key} className="item-venda-card">
                    <div className="item-venda-top">
                      <span className="item-venda-numero">Item {index + 1}</span>
                      {itens.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger btn-sm"
                          onClick={() => removerItem(item.key)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <datalist id="produtos-estoque-list-edit">
                      {opcoesProduto.map((p) => (
                        <option key={p.id} value={p.nome} />
                      ))}
                    </datalist>
                    <div className="item-venda-grid">
                      <div className="form-group full-width">
                        <label className="form-label">Produto</label>
                        <input
                          className="form-input"
                          list="produtos-estoque-list-edit"
                          value={item.produto}
                          onChange={(e) => atualizarItem(item.key, 'produto', e.target.value)}
                          onBlur={(e) => aoConfirmarProduto(item.key, e.target.value)}
                          required
                        />
                        {(() => {
                          const catalogo = buscarProdutoOpcao(item.produto, opcoesProduto)
                          if (!catalogo) return null
                          const baixo = item.quantidade > catalogo.estoque_atual
                          return (
                            <span className={`form-hint ${baixo ? 'text-saida' : ''}`}>
                              Estoque: {catalogo.estoque_atual}
                              {baixo && ' (insuficiente)'}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="form-group">
                        <label className="form-label">Quantidade</label>
                        <input
                          type="number"
                          className="form-input"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) =>
                            atualizarItem(item.key, 'quantidade', parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Valor Unitário (R$)</label>
                        <input
                          type="number"
                          className="form-input"
                          min={0}
                          step={0.01}
                          value={item.valor_unitario || ''}
                          onChange={(e) =>
                            atualizarItem(item.key, 'valor_unitario', parseFloat(e.target.value) || 0)
                          }
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Desconto (R$)</label>
                        <input
                          type="number"
                          className="form-input"
                          min={0}
                          step={0.01}
                          value={item.desconto || ''}
                          onChange={(e) =>
                            atualizarItem(item.key, 'desconto', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Subtotal</label>
                        <div className="item-subtotal">
                          {formatarMoeda(
                            calcularValorTotal(item.quantidade, item.valor_unitario, item.desconto),
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                      <span className="form-preview-label">Troco: {formatarMoeda(trocoCalculado)}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="form-group full-width">
              <label className="form-label">Observação (opcional)</label>
              <textarea
                className="form-textarea"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <div className="form-preview">
                <span className="form-preview-label">Valor Total</span>
                <span className="form-preview-value">{formatarMoeda(valorTotal)}</span>
              </div>
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
