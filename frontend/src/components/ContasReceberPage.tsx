import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpCircle,
  Search,
  CheckCircle,
  Pencil,
  Users,
  Receipt,
  Wallet,
} from 'lucide-react'
import { api } from '../api'
import { formatarMoeda, formatarDataCurta, formatarDataIso, parseApiDatetime } from '../utils'
import { KPICard } from './KPICard'
import { BaixaRecebimentoModal } from './BaixaRecebimentoModal'
import { BaixaContaReceberModal } from './BaixaContaReceberModal'
import { VendaEditModal } from './VendaEditModal'
import type { ContaReceber, ContasReceberResumo, Venda } from '../types'

interface ContasReceberPageProps {
  onRefresh?: () => void
}

type TipoFiltro = '' | 'av' | 'avulsa' | 'recorrente'

type LinhaPendente =
  | { tipo: 'av'; id: string; dataRef: string; cliente: string; descricao: string; valor: number; venda: Venda }
  | { tipo: 'avulsa' | 'recorrente'; id: string; dataRef: string; cliente: string; descricao: string; valor: number; conta: ContaReceber }

function diasDesde(data: string): number {
  const inicio = data.includes('T') ? parseApiDatetime(data) : new Date(data + 'T00:00:00')
  const hoje = new Date()
  inicio.setHours(0, 0, 0, 0)
  hoje.setHours(0, 0, 0, 0)
  return Math.floor((hoje.getTime() - inicio.getTime()) / 86_400_000)
}

function labelVencimentoConta(dias: number): string {
  if (dias > 0) {
    if (dias === 1) return '1 dia atraso'
    return `${dias} dias atraso`
  }
  if (dias === 0) return 'Vence hoje'
  const faltam = Math.abs(dias)
  if (faltam === 1) return 'Vence amanhã'
  return `Em ${faltam} dias`
}

function labelPendenciaAv(dias: number): string {
  if (dias === 0) return 'Hoje'
  if (dias === 1) return '1 dia'
  return `${dias} dias`
}

function tipoLabel(tipo: LinhaPendente['tipo']): string {
  if (tipo === 'av') return 'Venda AV'
  if (tipo === 'recorrente') return 'Recorrente'
  return 'Avulsa'
}

