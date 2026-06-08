import { useEffect, useState, FormEvent } from 'react'
import { Save, X, Plus, Trash2 } from 'lucide-react'
import { api } from '../api'
import {
  apiDatetimeToDatetimeLocal,
  calcularValorTotal,
  datetimeLocalParaApi,
  formatarMoeda,
  FORMA_PAGAMENTO_AV,
} from '../utils'
import type { ItemVenda, ProdutoOpcao, Venda, VendaCreate } from '../types'
import {
  montarDadosPagamentoVenda,
  validarPagamentos,
  vendaParaPagamentosForm,
  type PagamentoForm,
} from '../pagamentosVendaHelpers'
import { PagamentosVendaSection } from './PagamentosVendaSection'
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
  const [observacao, setObservacao] = useState(venda.observacao ?? '')
  const [itens, setItens] = useState<ItemForm[]>(() => itensParaForm(venda))
  const [formas, setFormas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dividirPagamento, setDividirPagamento] = useState(
    () => vendaParaPagamentosForm(venda).dividirPagamento,
  )
  const [pagamentos, setPagamentos] = useState<PagamentoForm[]>(
    () => vendaParaPagamentosForm(venda).pagamentos,
  )
  const [opcoesProduto, setOpcoesProduto] = useState<ProdutoOpcao[]>([])

  useEffect(() => {
    api.getFormasPagamentoVenda().then(setFormas)
    api.getProdutoOpcoes().then(setOpcoesProduto)
  }, [])

  useEffect(() => {
    setData(apiDatetimeToDatetimeLocal(venda.data))
    setCliente(venda.cliente)
    setObservacao(venda.observacao ?? '')
    setItens(itensParaForm(venda))
    const pagamentoForm = vendaParaPagamentosForm(venda)
    setDividirPagamento(pagamentoForm.dividirPagamento)
    setPagamentos(pagamentoForm.pagamentos)
    setError('')
  }, [venda])

  const valorTotal = itens.reduce(
    (acc, item) => acc + calcularValorTotal(item.quantidade, item.valor_unitario, item.desconto),
    0,
  )
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

    const erroPagamento = validarPagamentos(pagamentos, valorTotal, dividirPagamento)
    if (erroPagamento) {
      setError(erroPagamento)
      return
    }

    setLoading(true)

    const dadosPagamento = montarDadosPagamentoVenda(pagamentos, valorTotal, dividirPagamento)

    const payload: Partial<VendaCreate> = {
      data: datetimeLocalParaApi(data),
      cliente,
      ...dadosPagamento,
      observacao: observacao || undefined,
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

            <PagamentosVendaSection
              compact
              formas={formas}
              pagamentos={pagamentos}
              dividirPagamento={dividirPagamento}
              valorTotal={valorTotal}
              onDividirPagamentoChange={setDividirPagamento}
              onPagamentosChange={setPagamentos}
            />

            {!dividirPagamento && pagamentos[0]?.forma_pagamento === FORMA_PAGAMENTO_AV ? (
              <p className="av-form-aviso full-width">
                Pagamento pendente — não entra no faturamento até quitar. Altere a forma de
                pagamento quando o cliente pagar.
              </p>
            ) : (
              venda.forma_pagamento === FORMA_PAGAMENTO_AV && (
                <p className="av-form-aviso full-width" style={{ color: 'var(--success, #22c55e)' }}>
                  Ao salvar, a venda entra no faturamento com a data de pagamento de hoje.
                </p>
              )
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
