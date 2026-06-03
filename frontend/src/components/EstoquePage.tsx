import { useEffect, useState, FormEvent } from 'react'
import {
  Package,
  Save,
  Trash2,
  Search,
  Pencil,
  ArrowDownUp,
  AlertTriangle,
  Boxes,
  History,
} from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataCurta } from '../utils'
import { KPICard } from './KPICard'
import { ImportarNFeXml } from './ImportarNFeXml'
import type { EstoqueSecao } from '../navigation'
import { PAGINA_SUBTITULOS } from '../navigation'
import type {
  EstoqueResumo,
  MovimentacaoEstoque,
  MovimentacaoEstoqueCreate,
  Produto,
  ProdutoCreate,
} from '../types'

interface EstoquePageProps {
  secao: EstoqueSecao
  onRefresh?: () => void
}

const TITULO_SECAO: Record<EstoqueSecao, string> = {
  produtos: 'Catálogo de Produtos',
  movimentacoes: 'Movimentações de Estoque',
  'importar-xml': 'Importar XML da NF-e',
}

const formProdutoInicial: ProdutoCreate = {
  nome: '',
  categoria: 'Geral',
  preco_venda: 0,
  estoque_atual: 0,
  estoque_minimo: 5,
  unidade: 'un',
  ativo: true,
  observacao: '',
}

const LABEL_TIPO_MOV: Record<string, string> = {
  entrada: 'Entrada',
  saida: 'Saída',
  ajuste: 'Ajuste',
  venda: 'Venda',
  estorno_venda: 'Estorno',
}

function badgeStatus(status: Produto['status_estoque']) {
  if (status === 'zerado') return <span className="badge badge-error">Sem estoque</span>
  if (status === 'baixo') return <span className="badge badge-warn">Estoque baixo</span>
  return <span className="badge">OK</span>
}

