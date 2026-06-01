import { useEffect, useState, FormEvent } from 'react'
import { Save, Plus, Trash2, CheckCircle2, RotateCcw } from 'lucide-react'
import { api } from '../api'
import {
  calcularValorTotal,
  datetimeLocalParaApi,
  formatarMoeda,
  FORMA_CARTAO_CREDITO,
  toDatetimeLocal,
} from '../utils'
import type { ItemVenda, ProdutoOpcao, VendaCreate } from '../types'
import { buscarProdutoOpcao } from '../produtoEstoqueHelpers'

interface VendaFormProps {
  onSuccess?: () => void
}

interface ItemForm extends ItemVenda {
  key: string
}

const CLIENTES_RAPIDOS = ['Cliente avulso', 'Congregação', 'Visitante']

const PAGAMENTO_CURTO: Record<string, string> = {
  'Cartão Débito': 'Débito',
  'Cartão Crédito': 'Crédito',
  AV: 'AV',
}

function criarItemVazio(): ItemForm {
  return {
    key: crypto.randomUUID(),
    produto: '',
    quantidade: 1,
    valor_unitario: 0,
    desconto: 0,
  }
}

const cabecalhoInicial = {
  data: toDatetimeLocal(),
  cliente: 'Cliente avulso',
  forma_pagamento: 'Dinheiro',
  observacao: '',
}

