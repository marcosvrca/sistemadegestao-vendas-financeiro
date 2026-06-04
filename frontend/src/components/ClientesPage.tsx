import { useEffect, useState, FormEvent } from 'react'
import { Users, Save, Trash2, Search, Pencil } from 'lucide-react'
import { api } from '../api'
import { limparDocumento } from '../utils'
import type { Cliente } from '../types'

const formInicial = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
  observacao: '',
}

export function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
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
      setClientes(await api.getClientes(params))
    } catch (err) {
      setClientes([])
      setErro(err instanceof Error ? err.message : 'Erro ao carregar clientes')
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

  function editar(item: Cliente) {
    setEditandoId(item.id)
    setForm({
      nome: item.nome,
      documento: item.documento_formatado ?? item.documento ?? '',
      telefone: item.telefone ?? '',
      email: item.email ?? '',
      observacao: item.observacao ?? '',
    })
    setSucesso('')
    setErro('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    if (!form.nome.trim()) {
      setErro('Informe o nome do cliente')
      return
    }

    const doc = limparDocumento(form.documento)
    if (doc && doc.length !== 11 && doc.length !== 14) {
      setErro('CPF/CNPJ inválido (use 11 ou 14 dígitos)')
      return
    }

    setSalvando(true)
    try {
      const payload = {
        nome: form.nome.trim(),
        documento: doc || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
        observacao: form.observacao.trim() || undefined,
      }
      if (editandoId) {
        await api.updateCliente(editandoId, payload)
        setSucesso('Cliente atualizado.')
      } else {
        await api.createCliente(payload)
        setSucesso('Cliente cadastrado.')
      }
      resetForm()
      carregar()
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar cliente')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Excluir este cliente?')) return
    await api.deleteCliente(id)
    if (editandoId === id) resetForm()
    carregar()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <p className="page-subtitle">
          Cadastro de clientes para vendas, contas a receber e histórico de compras
        </p>
      </div>

      {erro && <div className="error-message">{erro}</div>}
      {sucesso && <div className="success-message">{sucesso}</div>}

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editandoId ? 'Editar cliente' : 'Novo cliente'}
        </h3>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nome</label>
              <input
                className="form-input"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
                placeholder="Nome completo ou razão social"
              />
            </div>
            <div className="form-group">
              <label className="form-label">CPF ou CNPJ (opcional)</label>
              <input
                className="form-input"
                value={form.documento}
                onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Telefone</label>
              <input
                className="form-input"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
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
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando clientes...</div>
        ) : clientes.length === 0 ? (
          <div className="empty-state">
            <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum cliente cadastrado</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Documento</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nome}</td>
                    <td>{item.documento_formatado ?? '—'}</td>
                    <td>
                      {item.telefone && <div>{item.telefone}</div>}
                      {item.email && (
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {item.email}
                        </div>
                      )}
                      {!item.telefone && !item.email && '—'}
                    </td>
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
