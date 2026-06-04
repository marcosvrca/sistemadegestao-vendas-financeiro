import { useEffect, useState, FormEvent } from 'react'
import { Save, Trash2, Search, Pencil, Repeat, CalendarPlus } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda } from '../utils'
import type { ContaRecorrente, ContaRecorrenteCreate } from '../types'

interface ContasRecorrentesPageProps {
  onRefresh?: () => void
}

const formInicial: ContaRecorrenteCreate = {
  cliente: '',
  descricao: '',
  valor: 0,
  dia_vencimento: 10,
  frequencia: 'Mensal',
  ativo: true,
  observacao: '',
}

export function ContasRecorrentesPage({ onRefresh }: ContasRecorrentesPageProps) {
  const [form, setForm] = useState<ContaRecorrenteCreate>(formInicial)
  const [recorrentes, setRecorrentes] = useState<ContaRecorrente[]>([])
  const [frequencias, setFrequencias] = useState<string[]>(['Mensal'])
  const [busca, setBusca] = useState('')
  const [somenteAtivas, setSomenteAtivas] = useState(true)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [gerando, setGerando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [editando, setEditando] = useState<ContaRecorrente | null>(null)

  async function carregar() {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (busca) params.busca = busca
      if (somenteAtivas) params.ativo = 'true'
      setRecorrentes(await api.getContasRecorrentes(params))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getFrequenciasRecorrente().then(setFrequencias)
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca, somenteAtivas])

  function handleChange(field: keyof ContaRecorrenteCreate, value: string | number | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSucesso('')
  }

  function iniciarEdicao(item: ContaRecorrente) {
    setEditando(item)
    setForm({
      cliente: item.cliente,
      descricao: item.descricao,
      valor: item.valor,
      dia_vencimento: item.dia_vencimento,
      frequencia: item.frequencia,
      ativo: item.ativo,
      observacao: item.observacao ?? '',
    })
    setError('')
    setSucesso('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicao() {
    setEditando(null)
    setForm(formInicial)
    setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSucesso('')

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

    setSalvando(true)
    const payload = {
      ...form,
      observacao: form.observacao || undefined,
    }

    try {
      if (editando) {
        await api.updateContaRecorrente(editando.id, payload)
        setSucesso('Conta recorrente atualizada!')
      } else {
        await api.createContaRecorrente(payload)
        setSucesso('Conta recorrente cadastrada!')
      }
      setForm(formInicial)
      setEditando(null)
      carregar()
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Deseja excluir esta conta recorrente?')) return
    await api.deleteContaRecorrente(id)
    if (editando?.id === id) cancelarEdicao()
    carregar()
    onRefresh?.()
  }

  async function handleGerarCobranca(id: number) {
    setError('')
    setSucesso('')
    try {
      await api.gerarCobrancaRecorrente(id)
      setSucesso('Cobrança do mês gerada com sucesso!')
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar cobrança')
    }
  }

  async function handleGerarTodas() {
    setGerando(true)
    setError('')
    setSucesso('')
    try {
      const resultado = await api.gerarCobrancasMes()
      setSucesso(
        `${resultado.geradas} cobrança${resultado.geradas !== 1 ? 's' : ''} gerada${resultado.geradas !== 1 ? 's' : ''}` +
          (resultado.ignoradas > 0 ? ` · ${resultado.ignoradas} ignorada(s)` : ''),
      )
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar cobranças')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contas Recorrentes</h1>
        <p className="page-subtitle">
          Clientes mensais e cobranças periódicas — gere as cobranças do mês na visão geral
        </p>
      </div>

      <div className="form-card form-card--full form-card--stack">
        <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
          {editando ? `Editar Recorrente #${editando.id}` : 'Nova Conta Recorrente'}
        </h3>

        {error && <div className="error-message">{error}</div>}
        {sucesso && <div className="success-message">{sucesso}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Cliente</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Maria Silva"
                value={form.cliente}
                onChange={(e) => handleChange('cliente', e.target.value)}
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
              <label className="form-label">Descrição</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ex: Mensalidade, aluguel de vitrine..."
                value={form.descricao}
                onChange={(e) => handleChange('descricao', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Dia do Vencimento</label>
              <select
                className="form-select"
                value={form.dia_vencimento}
                onChange={(e) => handleChange('dia_vencimento', parseInt(e.target.value, 10))}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Dia {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Frequência</label>
              <select
                className="form-select"
                value={form.frequencia}
                onChange={(e) => handleChange('frequencia', e.target.value)}
              >
                {frequencias.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                className="form-select"
                value={form.ativo ? 'ativo' : 'inativo'}
                onChange={(e) => handleChange('ativo', e.target.value === 'ativo')}
              >
                <option value="ativo">Ativa</option>
                <option value="inativo">Inativa</option>
              </select>
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
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar'}
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
              placeholder="Buscar cliente ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <label className="av-filtro-check">
            <input
              type="checkbox"
              checked={somenteAtivas}
              onChange={(e) => setSomenteAtivas(e.target.checked)}
            />
            Só ativas
          </label>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleGerarTodas}
            disabled={gerando}
          >
            <CalendarPlus size={14} />
            {gerando ? 'Gerando...' : 'Gerar cobranças do mês'}
          </button>
        </div>

        {loading ? (
          <div className="loading">Carregando contas recorrentes...</div>
        ) : recorrentes.length === 0 ? (
          <div className="empty-state">
            <Repeat size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma conta recorrente cadastrada</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Cadastre clientes mensais e use &quot;Gerar cobrança&quot; para criar títulos na visão geral.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Vencimento</th>
                  <th>Frequência</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {recorrentes.map((item) => (
                  <tr key={item.id}>
                    <td>{item.cliente}</td>
                    <td>{item.descricao}</td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>
                        {formatarMoeda(item.valor)}
                      </strong>
                    </td>
                    <td>Dia {item.dia_vencimento}</td>
                    <td><span className="badge">{item.frequencia}</span></td>
                    <td>
                      <span className={`badge ${item.ativo ? '' : 'badge-av'}`}>
                        {item.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleGerarCobranca(item.id)}
                        title="Gerar cobrança do mês"
                        disabled={!item.ativo}
                      >
                        <CalendarPlus size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => iniciarEdicao(item)}
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
