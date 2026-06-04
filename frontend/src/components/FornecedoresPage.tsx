import { useEffect, useState, FormEvent } from 'react'
import { Truck, Save, Trash2, Search, Pencil } from 'lucide-react'
import { api } from '../api'
import { formatarDocumento, limparDocumento } from '../utils'
import type { Fornecedor } from '../types'

const formInicial = {
  nome: '',
  documento: '',
  observacao: '',
}

export function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [busca, setBusca] = useState('')
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
      setFornecedores(await api.getFornecedores(params))
    } catch (err) {
      setFornecedores([])
      setErro(err instanceof Error ? err.message : 'Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  function resetForm() {
    setForm(formInicial)
    setEditandoId(null)
  }

  function editar(item: Fornecedor) {
    setEditandoId(item.id)
    setForm({
      nome: item.nome,
      documento: item.documento_formatado,
      observacao: item.observacao ?? '',
    })
    setSucesso('')
    setErro('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const doc = limparDocumento(form.documento)
    if (!form.nome.trim()) {
      setErro('Informe o nome do fornecedor')
      return
    }
    if (doc.length !== 11 && doc.length !== 14) {
      setErro('Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido')
      return
    }

    setSalvando(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        documento: doc,
        observacao: form.observacao.trim() || undefined,
      }
      if (editandoId) {
        await api.updateFornecedor(editandoId, payload)
        setSucesso('Fornecedor atualizado.')
      } else {
        await api.createFornecedor(payload)
        setSucesso('Fornecedor cadastrado.')
      }
      resetForm()
      carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar fornecedor')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Excluir este fornecedor? Contas existentes permanecem, mas perdem o vínculo.')) return
    await api.deleteFornecedor(id)
    if (editandoId === id) resetForm()
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Fornecedores</h1>
        <p className="page-subtitle">
          Cadastre CPF/CNPJ dos fornecedores para vincular às contas a pagar
        </p>
      </div>

      {erro && <div className="error-message">{erro}</div>}
      {sucesso && <div className="success-message">{sucesso}</div>}

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editandoId ? 'Editar fornecedor' : 'Novo fornecedor'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Razão social ou nome"
              />
            </div>
            <div className="form-group">
              <label className="form-label">CPF ou CNPJ</label>
              <input
                className="form-input"
                value={form.documento}
                onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
              />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Observação</label>
              <input
                className="form-input"
                value={form.observacao}
                onChange={(e) => setForm((f) => ({ ...f, observacao: e.target.value }))}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
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
          <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
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
              placeholder="Buscar por nome ou documento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando fornecedores...</div>
        ) : fornecedores.length === 0 ? (
          <div className="empty-state">
            <Truck size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum fornecedor cadastrado</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Use o formulário acima para cadastrar fornecedores com CPF ou CNPJ.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {fornecedores.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{item.documento_formatado}</td>
                    <td>{item.tipo_documento.toUpperCase()}</td>
                    <td>
                      <span className="badge">{item.ativo ? 'Ativo' : 'Inativo'}</span>
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
