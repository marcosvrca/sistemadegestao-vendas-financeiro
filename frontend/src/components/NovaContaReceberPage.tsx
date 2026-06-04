import { useEffect, useState, FormEvent } from 'react'
import { Save, Trash2, Search, Pencil, ArrowUpCircle } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataIso, toDateInput } from '../utils'
import type { ContaReceber, ContaReceberCreate } from '../types'

interface NovaContaReceberPageProps {
  onRefresh?: () => void
}

const formInicial = (): ContaReceberCreate => ({
  cliente: '',
  descricao: '',
  valor: 0,
  data_vencimento: toDateInput(),
  observacao: '',
})

export function NovaContaReceberPage({ onRefresh }: NovaContaReceberPageProps) {
  const [form, setForm] = useState<ContaReceberCreate>(formInicial)
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [editando, setEditando] = useState<ContaReceber | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params: Record<string, string> = { status: 'pendente', limite: '100' }
      if (busca) params.busca = busca
      const todas = await api.getContasReceber(params)
      setContas(todas.filter((c) => !c.recorrente_id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  function handleChange(field: keyof ContaReceberCreate, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
  }

  function iniciarEdicao(conta: ContaReceber) {
    setEditando(conta)
    setForm({
      cliente: conta.cliente,
      descricao: conta.descricao,
      valor: conta.valor,
      data_vencimento: conta.data_vencimento,
      observacao: conta.observacao ?? '',
    })
    setError('')
    setSucesso(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm(formInicial())
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!form.cliente.trim()) {
      setError('Informe o cliente')
      return
    }
    if (!form.descricao.trim()) {
      setError('Informe a descrição')
      return
    }
    if (!form.valor || form.valor <= 0) {
      setError('Informe um valor maior que zero')
      return
    }
    if (!form.data_vencimento) {
      setError('Informe a data de vencimento')
      return
    }

    setSalvando(true)
    const payload = {
      ...form,
      observacao: form.observacao || undefined,
    }

    try {
      if (editando) {
        await api.updateContaReceber(editando.id, payload)
      } else {
        await api.createContaReceber(payload)
      }
      setForm(formInicial())
      setEditando(null)
      setSucesso(true)
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar conta')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Deseja excluir esta conta a receber?')) return
    await api.deleteContaReceber(id)
    if (editando?.id === id) cancelarEdicao()
    carregar()
    onRefresh?.()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nova Conta a Receber</h1>
        <p className="page-subtitle">
          Registre cobranças avulsas que não vêm de venda AV nem de conta recorrente
        </p>
      </div>

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editando ? `Editar Conta #${editando.id}` : 'Registrar Cobrança Avulsa'}
        </h3>

        {error && <div className="error-message">{error}</div>}
        {sucesso && <div className="success-message">Conta a receber registrada com sucesso!</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: João Santos"
                value={form.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data de Vencimento</label>
              <input
                type="date"
                className="form-input"
                value={form.data_vencimento}
                onChange={(e) => handleChange('data_vencimento', e.target.value)}
                required
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Descrição</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Serviço de encomenda, consignação..."
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
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Registrar Conta'}
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
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          Cobranças Avulsas Pendentes
        </h3>
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
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando...</div>
        ) : contas.length === 0 ? (
          <div className="empty-state">
            <ArrowUpCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma cobrança avulsa pendente</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Vencimento</th>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => (
                  <tr key={conta.id}>
                    <td>#{conta.id}</td>
                    <td>{formatarDataIso(conta.data_vencimento)}</td>
                    <td>{conta.cliente}</td>
                    <td>{conta.descricao}</td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>
                        {formatarMoeda(conta.valor)}
                      </strong>
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => iniciarEdicao(conta)}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleExcluir(conta.id)}
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
