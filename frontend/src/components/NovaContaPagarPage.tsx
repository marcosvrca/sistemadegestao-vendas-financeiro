import { useEffect, useState, FormEvent } from 'react'
import { Save, Trash2, Search, Pencil, ArrowDownCircle } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataIso, toDateInput } from '../utils'
import type { ContaPagar, ContaPagarCreate, Fornecedor } from '../types'

interface NovaContaPagarPageProps {
  onRefresh?: () => void
}

const formInicial = (): ContaPagarCreate => ({
  fornecedor: '',
  descricao: '',
  categoria: 'Fornecedor',
  valor: 0,
  data_vencimento: toDateInput(),
  linha_digitavel: '',
  observacao: '',
})

export function NovaContaPagarPage({ onRefresh }: NovaContaPagarPageProps) {
  const [form, setForm] = useState<ContaPagarCreate>(formInicial)
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [fornecedoresCadastro, setFornecedoresCadastro] = useState<Fornecedor[]>([])
  const [categorias, setCategorias] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [editando, setEditando] = useState<ContaPagar | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params: Record<string, string> = { status: 'pendente', limite: '100' }
      if (busca) params.busca = busca
      const todas = await api.getContasPagar(params)
      setContas(todas.filter((c) => !c.recorrente_id))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getCategoriasSaida().then(setCategorias)
    api.getFornecedores({ ativo: 'true', limite: '500' }).then(setFornecedoresCadastro).catch(() => [])
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  function handleChange(field: keyof ContaPagarCreate, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso(false)
  }

  function iniciarEdicao(conta: ContaPagar) {
    setEditando(conta)
    setForm({
      fornecedor: conta.fornecedor,
      descricao: conta.descricao,
      categoria: conta.categoria,
      valor: conta.valor,
      data_vencimento: conta.data_vencimento,
      linha_digitavel: conta.linha_digitavel ?? '',
      fornecedor_id: conta.fornecedor_id ?? undefined,
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

    if (!form.fornecedor.trim()) {
      setError('Informe o fornecedor')
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

    setSalvando(true)
    const payload = {
      ...form,
      linha_digitavel: form.linha_digitavel || undefined,
      observacao: form.observacao || undefined,
    }

    try {
      if (editando) {
        await api.updateContaPagar(editando.id, payload)
      } else {
        await api.createContaPagar(payload)
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
    if (!confirm('Deseja excluir esta conta a pagar?')) return
    await api.deleteContaPagar(id)
    if (editando?.id === id) cancelarEdicao()
    carregar()
    onRefresh?.()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Nova Conta a Pagar</h1>
        <p className="page-subtitle">
          Registre obrigações avulsas — boletos, NF de fornecedor, serviços pontuais
        </p>
      </div>

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editando ? `Editar Conta #${editando.id}` : 'Registrar Conta Avulsa'}
        </h3>

        {error && <div className="error-message">{error}</div>}
        {sucesso && <div className="success-message">Conta a pagar registrada com sucesso!</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {fornecedoresCadastro.length > 0 && (
              <div className="form-group full-width">
                <label className="form-label">Fornecedor cadastrado (CPF/CNPJ)</label>
                <select
                  className="form-select"
                  value={form.fornecedor_id ?? ''}
                  onChange={(e) => {
                    const id = e.target.value ? Number(e.target.value) : undefined
                    const selecionado = fornecedoresCadastro.find((f) => f.id === id)
                    setForm((prev) => ({
                      ...prev,
                      fornecedor_id: id,
                      fornecedor: selecionado?.nome ?? prev.fornecedor,
                    }))
                    setSucesso(false)
                  }}
                >
                  <option value="">Selecionar fornecedor cadastrado...</option>
                  {fornecedoresCadastro.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome} — {f.documento_formatado}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Fornecedor</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Distribuidora São Bento"
                value={form.fornecedor}
                onChange={(e) => handleChange('fornecedor', e.target.value)}
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
                placeholder="Ex: Compra de velas, conta de luz..."
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
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
              <label className="form-label">Linha digitável (opcional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Para boletos"
                value={form.linha_digitavel || ''}
                onChange={(e) => handleChange('linha_digitavel', e.target.value)}
              />
            </div>

            <div className="form-group full-width">
              <label className="form-label">Observação (opcional)</label>
              <textarea
                className="form-textarea"
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
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>Contas Avulsas Pendentes</h3>
        <div className="table-toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
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
            <ArrowDownCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma conta avulsa pendente</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Fornecedor</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => (
                  <tr key={conta.id}>
                    <td>{formatarDataIso(conta.data_vencimento)}</td>
                    <td>{conta.fornecedor}</td>
                    <td>{conta.descricao}</td>
                    <td><strong className="text-saida">{formatarMoeda(conta.valor)}</strong></td>
                    <td className="actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => iniciarEdicao(conta)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleExcluir(conta.id)}>
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
