import { useEffect, useState } from 'react'
import { Trash2, Search, Pencil, Calendar, X } from 'lucide-react'
import { api } from '../api'
import {
  formatarMoeda,
  formatarDataCurta,
  FORMA_CARTAO_CREDITO,
  isVendaAV,
  toDateInput,
} from '../utils'
import type { Venda, VendasAVPendentes } from '../types'
import { VendaEditModal } from './VendaEditModal'
import { VendasAVAlerta } from './VendasAVAlerta'

interface VendasListProps {
  onRefresh?: () => void
}

type PeriodoRapido = '' | 'hoje' | '7dias' | 'mes'

function inicioDoMes(): string {
  const d = new Date()
  return toDateInput(new Date(d.getFullYear(), d.getMonth(), 1))
}

function periodoRapidoParaDatas(tipo: PeriodoRapido): { inicio: string; fim: string } {
  const hoje = toDateInput()
  if (tipo === 'hoje') return { inicio: hoje, fim: hoje }
  if (tipo === '7dias') {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return { inicio: toDateInput(d), fim: hoje }
  }
  if (tipo === 'mes') return { inicio: inicioDoMes(), fim: hoje }
  return { inicio: '', fim: '' }
}

function datasParaApi(inicio: string, fim: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (inicio) params.data_inicio = `${inicio}T00:00:00`
  if (fim) params.data_fim = `${fim}T23:59:59`
  return params
}

function formatarDataFiltro(iso: string): string {
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return `${d}/${m}/${y}`
}

function descricaoFiltrosAtivos(opts: {
  busca: string
  formaPagamento: string
  somenteAV: boolean
  periodoRapido: PeriodoRapido
  dataInicio: string
  dataFim: string
}): string {
  const partes: string[] = []
  if (opts.periodoRapido === 'hoje') partes.push('Hoje')
  else if (opts.periodoRapido === '7dias') partes.push('Últimos 7 dias')
  else if (opts.periodoRapido === 'mes') partes.push('Este mês')
  else if (opts.dataInicio || opts.dataFim) {
    if (opts.dataInicio && opts.dataInicio === opts.dataFim) {
      partes.push(formatarDataFiltro(opts.dataInicio))
    } else {
      const ini = opts.dataInicio ? formatarDataFiltro(opts.dataInicio) : '…'
      const fim = opts.dataFim ? formatarDataFiltro(opts.dataFim) : '…'
      partes.push(`${ini} a ${fim}`)
    }
  }
  if (opts.busca.trim()) partes.push(`Busca: "${opts.busca.trim()}"`)
  if (opts.somenteAV) partes.push('AV pendentes')
  else if (opts.formaPagamento) partes.push(opts.formaPagamento)
  return partes.join(' · ')
}

