import { useEffect, useState } from 'react'
import {
  DollarSign,
  ArrowDownCircle,
  Banknote,
  Wallet,
  AlertCircle,
} from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, toDateInput } from '../utils'
import { KPICard } from './KPICard'
import type { CaixaDiario } from '../types'

export function CaixaControleDiarioPage() {
  const [dataSelecionada, setDataSelecionada] = useState(toDateInput())
  const [caixa, setCaixa] = useState<CaixaDiario | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      setError('')
      try {
        setCaixa(await api.getCaixaDia(dataSelecionada))
      } catch (err) {
        setCaixa(null)
        setError(err instanceof Error ? err.message : 'Erro ao carregar o dia')
      } finally {
        setLoading(false)
      }
    }
    carregar()
  }, [dataSelecionada])

  const resumo = caixa?.resumo_sistema

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Controle Diário do Caixa</h1>
        <p className="page-subtitle">
          Conferência das movimentações do dia — vendas, saídas e saldo esperado do caixa físico
        </p>
      </div>

      <div className="form-card" style={{ marginBottom: '1.5rem', maxWidth: '100%' }}>
        <div className="form-group" style={{ maxWidth: 220 }}>
          <label className="form-label">Data</label>
          <input
            type="date"
            className="form-input"
            value={dataSelecionada}
            onChange={(e) => setDataSelecionada(e.target.value)}
          />
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div className="loading">Carregando dia...</div>
      ) : (
        <>
          <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
            <KPICard
              label="Faturamento do dia"
              value={formatarMoeda(resumo?.faturamento ?? 0)}
              subtitle={`${resumo?.quantidade_vendas ?? 0} venda(s)`}
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
              subtitle={`${resumo?.quantidade_saidas ?? 0} saída(s)`}
              icon={ArrowDownCircle}
              iconColor="red"
            />
            {caixa?.aberto && caixa.saldo_esperado != null && (
              <KPICard
                label="Saldo esperado"
                value={formatarMoeda(caixa.saldo_esperado)}
                subtitle="Inicial + dinheiro − saídas dinheiro"
                icon={Wallet}
                iconColor="blue"
              />
            )}
            {caixa?.fechado && caixa.diferenca != null && (
              <KPICard
                label="Diferença no fechamento"
                value={formatarMoeda(caixa.diferenca)}
                subtitle={
                  caixa.diferenca === 0
                    ? 'Conferido'
                    : caixa.diferenca > 0
                      ? 'Sobra'
                      : 'Falta'
                }
                icon={AlertCircle}
                iconColor={caixa.diferenca === 0 ? 'green' : 'red'}
              />
            )}
          </div>

          {!caixa?.aberto && (
            <div className="form-card" style={{ marginBottom: '1.5rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>
                Nenhuma abertura de caixa registrada para esta data. Use{' '}
                <strong>Abertura e Fechamento</strong> para registrar o dia.
              </p>
            </div>
          )}

          {resumo && resumo.vendas_por_forma.length > 0 && (
            <div className="table-card">
              <h3 className="chart-title" style={{ padding: '1rem 1rem 0' }}>
                Vendas por forma de pagamento
              </h3>
              <p style={{ padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Apenas vendas em dinheiro entram no cálculo do caixa físico.
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
