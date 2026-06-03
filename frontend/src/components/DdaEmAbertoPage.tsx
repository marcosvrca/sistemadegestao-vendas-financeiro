import { useEffect, useState } from 'react'
import { Landmark, Search, CheckCircle } from 'lucide-react'
import { api } from '../api'
import { diasAteVencimento, labelVencimentoConta } from '../contasPagarUi'
import { formatarMoeda, formatarDataIso } from '../utils'
import { BaixaContaPagarModal } from './BaixaContaPagarModal'
import type { ContaPagar } from '../types'

interface DdaEmAbertoPageProps {
  onRefresh?: () => void
}

export function DdaEmAbertoPage({ onRefresh }: DdaEmAbertoPageProps) {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [contaBaixando, setContaBaixando] = useState<ContaPagar | null>(null)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const params: Record<string, string> = {
        status: 'pendente',
        is_dda: 'true',
        limite: '500',
      }
      if (busca) params.busca = busca
      setContas(await api.getContasPagar(params))
    } catch (err) {
      setContas([])
      setErro(err instanceof Error ? err.message : 'Erro ao carregar DDA em aberto.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  const total = contas.reduce((s, c) => s + c.valor, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">DDA em Aberto</h1>
        <p className="page-subtitle">
          Débitos diretos autorizados aguardando compensação no banco — confirme após o débito
        </p>
      </div>

      <div className="form-preview" style={{ marginBottom: '1.5rem' }}>
        <span className="form-preview-label">Total DDA pendente</span>
        <span className="form-preview-value text-saida">{formatarMoeda(total)}</span>
        <span style={{ marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {contas.length} título{contas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {erro && <div className="error-message">{erro}</div>}

      <div className="table-card">
        <div className="table-toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: 280 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              className="form-input"
              style={{ paddingLeft: 36, maxWidth: '100%' }}
              placeholder="Buscar fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando DDA...</div>
        ) : contas.length === 0 ? (
          <div className="empty-state">
            <Landmark size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum DDA em aberto</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Marque contas como DDA ao cadastrar ou em contas recorrentes.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Fornecedor</th>
                  <th>Descrição</th>
                  <th>Linha digitável</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((conta) => {
                  const dias = diasAteVencimento(conta.data_vencimento)
                  return (
                    <tr key={conta.id}>
                      <td>{formatarDataIso(conta.data_vencimento)}</td>
                      <td>{conta.fornecedor}</td>
                      <td>{conta.descricao}</td>
                      <td style={{ fontSize: '0.75rem', maxWidth: 180, wordBreak: 'break-all' }}>
                        {conta.linha_digitavel || '—'}
                      </td>
                      <td><strong className="text-saida">{formatarMoeda(conta.valor)}</strong></td>
                      <td>
                        <span className={`badge ${dias > 0 ? 'badge-av' : ''}`}>
                          {labelVencimentoConta(dias)}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setContaBaixando(conta)}
                          title="Confirmar débito compensado"
                        >
                          <CheckCircle size={14} />
                          Confirmar
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {contaBaixando && (
        <BaixaContaPagarModal
          conta={contaBaixando}
          onClose={() => setContaBaixando(null)}
          onSuccess={() => {
            carregar()
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
