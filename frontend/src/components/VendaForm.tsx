import { useEffect, useMemo, useState, FormEvent } from 'react'
import { Save, Plus, Trash2, CheckCircle2, RotateCcw, BadgePercent } from 'lucide-react'
import { api } from '../api'
import {
  calcularValorTotal,
  datetimeLocalParaApi,
  formatarMoeda,
  toDatetimeLocal,
} from '../utils'
import type { ItemVenda, ProdutoOpcao, VendaCreate } from '../types'
import {
  criarPagamentoVazio,
  montarDadosPagamentoVenda,
  validarPagamentos,
  type PagamentoForm,
} from '../pagamentosVendaHelpers'
import { PagamentosVendaSection } from './PagamentosVendaSection'
import {
  PRODUTO_OUTRO_VALUE,
  produtoCatalogoDoItem,
  resolverNomeProduto,
} from '../produtoEstoqueHelpers'
import {
  PROMOCOES_ALTERADAS_EVENT,
  carregarPromocoes,
  listarPromocoesAtivasNaData,
  type Promocao,
} from '../promocoesStorage'

interface VendaFormProps {
  onSuccess?: () => void
}

interface ItemForm extends ItemVenda {
  key: string
  produtoSelecionado: string
  produtoOutro: string
}

const CLIENTES_RAPIDOS = ['Cliente avulso', 'Congregação', 'Visitante']

function criarItemVazio(): ItemForm {
  return {
    key: crypto.randomUUID(),
    produto: '',
    produtoSelecionado: '',
    produtoOutro: '',
    quantidade: 1,
    valor_unitario: 0,
    desconto: 0,
  }
}

const cabecalhoInicial = {
  data: toDatetimeLocal(),
  cliente: 'Cliente avulso',
  observacao: '',
}

