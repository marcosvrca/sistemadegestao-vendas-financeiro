import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownCircle,
  Search,
  CheckCircle,
  AlertTriangle,
  Wallet,
  Landmark,
} from 'lucide-react'
import { api } from '../api'
import { diasAteVencimento, labelVencimentoConta, tipoContaPagarLabel } from '../contasPagarUi'
import { formatarMoeda, formatarDataIso } from '../utils'
import { KPICard } from './KPICard'
import { BaixaContaPagarModal } from './BaixaContaPagarModal'
import type { ContaPagar, ContasPagarResumo } from '../types'

interface ContasPagarPageProps {
  onRefresh?: () => void
}

type TipoFiltro = '' | 'avulsa' | 'recorrente' | 'dda'

export function ContasPagarPage({ onRefresh }: ContasPagarPageProps) {
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [resumo, setResumo] = useState<ContasPagarResumo | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [contaBaixando, setContaBaixando] = useState<ContaPagar | null>(null)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const params: Record<string, string> = { status: 'pendente', limite: '500' }
      if (busca) params.busca = busca
      const [contasData, resumoData] = await Promise.all([
        api.getContasPagar(params),
        api.getContasPagarResumo(),
      ])
      setContas(contasData)
      setResumo(resumoData)
    } catch (err) {
      setContas([])
      setErro(err instanceof Error ? err.message : 'Não foi possível carregar as contas a pagar.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => {
      if (filtroTipo === 'dda') return c.is_dda
      if (filtroTipo === 'recorrente') return Boolean(c.recorrente_id) && !c.is_dda
      if (filtroTipo === 'avulsa') return !c.recorrente_id && !c.is_dda
      return true
    })
  }, [contas, filtroTipo])

  function aoConcluir() {
    carregar()
    onRefresh?.()
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contas a Pagar — Visão Geral</h1>
        <p className="page-subtitle">
          Obrigações pendentes: avulsas, recorrentes e débito automático (DDA)
        </p>
      </div>

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Total a Pagar"
          value={formatarMoeda(resumo?.total_pendente ?? 0)}
          icon={Wallet}
          iconColor="red"
          subtitle={`${resumo?.quantidade_pendente ?? 0} conta${(resumo?.quantidade_pendente ?? 0) !== 1 ? 's' : ''} pendente${(resumo?.quantidade_pendente ?? 0) !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="DDA em Aberto"
          value={formatarMoeda(resumo?.total_dda ?? 0)}
          icon={Landmark}
          iconColor="gold"
          subtitle={`${resumo?.quantidade_dda ?? 0} débito${(resumo?.quantidade_dda ?? 0) !== 1 ? 's' : ''} automático${(resumo?.quantidade_dda ?? 0) !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Vencidas"
          value={formatarMoeda(resumo?.total_vencidas ?? 0)}
          icon={AlertTriangle}
          iconColor="purple"
          subtitle={`${resumo?.quantidade_vencidas ?? 0} conta${(resumo?.quantidade_vencidas ?? 0) !== 1 ? 's' : ''} em atraso`}
        />
      </div>

      {erro && <div className="error-message">{erro}</div>}

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
              placeholder="Buscar fornecedor ou descrição..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <select
            className="form-select"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoFiltro)}
          >
            <option value="">Todos os tipos</option>
            <option value="avulsa">Avulsas</option>
            <option value="recorrente">Recorrentes</option>
            <option value="dda">DDA</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Carregando contas a pagar...</div>
        ) : contasFiltradas.length === 0 ? (
          <div className="empty-state">
            <ArrowDownCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma conta a pagar pendente</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Vencimento</th>
                  <th>Fornecedor</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasFiltradas.map((conta) => {
                  const dias = diasAteVencimento(conta.data_vencimento)
                  return (
                    <tr key={conta.id}>
                      <td>
                        <span className={`badge ${conta.is_dda ? 'badge-av' : ''}`}>
                          {tipoContaPagarLabel(conta)}
                        </span>
                      </td>
                      <td>{formatarDataIso(conta.data_vencimento)}</td>
                      <td>{conta.fornecedor}</td>
                      <td>{conta.descricao}</td>
                      <td><span className="badge badge-saida">{conta.categoria}</span></td>
                      <td>
                        <strong className="text-saida">{formatarMoeda(conta.valor)}</strong>
                      </td>
                      <td>
                        <span className={`badge ${dias > 0 ? 'badge-av' : ''}`}>
                          {labelVencimentoConta(dias)}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setContaBaixando(conta)}
                          title="Registrar pagamento"
                        >
                          <CheckCircle size={14} />
                          Pagar
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
          onSuccess={aoConcluir}
        />
      )}
    </div>
  )
}
