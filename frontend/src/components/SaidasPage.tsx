import { useEffect, useState, FormEvent } from 'react'
import { Save, Trash2, Search, Pencil, ArrowDownCircle } from 'lucide-react'
import { api } from '../api'
import { apiDatetimeToDatetimeLocal, datetimeLocalParaApi, formatarMoeda, formatarDataCurta, toDatetimeLocal } from '../utils'
import type { Saida, SaidaCreate } from '../types'

interface SaidasPageProps {
  onRefresh?: () => void
  variant?: 'saidas' | 'contas-a-pagar'
}

const formInicial: SaidaCreate = {
  data: toDatetimeLocal(),
  descricao: '',
  categoria: 'Fornecedor',
  valor: 0,
  forma_pagamento: 'Pix',
  observacao: '',
}

export function SaidasPage({ onRefresh, variant = 'contas-a-pagar' }: SaidasPageProps) {
  const titulo = variant === 'contas-a-pagar' ? 'Contas a Pagar' : 'Saídas'
  const subtitulo =
    variant === 'contas-a-pagar'
      ? 'Despesas, fornecedores e obrigações da loja'
      : 'Registre despesas e gastos da loja'
  const [form, setForm] = useState<SaidaCreate>(formInicial)
  const [saidas, setSaidas] = useState<Saida[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [formas, setFormas] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [editando, setEditando] = useState<Saida | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (busca) params.busca = busca
      if (filtroCategoria) params.categoria = filtroCategoria
      setSaidas(await api.getSaidas(params))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getCategoriasSaida().then(setCategorias)
    api.getFormasPagamento().then(setFormas)
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca, filtroCategoria])

  function handleChange(field: keyof SaidaCreate, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
  }

  function iniciarEdicao(saida: Saida) {
    setEditando(saida)
    setForm({
      data: apiDatetimeToDatetimeLocal(saida.data),
      descricao: saida.descricao,
      categoria: saida.categoria,
      valor: saida.valor,
      forma_pagamento: saida.forma_pagamento,
      observacao: saida.observacao ?? '',
    })
    setError('')
    setSucesso(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm({ ...formInicial, data: toDatetimeLocal() })
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.descricao.trim()) {
      setError('Informe a descrição da saída')
      return
    }
    if (!form.valor || form.valor <= 0) {
      setError('Informe um valor maior que zero')
      return
    }

    setSalvando(true)
    const payload = {
      ...form,
      data: form.data ? datetimeLocalParaApi(form.data) : undefined,
      observacao: form.observacao || undefined,
    }

    try {
      if (editando) {
        await api.updateSaida(editando.id, payload)
      } else {
        await api.createSaida(payload)
      }
      setForm({ ...formInicial, data: toDatetimeLocal() })
      setEditando(null)
      setSucesso(true)
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar saída')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Deseja excluir esta saída?')) return
    await api.deleteSaida(id)
    if (editando?.id === id) cancelarEdicao()
    carregar()
    onRefresh?.()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{titulo}</h1>
        <p className="page-subtitle">{subtitulo}</p>
      </div>

      <div className="form-card" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editando
            ? `Editar ${variant === 'contas-a-pagar' ? 'Conta' : 'Saída'} #${editando.id}`
            : variant === 'contas-a-pagar'
              ? 'Nova Conta a Pagar'
              : 'Nova Saída'}
        </h3>

        {error && <div className="error-message">{error}</div>}
        {sucesso && <div className="success-message">Saída registrada com sucesso!</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Data e Hora</label>
              <input
                type="datetime-local"
                className="form-input"
                value={form.data || ''}
                onChange={(e) => handleChange('data', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoria</label>
              <select
                className="form-select"
                value={form.categoria}
                onChange={(e) => handleChange('categoria', e.target.value)}
                required
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Descrição</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Compra de velas, conta de luz..."
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
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
              <label className="form-label">Forma de Pagamento</label>
              <select
                className="form-select"
                value={form.forma_pagamento}
                onChange={(e) => handleChange('forma_pagamento', e.target.value)}
                required
              >
                {formas.map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            <div className="form-group full-width">
              <label className="form-label">Observação (opcional)</label>
              <textarea
                className="form-textarea"
                placeholder="Detalhes adicionais..."
                value={form.observacao || ''}
                onChange={(e) => handleChange('observacao', e.target.value)}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={salvando}>
                <Save size={18} />
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Registrar Saída'}
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
              placeholder="Buscar descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Carregando saídas...</div>
        ) : saidas.length === 0 ? (
          <div className="empty-state">
            <ArrowDownCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma saída registrada</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Data</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Pagamento</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {saidas.map((saida) => (
                  <tr key={saida.id}>
                    <td>#{saida.id}</td>
                    <td>{formatarDataCurta(saida.data)}</td>
                    <td>{saida.descricao}</td>
                    <td><span className="badge badge-saida">{saida.categoria}</span></td>
                    <td><strong className="text-saida">{formatarMoeda(saida.valor)}</strong></td>
                    <td><span className="badge">{saida.forma_pagamento}</span></td>
                    <td className="actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => iniciarEdicao(saida)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleExcluir(saida.id)}
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
    </div>
  )
}