export function VendaForm({ onSuccess }: VendaFormProps) {
  const [cabecalho, setCabecalho] = useState(cabecalhoInicial)
  const [itens, setItens] = useState<ItemForm[]>([criarItemVazio()])
  const [formas, setFormas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [houveTroco, setHouveTroco] = useState(false)
  const [valorRecebido, setValorRecebido] = useState<number | ''>('')
  const [parcelas, setParcelas] = useState(1)
  const [opcoesProduto, setOpcoesProduto] = useState<ProdutoOpcao[]>([])

  useEffect(() => {
    api.getFormasPagamentoVenda().then(setFormas)
    api.getProdutoOpcoes().then(setOpcoesProduto)
  }, [])

  const valorTotal = itens.reduce(
    (acc, item) => acc + calcularValorTotal(item.quantidade, item.valor_unitario, item.desconto),
    0,
  )
  const isDinheiro = cabecalho.forma_pagamento === 'Dinheiro'
  const isAV = cabecalho.forma_pagamento === 'AV'
  const isCredito = cabecalho.forma_pagamento === FORMA_CARTAO_CREDITO
  const valorParcela = isCredito && parcelas > 0 ? valorTotal / parcelas : 0
  const valorRecebidoNum = typeof valorRecebido === 'number' ? valorRecebido : 0
  const trocoCalculado =
    houveTroco && valorRecebidoNum > 0 ? Math.max(valorRecebidoNum - valorTotal, 0) : 0

  function handleCabecalho(field: keyof typeof cabecalhoInicial, value: string) {
    setCabecalho((prev) => {
      const next = { ...prev, [field]: value }
      if (field === 'forma_pagamento') {
        if (value !== 'Dinheiro') {
          setHouveTroco(false)
          setValorRecebido('')
        }
        if (value !== FORMA_CARTAO_CREDITO) {
          setParcelas(1)
        }
      }
      return next
    })
    setSucesso(false)
  }

  function atualizarItem(key: string, field: keyof ItemVenda, value: string | number) {
    setItens((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
    setSucesso(false)
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
    setItens((prev) => [...prev, criarItemVazio()])
    setSucesso(false)
  }

  function removerItem(key: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((item) => item.key !== key) : prev))
    setSucesso(false)
  }

  function resetForm() {
    setCabecalho({ ...cabecalhoInicial, data: toDatetimeLocal() })
    setItens([criarItemVazio()])
    setHouveTroco(false)
    setValorRecebido('')
    setParcelas(1)
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const itensInvalidos = itens.some(
      (item) => !item.produto.trim() || item.valor_unitario <= 0,
    )
    if (itensInvalidos) {
      setError('Preencha produto e valor unitário em todos os itens.')
      return
    }

    if (houveTroco && isDinheiro) {
      if (!valorRecebidoNum || valorRecebidoNum <= 0) {
        setError('Informe o valor que o cliente passou.')
        return
      }
      if (valorRecebidoNum < valorTotal) {
        setError('Valor recebido deve ser ≥ total da venda.')
        return
      }
    }

    if (isCredito && parcelas < 1) {
      setError('Informe o número de parcelas.')
      return
    }

    const payload: VendaCreate = {
      data: cabecalho.data ? datetimeLocalParaApi(cabecalho.data) : undefined,
      cliente: cabecalho.cliente,
      forma_pagamento: cabecalho.forma_pagamento,
      observacao: cabecalho.observacao || undefined,
      valor_recebido: houveTroco && isDinheiro ? valorRecebidoNum : undefined,
      troco: houveTroco && isDinheiro ? trocoCalculado : undefined,
      parcelas: isCredito ? parcelas : undefined,
      itens: itens.map(({ produto, quantidade, valor_unitario, desconto }) => ({
        produto: produto.trim(),
        quantidade,
        valor_unitario,
        desconto,
      })),
    }

    setLoading(true)
    try {
      await api.createVenda(payload)
      resetForm()
      setSucesso(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar venda')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="venda-compact">
      <header className="venda-compact-top">
        <div>
          <h1 className="page-title">Nova Venda</h1>
          {sucesso && (
            <span className="venda-compact-ok">
              <CheckCircle2 size={14} /> Salva
            </span>
          )}
        </div>
        <div className="venda-compact-total" aria-live="polite">
          <span>Total</span>
          <strong>{formatarMoeda(valorTotal)}</strong>
        </div>
      </header>

      {error && <div className="error-message venda-compact-msg">{error}</div>}

      <form className="venda-compact-card" onSubmit={handleSubmit}>
        <div className="venda-compact-row venda-compact-row--3">
          <div className="form-group">
            <label className="form-label">Data / hora</label>
            <input
              type="datetime-local"
              className="form-input"
              value={cabecalho.data}
              onChange={(e) => handleCabecalho('data', e.target.value)}
              required
            />
          </div>
          <div className="form-group venda-compact-cliente">
            <label className="form-label">Cliente</label>
            <input
              type="text"
              className="form-input"
              value={cabecalho.cliente}
              onChange={(e) => handleCabecalho('cliente', e.target.value)}
            />
            <div className="venda-compact-chips">
              {CLIENTES_RAPIDOS.map((nome) => (
                <button
                  key={nome}
                  type="button"
                  className={`venda-compact-chip ${cabecalho.cliente === nome ? 'active' : ''}`}
                  onClick={() => handleCabecalho('cliente', nome)}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Obs. (opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Anotação rápida..."
              value={cabecalho.observacao}
              onChange={(e) => handleCabecalho('observacao', e.target.value)}
            />
          </div>
        </div>

        <div className="venda-compact-row venda-compact-pagamento">
          <span className="form-label venda-compact-pag-label">Pagamento</span>
          <div className="venda-compact-pag-btns" role="group" aria-label="Forma de pagamento">
            {formas.map((forma) => (
              <button
                key={forma}
                type="button"
                className={`venda-compact-pag ${cabecalho.forma_pagamento === forma ? 'active' : ''} ${forma === 'AV' ? 'is-av' : ''}`}
                onClick={() => handleCabecalho('forma_pagamento', forma)}
              >
                {PAGAMENTO_CURTO[forma] ?? forma}
              </button>
            ))}
          </div>
          {isAV && <span className="venda-compact-tag-av">Pendente até pagar</span>}
        </div>

        {isCredito && (
          <div className="venda-compact-parcelas">
            <div className="form-group venda-compact-parcelas-field">
              <label className="form-label">Parcelamento</label>
              <select
                className="form-select"
                value={parcelas}
                onChange={(e) => {
                  setParcelas(parseInt(e.target.value, 10) || 1)
                  setSucesso(false)
                }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x {n === 1 ? '(à vista no crédito)' : ''}
                  </option>
                ))}
              </select>
            </div>
            {parcelas > 1 && (
              <p className="venda-compact-parcelas-hint">
                {parcelas}x de <strong>{formatarMoeda(valorParcela)}</strong> — total{' '}
                {formatarMoeda(valorTotal)}
              </p>
            )}
          </div>
        )}

        <div className="venda-compact-itens">
          <div className="venda-compact-itens-head">
            <span className="form-label">Itens</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarItem}>
              <Plus size={14} /> Item
            </button>
          </div>

          <datalist id="produtos-estoque-list">
            {opcoesProduto.map((p) => (
              <option key={p.id} value={p.nome} />
            ))}
          </datalist>

          <div className="venda-compact-tabela-wrap">
            <table className="venda-compact-tabela">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Unit. R$</th>
                  <th>Desc. R$</th>
                  <th className="text-right">Subtotal</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {itens.map((item) => {
                  const subtotal = calcularValorTotal(
                    item.quantidade,
                    item.valor_unitario,
                    item.desconto,
                  )
                  const catalogo = buscarProdutoOpcao(item.produto, opcoesProduto)
                  const estoqueInsuficiente =
                    catalogo && item.quantidade > catalogo.estoque_atual
                  return (
                    <tr key={item.key}>
                      <td>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Produto"
                          list="produtos-estoque-list"
                          value={item.produto}
                          onChange={(e) => atualizarItem(item.key, 'produto', e.target.value)}
                          onBlur={(e) => aoConfirmarProduto(item.key, e.target.value)}
                          required
                        />
                        {catalogo && (
                          <span
                            className={`form-hint ${estoqueInsuficiente ? 'text-saida' : ''}`}
                          >
                            Estoque: {catalogo.estoque_atual}
                            {estoqueInsuficiente && ' (insuficiente)'}
                          </span>
                        )}
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input venda-compact-num"
                          min={1}
                          value={item.quantidade}
                          onChange={(e) =>
                            atualizarItem(item.key, 'quantidade', parseInt(e.target.value) || 1)
                          }
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input venda-compact-num"
                          min={0}
                          step={0.01}
                          placeholder="0"
                          value={item.valor_unitario || ''}
                          onChange={(e) =>
                            atualizarItem(
                              item.key,
                              'valor_unitario',
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-input venda-compact-num"
                          min={0}
                          step={0.01}
                          placeholder="0"
                          value={item.desconto || ''}
                          onChange={(e) =>
                            atualizarItem(item.key, 'desconto', parseFloat(e.target.value) || 0)
                          }
                        />
                      </td>
                      <td className="text-right venda-compact-sub">{formatarMoeda(subtotal)}</td>
                      <td>
                        {itens.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-icon btn-ghost"
                            onClick={() => removerItem(item.key)}
                            title="Remover"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {isDinheiro && (
          <div className="venda-compact-troco-section">
            <label className="venda-compact-troco-check">
              <input
                type="checkbox"
                checked={houveTroco}
                onChange={(e) => {
                  setHouveTroco(e.target.checked)
                  if (!e.target.checked) setValorRecebido('')
                  setSucesso(false)
                }}
              />
              Houve troco?
            </label>
            {houveTroco && (
              <div className="venda-compact-troco-fields">
                <div className="form-group">
                  <label className="form-label">Valor recebido (R$)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    step={0.01}
                    placeholder="Ex: 150,00"
                    value={valorRecebido}
                    onChange={(e) => {
                      setValorRecebido(e.target.value ? parseFloat(e.target.value) : '')
                      setSucesso(false)
                    }}
                  />
                </div>
                <div className="venda-compact-troco-resultado">
                  <span className="form-label">Troco a devolver</span>
                  <strong>{formatarMoeda(trocoCalculado)}</strong>
                  {valorRecebidoNum > 0 && (
                    <span className="venda-compact-troco-formula">
                      {formatarMoeda(valorRecebidoNum)} − {formatarMoeda(valorTotal)}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="venda-compact-footer">
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm} disabled={loading}>
            <RotateCcw size={14} /> Limpar
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={18} />
            {loading ? 'Salvando...' : 'Registrar venda'}
          </button>
        </footer>
      </form>
    </div>
  )
}