export function VendaForm({ onSuccess }: VendaFormProps) {
  const [cabecalho, setCabecalho] = useState(cabecalhoInicial)
  const [itens, setItens] = useState<ItemForm[]>([criarItemVazio()])
  const [formas, setFormas] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [dividirPagamento, setDividirPagamento] = useState(false)
  const [pagamentos, setPagamentos] = useState<PagamentoForm[]>([criarPagamentoVazio()])
  const [opcoesProduto, setOpcoesProduto] = useState<ProdutoOpcao[]>([])
  const [promocoes, setPromocoes] = useState<Promocao[]>(() => carregarPromocoes())
  const [promocaoVinculadaId, setPromocaoVinculadaId] = useState<string | null>(null)

  useEffect(() => {
    api.getFormasPagamentoVenda().then(setFormas)
    api.getProdutoOpcoes().then(setOpcoesProduto)
  }, [])

  useEffect(() => {
    function syncPromocoes() {
      setPromocoes(carregarPromocoes())
    }
    window.addEventListener(PROMOCOES_ALTERADAS_EVENT, syncPromocoes)
    return () => window.removeEventListener(PROMOCOES_ALTERADAS_EVENT, syncPromocoes)
  }, [])

  const promocoesAtivas = useMemo(
    () => listarPromocoesAtivasNaData(cabecalho.data, promocoes),
    [cabecalho.data, promocoes]
  )

  const promocaoVinculada = useMemo(
    () => promocoesAtivas.find((p) => p.id === promocaoVinculadaId) ?? null,
    [promocoesAtivas, promocaoVinculadaId]
  )

  useEffect(() => {
    if (promocaoVinculadaId && !promocoesAtivas.some((p) => p.id === promocaoVinculadaId)) {
      setPromocaoVinculadaId(null)
    }
  }, [promocoesAtivas, promocaoVinculadaId])

  const valorTotal = itens.reduce(
    (acc, item) => acc + calcularValorTotal(item.quantidade, item.valor_unitario, item.desconto),
    0,
  )
  function handleCabecalho(field: keyof typeof cabecalhoInicial, value: string) {
    setCabecalho((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
  }

  function atualizarItem(key: string, field: keyof ItemVenda, value: string | number) {
    setItens((prev) =>
      prev.map((item) => (item.key === key ? { ...item, [field]: value } : item)),
    )
    setSucesso(false)
  }

  function selecionarProdutoItem(key: string, valor: string) {
    setItens((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item

        if (valor === PRODUTO_OUTRO_VALUE) {
          return {
            ...item,
            produtoSelecionado: PRODUTO_OUTRO_VALUE,
            produto: '',
            produtoOutro: '',
          }
        }

        const catalogo = opcoesProduto.find((p) => String(p.id) === valor)
        if (!catalogo) {
          return { ...item, produtoSelecionado: '', produto: '', produtoOutro: '' }
        }

        return {
          ...item,
          produtoSelecionado: valor,
          produto: catalogo.nome,
          produtoOutro: '',
        }
      }),
    )
    setSucesso(false)
  }

  function atualizarProdutoOutro(key: string, nome: string) {
    setItens((prev) =>
      prev.map((item) =>
        item.key === key
          ? { ...item, produtoOutro: nome, produto: nome.trim() }
          : item,
      ),
    )
    setSucesso(false)
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
    setDividirPagamento(false)
    setPagamentos([criarPagamentoVazio()])
    setPromocaoVinculadaId(null)
    setError('')
  }

  function vincularPromocao(id: string) {
    setPromocaoVinculadaId(id)
    setSucesso(false)
  }

  function desvincularPromocao() {
    setPromocaoVinculadaId(null)
    setSucesso(false)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const itensInvalidos = itens.some((item) => {
      const nome = resolverNomeProduto(item, opcoesProduto)
      if (!item.produtoSelecionado) return true
      if (item.produtoSelecionado === PRODUTO_OUTRO_VALUE && !item.produtoOutro.trim()) {
        return true
      }
      return !nome || item.valor_unitario <= 0
    })
    if (itensInvalidos) {
      setError('Selecione o produto (ou informe o nome em Outro) e o valor unitário.')
      return
    }

    const erroPagamento = validarPagamentos(pagamentos, valorTotal, dividirPagamento)
    if (erroPagamento) {
      setError(erroPagamento)
      return
    }

    const dadosPagamento = montarDadosPagamentoVenda(pagamentos, valorTotal, dividirPagamento)

    const payload: VendaCreate = {
      data: cabecalho.data ? datetimeLocalParaApi(cabecalho.data) : undefined,
      cliente: cabecalho.cliente,
      ...dadosPagamento,
      observacao: cabecalho.observacao || undefined,
      promocao_id: promocaoVinculada?.id,
      promocao_nome: promocaoVinculada?.nome,
      itens: itens.map(({ produtoSelecionado, produtoOutro, produto, quantidade, valor_unitario, desconto }) => ({
        produto: resolverNomeProduto(
          { produtoSelecionado, produtoOutro, produto },
          opcoesProduto,
        ),
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

      {promocoesAtivas.length > 0 && (
        <div className="venda-promo-avisos" role="region" aria-label="Promoções ativas">
          {promocoesAtivas.map((promo) => {
            const vinculada = promocaoVinculadaId === promo.id
            return (
              <div
                key={promo.id}
                className={`venda-promo-aviso ${vinculada ? 'venda-promo-aviso--vinculada' : ''}`}
              >
                <BadgePercent size={18} aria-hidden />
                <p className="venda-promo-aviso-texto">
                  Promoção <strong>{promo.nome}</strong> ativa. Vincular à venda?
                </p>
                <div className="venda-promo-aviso-acoes">
                  <button
                    type="button"
                    className={`btn btn-sm ${vinculada ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => vincularPromocao(promo.id)}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => (vinculada ? desvincularPromocao() : undefined)}
                    disabled={!vinculada}
                  >
                    Não
                  </button>
                </div>
              </div>
            )
          })}
          {promocaoVinculada && (
            <p className="venda-promo-vinculada-hint">
              Esta venda será registrada vinculada à promoção <strong>{promocaoVinculada.nome}</strong>{' '}
              (sem alterar valores).
            </p>
          )}
        </div>
      )}

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

        <PagamentosVendaSection
          formas={formas}
          pagamentos={pagamentos}
          dividirPagamento={dividirPagamento}
          valorTotal={valorTotal}
          onDividirPagamentoChange={(dividir) => {
            setDividirPagamento(dividir)
            setSucesso(false)
          }}
          onPagamentosChange={(next) => {
            setPagamentos(next)
            setSucesso(false)
          }}
        />

        <div className="venda-compact-itens">
          <div className="venda-compact-itens-head">
            <span className="form-label">Itens</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarItem}>
              <Plus size={14} /> Item
            </button>
          </div>

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
                  const catalogo = produtoCatalogoDoItem(item, opcoesProduto)
                  const estoqueInsuficiente =
                    catalogo && item.quantidade > catalogo.estoque_atual
                  const isOutro = item.produtoSelecionado === PRODUTO_OUTRO_VALUE
                  return (
                    <tr key={item.key}>
                      <td className="venda-produto-cell">
                        <select
                          className="form-select"
                          value={item.produtoSelecionado}
                          onChange={(e) => selecionarProdutoItem(item.key, e.target.value)}
                          required
                        >
                          <option value="">Selecione o produto...</option>
                          {opcoesProduto.map((p) => (
                            <option key={p.id} value={String(p.id)}>
                              {p.nome}
                            </option>
                          ))}
                          <option value={PRODUTO_OUTRO_VALUE}>Outro (digitar nome)</option>
                        </select>
                        {isOutro && (
                          <input
                            type="text"
                            className="form-input"
                            style={{ marginTop: '0.35rem' }}
                            placeholder="Nome do produto"
                            value={item.produtoOutro}
                            onChange={(e) => atualizarProdutoOutro(item.key, e.target.value)}
                            required
                          />
                        )}
                        {catalogo && (
                          <span
                            className={`form-hint ${estoqueInsuficiente ? 'text-saida' : ''}`}
                          >
                            Estoque: {catalogo.estoque_atual}
                            {estoqueInsuficiente && ' (insuficiente)'}
                          </span>
                        )}
                        {isOutro && (
                          <span className="form-hint">
                            Produto avulso — não cadastrado no estoque
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
