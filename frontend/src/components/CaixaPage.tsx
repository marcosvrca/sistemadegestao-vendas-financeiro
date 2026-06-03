import { useEffect, useState, FormEvent } from 'react'
import {
  Wallet,
  Save,
  Lock,
  DollarSign,
  ArrowDownCircle,
  Banknote,
  AlertCircle,
} from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, toDateInput } from '../utils'
import { KPICard } from './KPICard'
import type { CaixaDiario } from '../types'

interface CaixaPageProps {
  onRefresh?: () => void
}

export function CaixaPage({ onRefresh }: CaixaPageProps) {
  const [dataSelecionada, setDataSelecionada] = useState(toDateInput())
  const [caixa, setCaixa] = useState<CaixaDiario | null>(null)
  const [valorInicial, setValorInicial] = useState('')
  const [obsAbertura, setObsAbertura] = useState('')
  const [valorFechamento, setValorFechamento] = useState('')
  const [obsFechamento, setObsFechamento] = useState('')
  const [loadingDia, setLoadingDia] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [error, setError] = useState('')
  const [sucesso, setSucesso] = useState('')

  async function carregarDia(data: string) {
    setLoadingDia(true)
    setError('')
    try {
      const dia = await api.getCaixaDia(data)
      setCaixa(dia)
      setValorInicial(dia.valor_inicial != null ? String(dia.valor_inicial) : '')
      setObsAbertura(dia.observacao_abertura ?? '')
      setValorFechamento(dia.valor_fechamento != null ? String(dia.valor_fechamento) : '')
      setObsFechamento(dia.observacao_fechamento ?? '')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar caixa'
      setError(
        msg === 'Not Found'
          ? 'API de caixa indisponível. Feche a janela "Recanto da Fe - Backend" na barra de tarefas e execute iniciar-loja.bat novamente.'
          : msg,
      )
    } finally {
      setLoadingDia(false)
    }
  }

  useEffect(() => {
    carregarDia(dataSelecionada)
  }, [dataSelecionada])

  async function handleAbertura(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSucesso('')

    const valor = parseFloat(valorInicial)
    if (Number.isNaN(valor) || valor < 0) {
      setError('Informe o valor inicial do caixa (0 ou mais)')
      return
    }

    setSalvando(true)
    try {
      const resultado = await api.registrarAberturaCaixa({
        data: dataSelecionada,
        valor_inicial: valor,
        observacao: obsAbertura || undefined,
      })
      setCaixa(resultado)
      setSucesso('Abertura do caixa registrada.')
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar abertura')
    } finally {
      setSalvando(false)
    }
  }

  async function handleFechamento(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSucesso('')

    const valor = parseFloat(valorFechamento)
    if (Number.isNaN(valor) || valor < 0) {
      setError('Informe o valor contado no caixa ao fechar')
      return
    }

    setSalvando(true)
    try {
      const resultado = await api.registrarFechamentoCaixa({
        data: dataSelecionada,
        valor_fechamento: valor,
        observacao: obsFechamento || undefined,
      })
      setCaixa(resultado)
      setSucesso('Caixa fechado com sucesso.')
      onRefresh?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fechar caixa')
    } finally {
      setSalvando(false)
    }
  }

  const resumo = caixa?.resumo_sistema
  const fechado = caixa?.fechado ?? false
  const aberto = caixa?.aberto ?? false

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Abertura e Fechamento de Caixa</h1>
        <p className="page-subtitle">
          Registre o valor inicial, feche o dia e confira a diferença do caixa físico
        </p>
      </div>

      <div className="form-card" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
        <div className="form-grid" style={{ alignItems: 'end' }}>
          <div className="form-group">
            <label className="form-label">Data</label>
            <input
              type="date"
              className="form-input"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
            />
          </div>
        </div>
      </div>

      {error && <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>}
      {sucesso && <div className="success-message" style={{ marginBottom: '1rem' }}>{sucesso}</div>}

      {loadingDia ? (
        <div className="loading">Carregando dia...</div>
      ) : (
        <>
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <KPICard
              label="Faturamento do dia"
              value={formatarMoeda(resumo?.faturamento ?? 0)}
              subtitle={`${resumo?.quantidade_vendas ?? 0} venda(s) — somente leitura`}
              icon={DollarSign}
              iconColor="gold"
            />
            <KPICard
              label="Vendas em dinheiro"
              value={formatarMoeda(resumo?.vendas_dinheiro ?? 0)}
              subtitle="Entrada no caixa físico"
              icon={Banknote}
              iconColor="green"
            />
            <KPICard
              label="Saídas em dinheiro"
              value={formatarMoeda(resumo?.saidas_dinheiro ?? 0)}
              subtitle={`${resumo?.quantidade_saidas ?? 0} saída(s) no dia`}
              icon={ArrowDownCircle}
              iconColor="red"
            />
            {aberto && caixa?.saldo_esperado != null && (
              <KPICard
                label="Saldo esperado no caixa"
                value={formatarMoeda(caixa.saldo_esperado)}
                subtitle="Inicial + dinheiro vendas − saídas em dinheiro"
                icon={Wallet}
                iconColor="blue"
              />
            )}
            {fechado && caixa?.diferenca != null && (
              <KPICard
                label="Diferença no fechamento"
                value={formatarMoeda(caixa.diferenca)}
                subtitle={
                  caixa.diferenca === 0
                    ? 'Caixa conferido'
                    : caixa.diferenca > 0
                      ? 'Sobra no caixa'
                      : 'Falta no caixa'
                }
                icon={AlertCircle}
                iconColor={caixa.diferenca === 0 ? 'green' : 'red'}
              />
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-card">
              <h3 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wallet size={20} />
                Abertura do caixa
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Valor em dinheiro no início do dia (ex.: troco deixado no caixa). Cada dia tem sua própria abertura.
              </p>
              <form onSubmit={handleAbertura}>
                <div className="form-group">
                  <label className="form-label">Valor inicial (R$)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    step={0.01}
                    value={valorInicial}
                    onChange={(e) => setValorInicial(e.target.value)}
                    disabled={fechado}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Observação (opcional)</label>
                  <textarea
                    className="form-textarea"
                    value={obsAbertura}
                    onChange={(e) => setObsAbertura(e.target.value)}
                    disabled={fechado}
                    placeholder="Ex.: troco do dia anterior"
                  />
                </div>
                {!fechado && (
                  <button type="submit" className="btn btn-primary" disabled={salvando}>
                    <Save size={18} />
                    {salvando ? 'Salvando...' : aberto ? 'Atualizar abertura' : 'Registrar abertura'}
                  </button>
                )}
                {fechado && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Abertura: {formatarMoeda(caixa?.valor_inicial ?? 0)}
                  </p>
                )}
              </form>
            </div>

            <div className="form-card">
              <h3 className="chart-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lock size={20} />
                Fechamento do caixa
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                Conte o dinheiro físico e informe o valor. O sistema compara com o saldo esperado calculado pelas vendas e saídas em dinheiro do dia.
              </p>

              {aberto && caixa?.saldo_esperado != null && !fechado && (
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '1rem',
                    marginBottom: '1rem',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    Saldo esperado pelo sistema
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-light)' }}>
                    {formatarMoeda(caixa.saldo_esperado)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    {formatarMoeda(caixa.valor_inicial ?? 0)} (inicial)
                    {' + '}
                    {formatarMoeda(resumo?.vendas_dinheiro ?? 0)} (vendas dinheiro)
                    {' − '}
                    {formatarMoeda(resumo?.saidas_dinheiro ?? 0)} (saídas dinheiro)
                  </div>
                </div>
              )}

              {!aberto ? (
                <p style={{ color: 'var(--text-secondary)' }}>Registre a abertura do caixa antes de fechar.</p>
              ) : fechado ? (
                <div>
                  <p><strong>Valor contado:</strong> {formatarMoeda(caixa?.valor_fechamento ?? 0)}</p>
                  <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Fechado em{' '}
                    {caixa?.fechado_em
                      ? new Date(caixa.fechado_em).toLocaleString('pt-BR')
                      : '—'}
                  </p>
                  {caixa?.observacao_fechamento && (
                    <p style={{ marginTop: 8, fontSize: '0.875rem' }}>{caixa.observacao_fechamento}</p>
                  )}
                </div>
              ) : (
                <form onSubmit={handleFechamento}>
                  <div className="form-group">
                    <label className="form-label">Valor contado no caixa (R$)</label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      step={0.01}
                      value={valorFechamento}
                      onChange={(e) => setValorFechamento(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Observação (opcional)</label>
                    <textarea
                      className="form-textarea"
                      value={obsFechamento}
                      onChange={(e) => setObsFechamento(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={salvando}>
                    <Lock size={18} />
                    {salvando ? 'Fechando...' : 'Fechar caixa'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {resumo && resumo.vendas_por_forma.length > 0 && (
            <div className="table-card" style={{ marginBottom: '1.5rem' }}>
              <h3 className="chart-title" style={{ padding: '1rem 1rem 0' }}>
                Vendas do dia por forma de pagamento
              </h3>
              <p style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Referência do sistema — não entra no cálculo do caixa exceto &quot;Dinheiro&quot;
              </p>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Forma</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.vendas_por_forma.map((v) => (
                      <tr key={v.forma_pagamento}>
                        <td>{v.forma_pagamento}</td>
                        <td><strong>{formatarMoeda(v.total)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
