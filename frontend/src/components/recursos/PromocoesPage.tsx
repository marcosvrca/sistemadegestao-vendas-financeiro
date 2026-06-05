import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  BadgePercent,
  Plus,
  Trash2,
  Pencil,
  X,
  Save,
  Calendar,
  Package,
  Gift,
  TrendingUp,
} from 'lucide-react'
import { PageShell } from '../PageShell'
import { api } from '../../api'
import type { ProdutoOpcao } from '../../types'
import { formatarMoeda } from '../../utils'
import {
  PROMOCOES_ALTERADAS_EVENT,
  TIPOS_PROMOCAO,
  carregarPromocoes,
  criarFaixaProgressiva,
  criarPromocaoVazia,
  formatarPeriodoPromocao,
  hojeIsoPromocao,
  labelTipoPromocao,
  promocaoEstaAtiva,
  promocaoStatus,
  resumoPromocao,
  salvarPromocoes,
  type FaixaProgressiva,
  type Promocao,
  type TipoPromocao,
} from '../../promocoesStorage'
import { gerarId } from '../../recursosStorage'

const formInicial = () => ({
  ...criarPromocaoVazia('desconto_direto'),
})

export function PromocoesPage() {
  const [promocoes, setPromocoes] = useState<Promocao[]>(() => carregarPromocoes())
  const [produtos, setProdutos] = useState<ProdutoOpcao[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [form, setForm] = useState(formInicial)
  const [erro, setErro] = useState('')
  const [buscaProduto, setBuscaProduto] = useState('')
  const [novaFaixaQtd, setNovaFaixaQtd] = useState('2')
  const [novaFaixaDesc, setNovaFaixaDesc] = useState('5')

  const hoje = hojeIsoPromocao()

  useEffect(() => {
    api
      .getProdutoOpcoes()
      .then(setProdutos)
      .catch(() => setProdutos([]))
      .finally(() => setLoadingProdutos(false))
  }, [])

  useEffect(() => {
    function sync() {
      setPromocoes(carregarPromocoes())
    }
    window.addEventListener(PROMOCOES_ALTERADAS_EVENT, sync)
    return () => window.removeEventListener(PROMOCOES_ALTERADAS_EVENT, sync)
  }, [])

  const ativas = useMemo(
    () => promocoes.filter((p) => promocaoEstaAtiva(p, hoje)),
    [promocoes, hoje]
  )
  const outras = useMemo(
    () => promocoes.filter((p) => !promocaoEstaAtiva(p, hoje)),
    [promocoes, hoje]
  )

  const produtosFiltrados = useMemo(() => {
    const q = buscaProduto.trim().toLowerCase()
    const base = q
      ? produtos.filter((p) => {
          const nome = (p.nome ?? '').toLowerCase()
          const categoria = (p.categoria ?? '').toLowerCase()
          return nome.includes(q) || categoria.includes(q)
        })
      : produtos

    if (form.tipo !== 'desconto_direto' || form.descontoDireto.length === 0) {
      return [...base].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    }

    const ids = new Set(base.map((p) => p.id))
    const extras = form.descontoDireto
      .filter((sel) => !ids.has(sel.produtoId))
      .map((sel) => produtos.find((p) => p.id === sel.produtoId))
      .filter((p): p is ProdutoOpcao => Boolean(p))

    return [...base, ...extras].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }, [produtos, buscaProduto, form.tipo, form.descontoDireto])

  function persistir(lista: Promocao[]) {
    setPromocoes(lista)
    salvarPromocoes(lista)
  }

  function abrirNova() {
    setForm(formInicial())
    setEditandoId(null)
    setErro('')
    setBuscaProduto('')
    setMostrarForm(true)
  }

  function abrirEdicao(p: Promocao) {
    setForm({
      nome: p.nome,
      dataInicio: p.dataInicio,
      dataFim: p.dataFim,
      tipo: p.tipo,
      descontoDireto: [...p.descontoDireto],
      brinde: p.brinde ? { ...p.brinde } : undefined,
      progressivo: p.progressivo
        ? {
            ...p.progressivo,
            faixas: p.progressivo.faixas.map((f) => ({ ...f })),
          }
        : undefined,
    })
    setEditandoId(p.id)
    setErro('')
    setBuscaProduto('')
    setMostrarForm(true)
  }

  function fecharForm() {
    setMostrarForm(false)
    setEditandoId(null)
    setErro('')
    setBuscaProduto('')
  }

  function onBuscaProdutoKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
    }
  }

  function mudarTipo(tipo: TipoPromocao) {
    const parcial = criarPromocaoVazia(tipo)
    setForm((f) => ({
      ...f,
      tipo,
      descontoDireto: parcial.descontoDireto,
      brinde: parcial.brinde,
      progressivo: parcial.progressivo,
    }))
    setBuscaProduto('')
  }

  function validarForm(): string | null {
    if (!form.nome.trim()) return 'Informe o nome da promoção.'
    if (!form.dataInicio || !form.dataFim) return 'Informe as datas de início e fim.'
    if (form.dataFim < form.dataInicio) return 'A data fim deve ser igual ou posterior à data início.'

    if (form.tipo === 'desconto_direto') {
      if (form.descontoDireto.length === 0) return 'Selecione ao menos um produto com desconto.'
      for (const item of form.descontoDireto) {
        if (item.descontoPercentual <= 0 || item.descontoPercentual > 100) {
          return `Desconto inválido para ${item.produtoNome} (use entre 1 e 100%).`
        }
      }
    }

    if (form.tipo === 'brinde_valor') {
      if (!form.brinde?.valorMinimo || form.brinde.valorMinimo <= 0) {
        return 'Informe o valor mínimo de compra.'
      }
      if (!form.brinde.brindeDescricao.trim()) {
        return 'Descreva o brinde oferecido.'
      }
    }

    if (form.tipo === 'desconto_progressivo') {
      if (!form.progressivo?.produtoId) return 'Selecione o produto da promoção.'
      if (!form.progressivo.faixas.length) return 'Adicione ao menos uma faixa de desconto.'
      for (const faixa of form.progressivo.faixas) {
        if (faixa.quantidade < 1) return 'A quantidade deve ser pelo menos 1.'
        if (faixa.descontoPercentual <= 0 || faixa.descontoPercentual > 100) {
          return 'Cada desconto deve estar entre 1 e 100%.'
        }
      }
    }

    return null
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const msg = validarForm()
    if (msg) {
      setErro(msg)
      return
    }

    const payload: Promocao = {
      id: editandoId ?? gerarId(),
      nome: form.nome.trim(),
      dataInicio: form.dataInicio,
      dataFim: form.dataFim,
      tipo: form.tipo,
      descontoDireto: form.descontoDireto,
      brinde: form.tipo === 'brinde_valor' ? form.brinde : undefined,
      progressivo: form.tipo === 'desconto_progressivo' ? form.progressivo : undefined,
      criadoEm: editandoId
        ? promocoes.find((p) => p.id === editandoId)?.criadoEm ?? new Date().toISOString()
        : new Date().toISOString(),
    }

    if (editandoId) {
      persistir(promocoes.map((p) => (p.id === editandoId ? payload : p)))
    } else {
      persistir([payload, ...promocoes])
    }
    fecharForm()
  }

  function excluir(id: string) {
    if (!confirm('Excluir esta promoção?')) return
    persistir(promocoes.filter((p) => p.id !== id))
  }

  function toggleProdutoDesconto(produto: ProdutoOpcao) {
    const existe = form.descontoDireto.find((d) => d.produtoId === produto.id)
    if (existe) {
      setForm((f) => ({
        ...f,
        descontoDireto: f.descontoDireto.filter((d) => d.produtoId !== produto.id),
      }))
      return
    }
    setForm((f) => ({
      ...f,
      descontoDireto: [
        ...f.descontoDireto,
        { produtoId: produto.id, produtoNome: produto.nome, descontoPercentual: 10 },
      ],
    }))
  }

  function atualizarDescontoProduto(produtoId: number, descontoPercentual: number) {
    setForm((f) => ({
      ...f,
      descontoDireto: f.descontoDireto.map((d) =>
        d.produtoId === produtoId ? { ...d, descontoPercentual } : d
      ),
    }))
  }

  function selecionarProdutoProgressivo(produto: ProdutoOpcao) {
    setForm((f) => ({
      ...f,
      progressivo: {
        produtoId: produto.id,
        produtoNome: produto.nome,
        faixas: f.progressivo?.faixas ?? [],
      },
    }))
  }

  function adicionarFaixa() {
    const qtd = parseInt(novaFaixaQtd, 10)
    const desc = parseFloat(novaFaixaDesc.replace(',', '.'))
    if (!qtd || qtd < 1) {
      setErro('Informe uma quantidade válida para a faixa.')
      return
    }
    if (!desc || desc <= 0 || desc > 100) {
      setErro('Informe um desconto entre 1 e 100%.')
      return
    }
    const faixas = form.progressivo?.faixas ?? []
    if (faixas.some((f) => f.quantidade === qtd)) {
      setErro('Já existe uma faixa com essa quantidade.')
      return
    }
    setForm((f) => ({
      ...f,
      progressivo: {
        ...(f.progressivo ?? { produtoId: 0, produtoNome: '', faixas: [] }),
        faixas: [...faixas, criarFaixaProgressiva(qtd, desc)].sort(
          (a, b) => a.quantidade - b.quantidade
        ),
      },
    }))
    setErro('')
  }

  function removerFaixa(id: string) {
    setForm((f) => ({
      ...f,
      progressivo: f.progressivo
        ? { ...f.progressivo, faixas: f.progressivo.faixas.filter((x) => x.id !== id) }
        : undefined,
    }))
  }

  function atualizarFaixa(id: string, campo: keyof FaixaProgressiva, valor: number) {
    setForm((f) => {
      if (!f.progressivo) return f
      return {
        ...f,
        progressivo: {
          ...f.progressivo,
          faixas: f.progressivo.faixas
            .map((faixa) => (faixa.id === id ? { ...faixa, [campo]: valor } : faixa))
            .sort((a, b) => a.quantidade - b.quantidade),
        },
      }
    })
  }

  function renderBadgeStatus(p: Promocao) {
    const status = promocaoStatus(p, hoje)
    const labels = { ativa: 'Ativa', futura: 'Futura', encerrada: 'Encerrada' }
    return (
      <span className={`promo-badge promo-badge-${status}`}>{labels[status]}</span>
    )
  }

  function renderCard(p: Promocao) {
    const Icon =
      p.tipo === 'desconto_direto' ? BadgePercent : p.tipo === 'brinde_valor' ? Gift : TrendingUp

    return (
      <div key={p.id} className="promo-card">
        <div className="promo-card-topo">
          <span className="promo-card-icon">
            <Icon size={20} />
          </span>
          <div className="promo-card-info">
            <strong>{p.nome}</strong>
            <span className="promo-card-tipo">{labelTipoPromocao(p.tipo)}</span>
          </div>
          {renderBadgeStatus(p)}
        </div>
        <p className="promo-card-resumo">{resumoPromocao(p)}</p>
        <p className="promo-card-periodo">
          <Calendar size={14} />
          {formatarPeriodoPromocao(p.dataInicio, p.dataFim)}
        </p>
        <div className="promo-card-acoes">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => abrirEdicao(p)}>
            <Pencil size={16} />
            Editar
          </button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => excluir(p.id)}>
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    )
  }

  function renderCamposTipo() {
    if (form.tipo === 'desconto_direto') {
      return (
        <div className="promo-tipo-panel">
          <h4 className="card-section-title">Produtos com desconto</h4>
          <p className="atalhos-regras">
            Selecione os produtos e defina o percentual de desconto de cada um.
          </p>
          {loadingProdutos ? (
            <p className="loading">Carregando produtos…</p>
          ) : produtos.length === 0 ? (
            <p className="empty-state empty-state--compact">
              Nenhum produto no catálogo. Cadastre produtos em Estoque primeiro.
            </p>
          ) : (
            <>
              <div className="promo-busca-produto">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Buscar produto ou categoria…"
                  value={buscaProduto}
                  autoComplete="off"
                  onKeyDown={onBuscaProdutoKeyDown}
                  onChange={(e) => setBuscaProduto(e.target.value)}
                />
              </div>
              {produtosFiltrados.length === 0 ? (
                <p className="empty-state empty-state--compact">
                  {buscaProduto.trim()
                    ? 'Nenhum produto encontrado para esta busca.'
                    : 'Nenhum produto disponível.'}
                </p>
              ) : (
              <ul className="promo-produtos-lista">
                {produtosFiltrados.map((produto) => {
                  const sel = form.descontoDireto.find((d) => d.produtoId === produto.id)
                  return (
                    <li key={produto.id} className={`promo-produto-item ${sel ? 'promo-produto-selecionado' : ''}`}>
                      <label className="promo-produto-label">
                        <input
                          type="checkbox"
                          checked={Boolean(sel)}
                          onChange={() => toggleProdutoDesconto(produto)}
                        />
                        <span className="promo-produto-nome">
                          <Package size={14} />
                          {produto.nome}
                        </span>
                        <span className="promo-produto-preco">{formatarMoeda(produto.preco_venda)}</span>
                      </label>
                      {sel && (
                        <div className="promo-produto-desconto">
                          <label className="form-label">Desconto %</label>
                          <input
                            type="number"
                            className="form-input"
                            min={1}
                            max={100}
                            step={0.5}
                            value={sel.descontoPercentual}
                            onKeyDown={onBuscaProdutoKeyDown}
                            onChange={(e) =>
                              atualizarDescontoProduto(produto.id, parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              )}
            </>
          )}
        </div>
      )
    }

    if (form.tipo === 'brinde_valor') {
      return (
        <div className="promo-tipo-panel">
          <h4 className="card-section-title">Brinde por valor de compra</h4>
          <div className="form-group">
            <label className="form-label">Valor mínimo da compra (R$) *</label>
            <input
              type="number"
              className="form-input"
              min={0.01}
              step={0.01}
              value={form.brinde?.valorMinimo || ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  brinde: {
                    valorMinimo: parseFloat(e.target.value) || 0,
                    brindeDescricao: f.brinde?.brindeDescricao ?? '',
                  },
                }))
              }
            />
          </div>
          <div className="form-group">
            <label className="form-label">Descrição do brinde *</label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Ex.: 1 café especial, 1 sobremesa da casa…"
              value={form.brinde?.brindeDescricao ?? ''}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  brinde: {
                    valorMinimo: f.brinde?.valorMinimo ?? 0,
                    brindeDescricao: e.target.value,
                  },
                }))
              }
            />
          </div>
        </div>
      )
    }

    return (
      <div className="promo-tipo-panel">
        <h4 className="card-section-title">Desconto progressivo por quantidade</h4>
        <p className="atalhos-regras">
          Escolha um produto e defina quanto desconto o cliente recebe ao comprar 1, 2, 3 unidades…
        </p>
        {loadingProdutos ? (
          <p className="loading">Carregando produtos…</p>
        ) : (
          <>
            <div className="promo-busca-produto">
              <input
                type="text"
                className="form-input"
                placeholder="Buscar produto…"
                value={buscaProduto}
                autoComplete="off"
                onKeyDown={onBuscaProdutoKeyDown}
                onChange={(e) => setBuscaProduto(e.target.value)}
              />
            </div>
            {produtosFiltrados.length === 0 ? (
              <p className="empty-state empty-state--compact">
                {buscaProduto.trim()
                  ? 'Nenhum produto encontrado para esta busca.'
                  : 'Nenhum produto disponível.'}
              </p>
            ) : (
            <ul className="promo-produtos-lista promo-produtos-lista-compacta">
              {produtosFiltrados.map((produto) => (
                <li key={produto.id}>
                  <button
                    type="button"
                    className={`promo-produto-btn ${
                      form.progressivo?.produtoId === produto.id ? 'promo-produto-btn-ativo' : ''
                    }`}
                    onClick={() => selecionarProdutoProgressivo(produto)}
                  >
                    {produto.nome}
                    <span>{formatarMoeda(produto.preco_venda)}</span>
                  </button>
                </li>
              ))}
            </ul>
            )}
            {form.progressivo?.produtoId ? (
              <>
                <p className="promo-produto-selecionado-label">
                  Produto: <strong>{form.progressivo.produtoNome}</strong>
                </p>
                <ul className="promo-faixas-lista">
                  {form.progressivo.faixas.map((faixa) => (
                    <li key={faixa.id} className="promo-faixa-item">
                      <span>Comprar</span>
                      <input
                        type="number"
                        className="form-input"
                        min={1}
                        value={faixa.quantidade}
                        onChange={(e) =>
                          atualizarFaixa(faixa.id, 'quantidade', parseInt(e.target.value, 10) || 1)
                        }
                      />
                      <span>un. →</span>
                      <input
                        type="number"
                        className="form-input"
                        min={1}
                        max={100}
                        step={0.5}
                        value={faixa.descontoPercentual}
                        onChange={(e) =>
                          atualizarFaixa(
                            faixa.id,
                            'descontoPercentual',
                            parseFloat(e.target.value) || 0
                          )
                        }
                      />
                      <span>% off</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => removerFaixa(faixa.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="promo-adicionar-faixa">
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    placeholder="Qtd"
                    value={novaFaixaQtd}
                    onChange={(e) => setNovaFaixaQtd(e.target.value)}
                  />
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    max={100}
                    step={0.5}
                    placeholder="% desc."
                    value={novaFaixaDesc}
                    onChange={(e) => setNovaFaixaDesc(e.target.value)}
                  />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarFaixa}>
                    <Plus size={16} />
                    Adicionar faixa
                  </button>
                </div>
              </>
            ) : (
              <p className="form-hint">Selecione um produto acima para configurar as faixas.</p>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <PageShell
      title="Promoções"
      subtitle="Crie campanhas de desconto, brindes e promoções progressivas"
      width="full"
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={abrirNova}>
          <Plus size={16} />
          Nova promoção
        </button>
      }
    >
      {promocoes.length === 0 ? (
        <div className="promo-vazio">
          <BadgePercent size={40} strokeWidth={1.25} />
          <p>Nenhuma promoção cadastrada.</p>
          <button type="button" className="btn btn-primary" onClick={abrirNova}>
            <Plus size={18} />
            Criar primeira promoção
          </button>
        </div>
      ) : (
        <div className="page-stack">
          {ativas.length > 0 && (
            <section>
              <h3 className="sorteador-secao-titulo">Promoções ativas</h3>
              <div className="promo-grid">{ativas.map(renderCard)}</div>
            </section>
          )}
          {outras.length > 0 && (
            <section>
              <h3 className="sorteador-secao-titulo">Futuras e encerradas</h3>
              <div className="promo-grid">{outras.map(renderCard)}</div>
            </section>
          )}
        </div>
      )}

      {mostrarForm && (
        <div className="modal-overlay" role="presentation" onClick={fecharForm}>
          <div
            className="modal-content modal-content-wide sorteador-modal promo-modal"
            role="dialog"
            aria-labelledby="promo-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="promo-modal-titulo" className="modal-title">
                {editandoId ? 'Editar promoção' : 'Nova promoção'}
              </h2>
              <button type="button" className="btn btn-icon btn-ghost" onClick={fecharForm}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body promo-modal-body">
            <form id="promo-form" onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label">Nome da promoção *</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.nome}
                  onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Semana do café"
                  autoFocus
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data início *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.dataInicio}
                    onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Data fim *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.dataFim}
                    min={form.dataInicio}
                    onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Tipo de promoção *</label>
                <div className="promo-tipos-grid">
                  {TIPOS_PROMOCAO.map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      className={`promo-tipo-card ${form.tipo === id ? 'promo-tipo-card-ativo' : ''}`}
                      onClick={() => mudarTipo(id)}
                    >
                      <strong>{label}</strong>
                      <span>{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>

            {renderCamposTipo()}

            {erro && <div className="error-message">{erro}</div>}

            <div className="form-actions">
              <button type="submit" form="promo-form" className="btn btn-primary">
                <Save size={18} />
                {editandoId ? 'Salvar alterações' : 'Criar promoção'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={fecharForm}>
                Cancelar
              </button>
            </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  )
}
