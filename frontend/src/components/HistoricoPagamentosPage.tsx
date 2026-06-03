import { useEffect, useState } from 'react'
import { History, Search } from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataCurta, formatarDataIso } from '../utils'
import type { ContaPagar, Saida } from '../types'

interface HistoricoPagamentosPageProps {
  onRefresh?: () => void
}

type LinhaHistorico =
  | { tipo: 'conta'; id: string; data: string; fornecedor: string; descricao: string; valor: number; forma: string; conta: ContaPagar }
  | { tipo: 'saida'; id: string; data: string; fornecedor: string; descricao: string; valor: number; forma: string; saida: Saida }

export function HistoricoPagamentosPage({ onRefresh: _onRefresh }: HistoricoPagamentosPageProps) {
  const [contasPagas, setContasPagas] = useState<ContaPagar[]>([])
  const [saidas, setSaidas] = useState<Saida[]>([])
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const paramsContas: Record<string, string> = { status: 'pago', limite: '200' }
      const paramsSaidas: Record<string, string> = { limite: '200' }
      if (busca) {
        paramsContas.busca = busca
        paramsSaidas.busca = busca
      }
      const [contas, saidasData] = await Promise.all([
        api.getContasPagar(paramsContas),
        api.getSaidas(paramsSaidas),
      ])
      setContasPagas(contas)
      setSaidas(saidasData.filter((s) => !contas.some((c) => c.saida_id === s.id)))
    } catch (err) {
      setContasPagas([])
      setSaidas([])
      setErro(err instanceof Error ? err.message : 'Erro ao carregar histórico.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  const linhas: LinhaHistorico[] = [
    ...contasPagas.map((conta): LinhaHistorico => ({
      tipo: 'conta',
      id: `conta-${conta.id}`,
      data: conta.data_pagamento ?? conta.criado_em,
      fornecedor: conta.fornecedor,
      descricao: conta.descricao,
      valor: conta.valor,
      forma: conta.forma_pagamento ?? '—',
      conta,
    })),
    ...saidas.map((saida): LinhaHistorico => ({
      tipo: 'saida',
      id: `saida-${saida.id}`,
      data: saida.data,
      fornecedor: '—',
      descricao: saida.descricao,
      valor: saida.valor,
      forma: saida.forma_pagamento,
      saida,
    })),
  ].sort((a, b) => b.data.localeCompare(a.data))

  const total = linhas.reduce((s, l) => s + l.valor, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Histórico de Pagamentos</h1>
        <p className="page-subtitle">
          Contas quitadas pelo módulo e saídas registradas diretamente no caixa
        </p>
      </div>

      <div className="form-preview" style={{ marginBottom: '1.5rem' }}>
        <span className="form-preview-label">Total listado</span>
        <span className="form-preview-value text-saida">{formatarMoeda(total)}</span>
        <span style={{ marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {linhas.length} registro{linhas.length !== 1 ? 's' : ''}
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
              placeholder="Buscar..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="loading">Carregando histórico...</div>
        ) : linhas.length === 0 ? (
          <div className="empty-state">
            <History size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhum pagamento registrado</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Origem</th>
                  <th>Data pagamento</th>
                  <th>Fornecedor</th>
                  <th>Descrição</th>
                  <th>Forma</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => (
                  <tr key={linha.id}>
                    <td>
                      <span className="badge">
                        {linha.tipo === 'conta' ? 'Conta quitada' : 'Saída direta'}
                      </span>
                    </td>
                    <td>
                      {linha.data.includes('T')
                        ? formatarDataCurta(linha.data)
                        : formatarDataIso(linha.data)}
                    </td>
                    <td>{linha.fornecedor}</td>
                    <td>{linha.descricao}</td>
                    <td><span className="badge">{linha.forma}</span></td>
                    <td><strong className="text-saida">{formatarMoeda(linha.valor)}</strong></td>
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