export function EstoquePage({ secao, onRefresh }: EstoquePageProps) {
  const [resumo, setResumo] = useState<EstoqueResumo | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [form, setForm] = useState<ProdutoCreate>(formProdutoInicial)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroEstoque, setFiltroEstoque] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)

  const [movModal, setMovModal] = useState<Produto | null>(null)
  const [movForm, setMovForm] = useState<MovimentacaoEstoqueCreate>({
    produto_id: 0,
    tipo: 'entrada',
    quantidade: 1,
    observacao: '',
  })
  const [movSalvando, setMovSalvando] = useState(false)
  const [movError, setMovError] = useState('')

  async function carregarResumo() {
    setResumo(await api.getEstoqueResumo())
  }

  async function carregarProdutos() {
    const params: Record<string, string> = {}
    if (busca) params.busca = busca
    if (filtroCategoria) params.categoria = filtroCategoria
    if (filtroEstoque === 'baixo') params.estoque_baixo = 'true'
    if (filtroEstoque === 'zerado') params.sem_estoque = 'true'
    setProdutos(await api.getProdutosEstoque(params))
  }

  async function carregarMovimentacoes() {
    setMovimentacoes(await api.getMovimentacoesEstoque({ limite: '150' }))
  }

  async function carregar() {
    setLoading(true)
    setError('')
    try {
      const tarefas: Promise<unknown>[] = [carregarResumo()]
      if (secao === 'produtos') tarefas.push(carregarProdutos())
      if (secao === 'movimentacoes') tarefas.push(carregarMovimentacoes())
      await Promise.all(tarefas)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque')
      if (secao === 'produtos') setProdutos([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getCategoriasProduto().then(setCategorias)
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca, filtroCategoria, filtroEstoque, secao])

  function handleChange(field: keyof ProdutoCreate, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
  }

  function iniciarEdicao(produto: Produto) {
    setEditando(produto)
    setForm({
      nome: produto.nome,
      categoria: produto.categoria,
      preco_venda: produto.preco_venda,
      estoque_atual: produto.estoque_atual,
      estoque_minimo: produto.estoque_minimo,
      unidade: produto.unidade,
      ativo: produto.ativo,
      observacao: produto.observacao ?? '',
    })
    setError('')
    setSucesso(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm(formProdutoInicial)
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.nome.trim()) {
      setError('Informe o nome do produto')
      return
    }

    setSalvando(true)
    const payload = {
      ...form,
      nome: form.nome.trim(),
      observacao: form.observacao || undefined,
    }

    try {
      if (editando) {
        const { estoque_atual: _, ...updateData } = payload
        await api.updateProduto(editando.id, updateData)
      } else {
        await api.createProduto(payload)
      }
      setForm(formProdutoInicial)
      setEditando(null)
      setSucesso(true)
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Desativar ou excluir este produto?')) return
    await api.deleteProduto(id)
    if (editando?.id === id) cancelarEdicao()
    carregar()
    onRefresh?.()
  }

  function abrirMovimentacao(produto: Produto) {
    setMovModal(produto)
    setMovForm({
      produto_id: produto.id,
      tipo: 'entrada',
      quantidade: 1,
      observacao: '',
    })
    setMovError('')
  }

  async function handleMovimentacao(e: FormEvent) {
    e.preventDefault()
    if (!movModal) return
    setMovError('')

    if (movForm.tipo === 'ajuste' && movForm.quantidade < 0) {
      setMovError('O estoque ajustado não pode ser negativo')
      return
    }
    if (movForm.tipo !== 'ajuste' && movForm.quantidade < 1) {
      setMovError('Informe uma quantidade válida')
      return
    }

    setMovSalvando(true)
    try {
      await api.registrarMovimentacaoEstoque({
        ...movForm,
        observacao: movForm.observacao || undefined,
      })
      setMovModal(null)
      carregar()
      onRefresh?.()
    } catch (err) {
      setMovError(err instanceof Error ? err.message : 'Erro na movimentação')
    } finally {
      setMovSalvando(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{TITULO_SECAO[secao]}</h1>
        <p className="page-subtitle">
          {secao === 'produtos' && PAGINA_SUBTITULOS.produtos}
          {secao === 'movimentacoes' && PAGINA_SUBTITULOS['estoque-movimentacoes']}
          {secao === 'importar-xml' && PAGINA_SUBTITULOS['estoque-importar-xml']}
        </p>
      </div>

      {resumo && secao !== 'importar-xml' && (
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <KPICard
            label="Produtos ativos"
            value={String(resumo.produtos_ativos)}
            icon={Package}
            iconColor="blue"
            subtitle={`${resumo.total_produtos} cadastrados`}
          />
          <KPICard
            label="Unidades em estoque"
            value={String(resumo.total_unidades)}
            icon={Boxes}
            iconColor="green"
          />
          <KPICard
            label="Valor em estoque"
            value={formatarMoeda(resumo.valor_total_estoque)}
            icon={Package}
            iconColor="gold"
          />
          <KPICard
            label="Alertas"
            value={String(resumo.produtos_estoque_baixo + resumo.produtos_sem_estoque)}
            icon={AlertTriangle}
            iconColor="red"
            subtitle={`${resumo.produtos_sem_estoque} zerados · ${resumo.produtos_estoque_baixo} baixos`}
          />
        </div>
      )}

      {secao === 'importar-xml' && (
        <ImportarNFeXml
          onSuccess={() => {
            carregar()
            onRefresh?.()
          }}
        />
      )}

      {secao === 'produtos' && (
        <>
          <div className="form-card" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
            <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
              {editando ? `Editar: ${editando.nome}` : 'Novo Produto'}
            </h3>

            {error && <div className="error-message">{error}</div>}
            {sucesso && <div className="success-message">Produto salvo com sucesso!</div>}

            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="form-label">Nome</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ex: Terço de madeira"
                    value={form.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Categoria</label>
                  <select
                    className="form-select"
                    value={form.categoria}
                    onChange={(e) => handleChange('categoria', e.target.value)}
                  >
                    {categorias.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Unidade</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.unidade}
                    onChange={(e) => handleChange('unidade', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preço de venda (R$)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    step={0.01}
                    value={form.preco_venda || ''}
                    onChange={(e) => handleChange('preco_venda', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Estoque mínimo</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={form.estoque_minimo}
                    onChange={(e) => handleChange('estoque_minimo', parseInt(e.target.value, 10) || 0)}
                  />
                </div>

                {!editando && (
                  <div className="form-group">
                    <label className="form-label">Estoque inicial</label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      value={form.estoque_atual}
                      onChange={(e) => handleChange('estoque_atual', parseInt(e.target.value, 10) || 0)}
                    />
                  </div>
                )}

                {editando && (
                  <div className="form-group">
                    <label className="form-label">Estoque atual</label>
                    <input
                      type="number"
                      className="form-input"
                      value={editando.estoque_atual}
                      disabled
                    />
                    <span className="form-hint">Use movimentação para alterar o saldo</span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={form.ativo ? '1' : '0'}
                    onChange={(e) => handleChange('ativo', e.target.value === '1')}
                  >
                    <option value="1">Ativo</option>
                    <option value="0">Inativo</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Observação</label>
                  <textarea
                    className="form-textarea"
                    value={form.observacao || ''}
                    onChange={(e) => handleChange('observacao', e.target.value)}
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={salvando}>
                    <Save size={18} />
                    {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar Produto'}
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
                  placeholder="Buscar produto..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <select
                className="form-select"
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
              >
                <option value="">Todas categorias</option>
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select
                className="form-select"
                value={filtroEstoque}
                onChange={(e) => setFiltroEstoque(e.target.value)}
              >
                <option value="">Todos os estoques</option>
                <option value="baixo">Estoque baixo</option>
                <option value="zerado">Sem estoque</option>
              </select>
            </div>

            {loading ? (
              <div className="loading">Carregando produtos...</div>
            ) : produtos.length === 0 ? (
              <div className="empty-state">
                <Package size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                <p>Nenhum produto encontrado</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Categoria</th>
                      <th>Preço</th>
                      <th>Estoque</th>
                      <th>Mín.</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtos.map((p) => (
                      <tr key={p.id} className={!p.ativo ? 'row-inativa' : undefined}>
                        <td>
                          <strong>{p.nome}</strong>
                          {!p.ativo && <span className="badge" style={{ marginLeft: 8 }}>Inativo</span>}
                        </td>
                        <td>{p.categoria}</td>
                        <td>{formatarMoeda(p.preco_venda)}</td>
                        <td>
                          <strong>{p.estoque_atual}</strong> {p.unidade}
                        </td>
                        <td>{p.estoque_minimo}</td>
                        <td>{badgeStatus(p.status_estoque)}</td>
                        <td className="actions">
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => abrirMovimentacao(p)}
                            title="Movimentar estoque"
                          >
                            <ArrowDownUp size={14} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => iniciarEdicao(p)}
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleExcluir(p.id)}
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
        </>
      )}

      {secao === 'movimentacoes' && (
        <div className="table-card">
          {loading ? (
            <div className="loading">Carregando movimentações...</div>
          ) : movimentacoes.length === 0 ? (
            <div className="empty-state">
              <History size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
              <p>Nenhuma movimentação registrada</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th>Qtd</th>
                    <th>Anterior</th>
                    <th>Posterior</th>
                    <th>Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {movimentacoes.map((m) => (
                    <tr key={m.id}>
                      <td>{formatarDataCurta(m.data)}</td>
                      <td>{m.produto_nome}</td>
                      <td>
                        <span className="badge">{LABEL_TIPO_MOV[m.tipo] ?? m.tipo}</span>
                        {m.venda_id && <span className="badge badge-itens">Venda #{m.venda_id}</span>}
                      </td>
                      <td>{m.quantidade}</td>
                      <td>{m.estoque_anterior}</td>
                      <td><strong>{m.estoque_posterior}</strong></td>
                      <td>{m.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {movModal && (
        <div className="modal-overlay" onClick={() => setMovModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="chart-title">Movimentar estoque</h3>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              {movModal.nome} — saldo atual: <strong>{movModal.estoque_atual}</strong>
            </p>

            {movError && <div className="error-message">{movError}</div>}

            <form onSubmit={handleMovimentacao}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select
                    className="form-select"
                    value={movForm.tipo}
                    onChange={(e) =>
                      setMovForm((prev) => ({
                        ...prev,
                        tipo: e.target.value as MovimentacaoEstoqueCreate['tipo'],
                        quantidade: e.target.value === 'ajuste' ? movModal.estoque_atual : 1,
                      }))
                    }
                  >
                    <option value="entrada">Entrada (+)</option>
                    <option value="saida">Saída (−)</option>
                    <option value="ajuste">Ajuste (definir saldo)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {movForm.tipo === 'ajuste' ? 'Novo saldo' : 'Quantidade'}
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    min={movForm.tipo === 'ajuste' ? 0 : 1}
                    value={movForm.quantidade}
                    onChange={(e) =>
                      setMovForm((prev) => ({
                        ...prev,
                        quantidade: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Observação</label>
                  <input
                    type="text"
                    className="form-input"
                    value={movForm.observacao || ''}
                    onChange={(e) =>
                      setMovForm((prev) => ({ ...prev, observacao: e.target.value }))
                    }
                  />
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={movSalvando}>
                    {movSalvando ? 'Registrando...' : 'Confirmar'}
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setMovModal(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