export function VendasList({ onRefresh }: VendasListProps) {
  const [vendas, setVendas] = useState<Venda[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [formaPagamento, setFormaPagamento] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [periodoRapido, setPeriodoRapido] = useState<PeriodoRapido>('')
  const [formas, setFormas] = useState<string[]>([])
  const [vendaEditando, setVendaEditando] = useState<Venda | null>(null)
  const [vendasAV, setVendasAV] = useState<VendasAVPendentes | null>(null)
  const [somenteAV, setSomenteAV] = useState(false)
  const [erro, setErro] = useState('')

  async function carregar() {
    setLoading(true)
    setErro('')
    try {
      const params: Record<string, string> = {
        limite: '500',
        ...datasParaApi(dataInicio, dataFim),
      }
      if (busca) params.busca = busca
      if (somenteAV) {
        params.forma_pagamento = 'AV'
      } else if (formaPagamento) {
        params.forma_pagamento = formaPagamento
      }
      const [data, av] = await Promise.all([
        api.getVendas(params),
        api.getVendasAVPendentes(),
      ])
      setVendas(data)
      setVendasAV(av)
    } catch (err) {
      setVendas([])
      setErro(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar as vendas. Verifique se o backend está rodando.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.getFormasPagamentoVenda().then(setFormas)
  }, [])

  useEffect(() => {
    const timer = setTimeout(carregar, 300)
    return () => clearTimeout(timer)
  }, [busca, formaPagamento, somenteAV, dataInicio, dataFim])

  function aplicarPeriodoRapido(tipo: PeriodoRapido) {
    setPeriodoRapido(tipo)
    const { inicio, fim } = periodoRapidoParaDatas(tipo)
    setDataInicio(inicio)
    setDataFim(fim)
  }

  function limparFiltros() {
    setBusca('')
    setFormaPagamento('')
    setSomenteAV(false)
    setPeriodoRapido('')
    setDataInicio('')
    setDataFim('')
  }

  const temFiltros =
    busca || formaPagamento || somenteAV || dataInicio || dataFim

  const descricaoFiltro = descricaoFiltrosAtivos({
    busca,
    formaPagamento,
    somenteAV,
    periodoRapido,
    dataInicio,
    dataFim,
  })

  const totalListado = vendas.reduce((s, v) => s + v.valor, 0)

  async function handleExcluir(id: number) {
    if (!confirm('Deseja excluir esta venda?')) return
    await api.deleteVenda(id)
    carregar()
    onRefresh?.()
  }

  return (
    <div className="vendas-page">
      <div className="page-header vendas-page-header">
        <div>
          <h1 className="page-title">Vendas</h1>
          <p className="page-subtitle">
            {loading
              ? 'Carregando...'
              : `${vendas.length} venda${vendas.length !== 1 ? 's' : ''} · ${formatarMoeda(totalListado)}`}
          </p>
        </div>
      </div>

      {vendasAV && !somenteAV && <VendasAVAlerta dados={vendasAV} compacto />}

      {erro && <div className="error-message vendas-compact-msg">{erro}</div>}

      <div className="vendas-filtros-card">
        <div className="vendas-filtros-linha">
          <div className="vendas-busca">
            <Search size={16} className="vendas-busca-icon" />
            <input
              className="form-input"
              placeholder="Buscar produto ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="vendas-filtro-datas">
            <Calendar size={14} className="vendas-filtro-datas-icon" />
            <input
              type="date"
              className="form-input form-input-sm"
              value={dataInicio}
              onChange={(e) => {
                setDataInicio(e.target.value)
                setPeriodoRapido('')
              }}
              title="Data inicial"
            />
            <span className="vendas-filtro-sep">até</span>
            <input
              type="date"
              className="form-input form-input-sm"
              value={dataFim}
              onChange={(e) => {
                setDataFim(e.target.value)
                setPeriodoRapido('')
              }}
              title="Data final"
            />
          </div>
          <select
            className="form-select form-input-sm vendas-filtro-select"
            value={somenteAV ? 'AV' : formaPagamento}
            onChange={(e) => {
              const val = e.target.value
              if (val === 'AV') {
                setSomenteAV(true)
                setFormaPagamento('')
              } else {
                setSomenteAV(false)
                setFormaPagamento(val)
              }
            }}
          >
            <option value="">Todas as formas</option>
            {formas.map((f) => (
              <option key={f} value={f}>
                {f === 'AV' ? 'AV (pendentes)' : f}
              </option>
            ))}
          </select>
        </div>

        <div className="vendas-filtros-linha vendas-filtros-linha--2">
          <div className="vendas-periodo-chips">
            <button
              type="button"
              className={`vendas-periodo-chip ${periodoRapido === 'hoje' ? 'active' : ''}`}
              onClick={() => aplicarPeriodoRapido('hoje')}
            >
              Hoje
            </button>
            <button
              type="button"
              className={`vendas-periodo-chip ${periodoRapido === '7dias' ? 'active' : ''}`}
              onClick={() => aplicarPeriodoRapido('7dias')}
            >
              7 dias
            </button>
            <button
              type="button"
              className={`vendas-periodo-chip ${periodoRapido === 'mes' ? 'active' : ''}`}
              onClick={() => aplicarPeriodoRapido('mes')}
            >
              Este mês
            </button>
          </div>
          <label className="av-filtro-check">
            <input
              type="checkbox"
              checked={somenteAV}
              onChange={(e) => {
                setSomenteAV(e.target.checked)
                if (e.target.checked) setFormaPagamento('')
              }}
            />
            Só AV pendentes
          </label>
          {temFiltros && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={limparFiltros}>
              <X size={14} /> Limpar filtros
            </button>
          )}
        </div>
      </div>

      {!loading && temFiltros && (
        <div className="vendas-resultado-bar" aria-live="polite">
          <span className="vendas-resultado-contagem">
            <strong>{vendas.length}</strong>{' '}
            {vendas.length === 1 ? 'registro retornado' : 'registros retornados'}
          </span>
          {descricaoFiltro && (
            <span className="vendas-resultado-filtro">{descricaoFiltro}</span>
          )}
          {vendas.length > 0 && (
            <span className="vendas-resultado-total">Total {formatarMoeda(totalListado)}</span>
          )}
        </div>
      )}

      {loading ? (
        <div className="loading">Carregando vendas...</div>
      ) : vendas.length === 0 ? (
        <div className="empty-state vendas-empty">
          Nenhuma venda encontrada com os filtros atuais.
        </div>
      ) : (
        <ul className="vendas-lista">
          {vendas.map((venda) => {
            const multiItens = (venda.itens?.length ?? 0) > 1
            const temTroco = venda.troco != null && venda.troco > 0
            const temRecebido = venda.valor_recebido != null && venda.valor_recebido > 0

            return (
              <li
                key={venda.id}
                className={`venda-lista-item ${isVendaAV(venda.forma_pagamento) ? 'is-av' : ''}`}
              >
                <div className="venda-lista-corpo">
                  <div className="venda-lista-top">
                    <span className="venda-lista-id">#{venda.id}</span>
                    <span className="venda-lista-data">{formatarDataCurta(venda.data)}</span>
                    <span
                      className={`badge ${isVendaAV(venda.forma_pagamento) ? 'badge-av' : ''}`}
                    >
                      {isVendaAV(venda.forma_pagamento)
                        ? 'AV — Pendente'
                        : venda.forma_pagamento === FORMA_CARTAO_CREDITO && venda.parcelas
                          ? `${venda.forma_pagamento} · ${venda.parcelas}x`
                          : venda.forma_pagamento}
                    </span>
                    {venda.promocao_nome && (
                      <span className="badge badge-promo" title="Venda vinculada à promoção">
                        Promo: {venda.promocao_nome}
                      </span>
                    )}
                  </div>

                  <p className="venda-lista-produto">
                    {venda.produto}
                    {multiItens && (
                      <span className="badge badge-itens">{venda.itens!.length} itens</span>
                    )}
                  </p>
                  <p className="venda-lista-cliente">{venda.cliente}</p>

                  <div className="venda-lista-detalhes">
                    <span>
                      {venda.quantidade}× {formatarMoeda(venda.valor_unitario)}
                    </span>
                    {venda.desconto > 0 && (
                      <span className="venda-lista-desc">
                        Desc. {formatarMoeda(venda.desconto)}
                      </span>
                    )}
                    {temRecebido && (
                      <span>Recebido {formatarMoeda(venda.valor_recebido!)}</span>
                    )}
                    {temTroco && (
                      <span className="venda-lista-troco">
                        Troco {formatarMoeda(venda.troco!)}
                      </span>
                    )}
                    {venda.forma_pagamento === FORMA_CARTAO_CREDITO &&
                      venda.parcelas &&
                      venda.parcelas > 1 && (
                        <span>
                          {venda.parcelas}x de {formatarMoeda(venda.valor / venda.parcelas)}
                        </span>
                      )}
                  </div>

                  {multiItens && venda.itens && (
                    <ul className="venda-lista-subitens">
                      {venda.itens.map((item, i) => (
                        <li key={item.id ?? i}>
                          {item.produto} — {item.quantidade}×{' '}
                          {formatarMoeda(item.valor_unitario ?? item.valor ?? 0)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="venda-lista-lateral">
                  <span className="venda-lista-valor">{formatarMoeda(venda.valor)}</span>
                  <div className="venda-lista-acoes">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setVendaEditando(venda)}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleExcluir(venda.id)}
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {vendaEditando && (
        <VendaEditModal
          venda={vendaEditando}
          onClose={() => setVendaEditando(null)}
          onSuccess={() => {
            carregar()
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
