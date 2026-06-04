import { useEffect, useState, FormEvent } from 'react'
import { Tags, Save, Trash2, Search, Pencil } from 'lucide-react'
import { api } from '../api'
import type { Categoria, TipoCategoria } from '../types'

const formInicial = {
  nome: '',
  tipo: 'saida' as TipoCategoria,
}

const TIPO_LABEL: Record<TipoCategoria, string> = {
  saida: 'Despesas / Saídas',
  produto: 'Produtos',
}

export function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoCategoria | ''>('')
  const [form, setForm] = useState(formInicial)
  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const params: Record<string, string> = { limite: '500' }
      if (busca) params.busca = busca
      if (filtroTipo) params.tipo = filtroTipo
      setCategorias(await api.getCategorias(params))
    } catch (err) {
      setCategorias([])
      setErro(err instanceof Error ? err.message : 'Erro ao carregar categorias')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca, filtroTipo])

  function resetForm() {
    setForm(formInicial)
    setEditandoId(null)
  }

  function editar(item: Categoria) {
    setEditandoId(item.id)
    setForm({ nome: item.nome, tipo: item.tipo })
    setSucesso('')
    setErro('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!form.nome.trim()) {
      setErro('Informe o nome da categoria')
      return
    }

    setSalvando(true)
    try {
      const payload = { nome: form.nome.trim(), tipo: form.tipo, ativo: true }
      if (editandoId) {
        await api.updateCategoria(editandoId, payload)
        setSucesso('Categoria atualizada.')
      } else {
        await api.createCategoria(payload)
        setSucesso('Categoria cadastrada.')
      }
      resetForm()
      carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar categoria')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Excluir esta categoria? Registros antigos mantêm o nome usado.')) return
    await api.deleteCategoria(id)
    if (editandoId === id) resetForm()
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Categorias</h1>
        <p className="page-subtitle">
          Categorias de produtos e de despesas/saídas usadas em todo o sistema
        </p>
      </div>

      {erro && <div className="error-message">{erro}</div>}
      {sucesso && <div className="success-message">{sucesso}</div>}

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title form-section-title">
          {editandoId ? 'Editar categoria' : 'Nova categoria'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Fornecedor, Velas..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tipo</label>
              <select
                className="form-select"
                value={form.tipo}
                disabled={Boolean(editandoId)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tipo: e.target.value as TipoCategoria }))
                }
              >
                <option value="saida">Despesas / Saídas</option>
                <option value="produto">Produtos</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={salvando}>
              <Save size={16} />
              {salvando ? 'Salvando...' : editandoId ? 'Atualizar' : 'Cadastrar'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <div className="search-field">
            <Search size={16} className="search-field-icon" />
            <input
              className="form-input"
              placeholder="Buscar categoria..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoCategoria | '')}
          >
            <option value="">Todos os tipos</option>
            <option value="saida">Despesas / Saídas</option>
            <option value="produto">Produtos</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Carregando categorias...</div>
        ) : categorias.length === 0 ? (
          <div className="empty-state">
            <Tags size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma categoria encontrada</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>
                      <span className="badge badge-saida">{TIPO_LABEL[item.tipo]}</span>
                    </td>
                    <td>
                      <span className="badge">{item.ativo ? 'Ativa' : 'Inativa'}</span>
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => editar(item)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleExcluir(item.id)}
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