export function ContasReceberPage({ onRefresh }: ContasReceberPageProps) {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [contas, setContas] = useState<ContaReceber[]>([])
  const [resumo, setResumo] = useState<ContasReceberResumo | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<TipoFiltro>('')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [vendaBaixando, setVendaBaixando] = useState<Venda | null>(null)
  const [vendaEditando, setVendaEditando] = useState<Venda | null>(null)
  const [contaBaixando, setContaBaixando] = useState<ContaReceber | null>(null)

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const paramsVendas: Record<string, string> = {
        forma_pagamento: 'AV',
        limite: '500',
      }
      const paramsContas: Record<string, string> = {
        status: 'pendente',
        limite: '500',
      }
      if (busca) {
        paramsVendas.busca = busca
        paramsContas.busca = busca
      }
      const [vendasData, contasData, resumoData] = await Promise.all([
        api.getVendas(paramsVendas),
        api.getContasReceber(paramsContas),
        api.getContasReceberResumo(),
      ])
      setVendas(vendasData)
      setContas(contasData)
      setResumo(resumoData)
    } catch (err) {
      setVendas([])
      setContas([])
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as contas a receber.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca])

  const linhas = useMemo((): LinhaPendente[] => {
    const resultado: LinhaPendente[] = []

    for (const venda of vendas) {
      resultado.push({
        tipo: 'av',
        id: `av-${venda.id}`,
        dataRef: venda.data,
        cliente: venda.cliente.trim() || 'Cliente avulso',
        descricao: venda.produto,
        valor: venda.valor,
        venda,
      })
    }

    for (const conta of contas) {
      resultado.push({
        tipo: conta.recorrente_id ? 'recorrente' : 'avulsa',
        id: `conta-${conta.id}`,
        dataRef: conta.data_vencimento,
        cliente: conta.cliente.trim() || 'Cliente avulso',
        descricao: conta.descricao,
        valor: conta.valor,
        conta,
      })
    }

    return resultado.sort((a, b) => a.dataRef.localeCompare(b.dataRef))
  }, [vendas, contas])

  const linhasFiltradas = useMemo(() => {
    return linhas.filter((linha) => {
      if (filtroCliente && linha.cliente !== filtroCliente) return false
      if (filtroTipo === 'av' && linha.tipo !== 'av') return false
      if (filtroTipo === 'avulsa' && linha.tipo !== 'avulsa') return false
      if (filtroTipo === 'recorrente' && linha.tipo !== 'recorrente') return false
      return true
    })
  }, [linhas, filtroCliente, filtroTipo])

  const clientes = useMemo(() => {
    const nomes = new Set(linhas.map((l) => l.cliente))
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [linhas])

  const resumoPorCliente = useMemo(() => {
    const mapa = new Map<string, { total: number; quantidade: number }>()
    for (const linha of linhasFiltradas) {
      const atual = mapa.get(linha.cliente) ?? { total: 0, quantidade: 0 }
      mapa.set(linha.cliente, {
        total: atual.total + linha.valor,
        quantidade: atual.quantidade + 1,
      })
    }
    return Array.from(mapa.entries())
      .map(([cliente, dados]) => ({ cliente, ...dados }))
      .sort((a, b) => b.total - a.total)
  }, [linhasFiltradas])

  function aoConcluir() {
    carregar()
    onRefresh?.()
  }

  const totalReceber = linhasFiltradas.reduce((s, l) => s + l.valor, 0)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Contas a Receber — Visão Geral</h1>
        <p className="page-subtitle">
          Vendas AV, cobranças avulsas e títulos gerados de contas recorrentes
        </p>
      </div>

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Total a Receber"
          value={formatarMoeda(resumo?.total_geral ?? totalReceber)}
          icon={Wallet}
          iconColor="green"
          subtitle={`${resumo?.quantidade_total ?? linhasFiltradas.length} título${(resumo?.quantidade_total ?? linhasFiltradas.length) !== 1 ? 's' : ''} pendente${(resumo?.quantidade_total ?? linhasFiltradas.length) !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Vendas AV"
          value={formatarMoeda(resumo?.total_av ?? 0)}
          icon={Receipt}
          iconColor="gold"
          subtitle={`${resumo?.quantidade_av ?? 0} venda${(resumo?.quantidade_av ?? 0) !== 1 ? 's' : ''} pendente${(resumo?.quantidade_av ?? 0) !== 1 ? 's' : ''}`}
        />
        <KPICard
          label="Outras Cobranças"
          value={formatarMoeda(resumo?.total_contas ?? 0)}
          icon={Users}
          iconColor="blue"
          subtitle={`${resumo?.quantidade_contas ?? 0} conta${(resumo?.quantidade_contas ?? 0) !== 1 ? 's' : ''} avulsa/recorrente`}
        />
      </div>

      {erro && <div className="error-message">{erro}</div>}

      {resumoPorCliente.length > 1 && (
        <div className="table-card" style={{ marginBottom: '1.5rem' }}>
          <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
            Resumo por Cliente
          </h3>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Títulos</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {resumoPorCliente.map((item) => (
                  <tr key={item.cliente}>
                    <td>{item.cliente}</td>
                    <td>{item.quantidade}</td>
                    <td>
                      <strong style={{ color: 'var(--success)' }}>
                        {formatarMoeda(item.total)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
          <select
            className="form-select"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as TipoFiltro)}
          >
            <option value="">Todos os tipos</option>
            <option value="av">Vendas AV</option>
            <option value="avulsa">Avulsas</option>
            <option value="recorrente">Recorrentes</option>
          </select>
          <select
            className="form-select"
            value={filtroCliente}
            onChange={(e) => setFiltroCliente(e.target.value)}
          >
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading">Carregando contas a receber...</div>
        ) : linhasFiltradas.length === 0 ? (
          <div className="empty-state">
            <ArrowUpCircle size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
            <p>Nenhuma conta a receber pendente</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Registre vendas AV, contas avulsas ou gere cobranças de contas recorrentes.
            </p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Ref.</th>
                  <th>Data / Vencimento</th>
                  <th>Cliente</th>
                  <th>Descrição</th>
                  <th>Valor</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((linha) => {
                  const isConta = linha.tipo !== 'av'
                  const dias = diasDesde(linha.dataRef)
                  const vencida = isConta && dias > 0
                  const pendenciaAv = !isConta ? Math.max(dias, 0) : 0
                  const badgeAtraso =
                    (isConta && vencida) || (!isConta && pendenciaAv >= 30)

                  return (
                    <tr key={linha.id}>
                      <td>
                        <span className={`badge ${linha.tipo === 'av' ? 'badge-av' : ''}`}>
                          {tipoLabel(linha.tipo)}
                        </span>
                      </td>
                      <td>
                        {linha.tipo === 'av'
                          ? `#${linha.venda.id}`
                          : `#${linha.conta.id}`}
                      </td>
                      <td>
                        {linha.tipo === 'av'
                          ? formatarDataCurta(linha.dataRef)
                          : formatarDataIso(linha.dataRef)}
                      </td>
                      <td>{linha.cliente}</td>
                      <td>{linha.descricao}</td>
                      <td>
                        <strong style={{ color: 'var(--success)' }}>
                          {formatarMoeda(linha.valor)}
                        </strong>
                      </td>
                      <td>
                        <span className={`badge ${badgeAtraso ? 'badge-av' : ''}`}>
                          {isConta
                            ? labelVencimentoConta(dias)
                            : labelPendenciaAv(pendenciaAv)}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            linha.tipo === 'av'
                              ? setVendaBaixando(linha.venda)
                              : setContaBaixando(linha.conta)
                          }
                          title="Baixar recebimento"
                        >
                          <CheckCircle size={14} />
                          Baixar
                        </button>
                        {linha.tipo === 'av' && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setVendaEditando(linha.venda)}
                            title="Editar venda"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {vendaBaixando && (
        <BaixaRecebimentoModal
          venda={vendaBaixando}
          onClose={() => setVendaBaixando(null)}
          onSuccess={aoConcluir}
        />
      )}

      {contaBaixando && (
        <BaixaContaReceberModal
          conta={contaBaixando}
          onClose={() => setContaBaixando(null)}
          onSuccess={aoConcluir}
        />
      )}

      {vendaEditando && (
        <VendaEditModal
          venda={vendaEditando}
          onClose={() => setVendaEditando(null)}
          onSuccess={aoConcluir}
        />
      )}
    </div>
  )
}
