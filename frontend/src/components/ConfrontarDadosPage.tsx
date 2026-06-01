import { useState } from 'react'
import { GitCompare, Calendar, Trophy, TrendingUp, TrendingDown } from 'lucide-react'
import { api } from '../api'
import type { ComparacaoMetrica, ConfrontarPeriodosResponse, DiaVendasResumo } from '../types'
import { formatarDataIso, formatarMoeda } from '../utils'

function toDateInput(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function periodoMesAtual() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  return { inicio: toDateInput(inicio), fim: toDateInput(hoje) }
}

function periodoMesAnterior() {
  const hoje = new Date()
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  return { inicio: toDateInput(inicio), fim: toDateInput(fim) }
}

const METRICAS_MOEDA = new Set(['faturamento', 'total_saidas', 'saldo', 'ticket_medio'])

function formatarMetrica(chave: string, valor: number): string {
  return METRICAS_MOEDA.has(chave) ? formatarMoeda(valor) : String(Math.round(valor))
}

function formatarVariacao(valor: number | null): string {
  if (valor === null) return '—'
  const sinal = valor >= 0 ? '+' : ''
  return `${sinal}${valor}%`
}

function descricaoIntervalo(inicio: string, fim: string): string {
  return `${formatarDataIso(inicio)} a ${formatarDataIso(fim)}`
}

function ListaTopDias({ titulo, dias }: { titulo: string; dias: DiaVendasResumo[] }) {
  return (
    <div className="confrontar-top-dias">
      <h4 className="confrontar-top-dias-title">
        <Trophy size={16} />
        {titulo}
      </h4>
      {dias.length === 0 ? (
        <p className="confrontar-empty">Nenhuma venda no período</p>
      ) : (
        <ol className="confrontar-top-lista">
          {dias.map((dia, index) => (
            <li key={dia.data ?? index}>
              <span className="confrontar-top-pos">{index + 1}º</span>
              <span className="confrontar-top-data">
                {dia.data ? formatarDataIso(dia.data) : '—'}
              </span>
              <span className="confrontar-top-valor">{formatarMoeda(dia.total)}</span>
              <span className="confrontar-top-qtd">{dia.quantidade} venda(s)</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export function ConfrontarDadosPage() {
  const mesAtual = periodoMesAtual()
  const mesAnterior = periodoMesAnterior()

  const [periodoA, setPeriodoA] = useState(mesAnterior)
  const [periodoB, setPeriodoB] = useState(mesAtual)
  const [resultado, setResultado] = useState<ConfrontarPeriodosResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function comparar() {
    if (!periodoA.inicio || !periodoA.fim || !periodoB.inicio || !periodoB.fim) {
      setErro('Preencha todas as datas dos dois períodos')
      return
    }
    if (periodoA.inicio > periodoA.fim || periodoB.inicio > periodoB.fim) {
      setErro('A data inicial deve ser anterior à data final em cada período')
      return
    }

    setLoading(true)
    setErro(null)
    try {
      const dados = await api.confrontarPeriodos({
        data_a_inicio: new Date(periodoA.inicio).toISOString(),
        data_a_fim: new Date(periodoA.fim + 'T23:59:59').toISOString(),
        data_b_inicio: new Date(periodoB.inicio).toISOString(),
        data_b_fim: new Date(periodoB.fim + 'T23:59:59').toISOString(),
      })
      setResultado(dados)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao comparar períodos')
      setResultado(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Confrontar Dados</h1>
        <p className="page-subtitle">
          Compare faturamento, entradas, saídas e melhores dias entre dois períodos
        </p>
      </div>

      <div className="confrontar-seletores">
        <div className="confrontar-periodo-card">
          <div className="confrontar-periodo-header">
            <Calendar size={18} />
            <span>Período A</span>
          </div>
          <div className="confrontar-periodo-datas">
            <label>
              De
              <input
                type="date"
                className="form-input"
                value={periodoA.inicio}
                onChange={(e) => setPeriodoA({ ...periodoA, inicio: e.target.value })}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                className="form-input"
                value={periodoA.fim}
                onChange={(e) => setPeriodoA({ ...periodoA, fim: e.target.value })}
              />
            </label>
          </div>
          <p className="confrontar-periodo-resumo">
            {descricaoIntervalo(periodoA.inicio, periodoA.fim)}
          </p>
        </div>

        <div className="confrontar-vs">VS</div>

        <div className="confrontar-periodo-card">
          <div className="confrontar-periodo-header">
            <Calendar size={18} />
            <span>Período B</span>
          </div>
          <div className="confrontar-periodo-datas">
            <label>
              De
              <input
                type="date"
                className="form-input"
                value={periodoB.inicio}
                onChange={(e) => setPeriodoB({ ...periodoB, inicio: e.target.value })}
              />
            </label>
            <label>
              Até
              <input
                type="date"
                className="form-input"
                value={periodoB.fim}
                onChange={(e) => setPeriodoB({ ...periodoB, fim: e.target.value })}
              />
            </label>
          </div>
          <p className="confrontar-periodo-resumo">
            {descricaoIntervalo(periodoB.inicio, periodoB.fim)}
          </p>
        </div>
      </div>

      <div className="confrontar-acoes">
        <button type="button" className="btn btn-primary" onClick={comparar} disabled={loading}>
          <GitCompare size={18} />
          {loading ? 'Comparando...' : 'Comparar períodos'}
        </button>
      </div>

      {erro && <div className="error-message">{erro}</div>}

      {resultado && (
        <>
          <div className="confrontar-resumo-cards">
            <div className="confrontar-resumo-card">
              <span className="confrontar-resumo-label">Período A — Faturamento</span>
              <span className="confrontar-resumo-valor">{formatarMoeda(resultado.periodo_a.faturamento)}</span>
            </div>
            <div className="confrontar-resumo-card">
              <span className="confrontar-resumo-label">Período B — Faturamento</span>
              <span className="confrontar-resumo-valor">{formatarMoeda(resultado.periodo_b.faturamento)}</span>
            </div>
          </div>

          <div className="confrontar-tabela-card">
            <h3 className="chart-title">Comparativo de métricas</h3>
            <div className="table-wrapper">
              <table className="data-table confrontar-tabela">
                <thead>
                  <tr>
                    <th>Métrica</th>
                    <th>Período A</th>
                    <th>Período B</th>
                    <th>Variação (A → B)</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.comparacoes.map((linha: ComparacaoMetrica) => {
                    const variacao = linha.variacao_pct
                    const variacaoClass =
                      variacao === null ? 'neutral' : variacao >= 0 ? 'positive' : 'negative'
                    return (
                      <tr key={linha.chave}>
                        <td>{linha.label}</td>
                        <td>{formatarMetrica(linha.chave, linha.periodo_a)}</td>
                        <td>{formatarMetrica(linha.chave, linha.periodo_b)}</td>
                        <td className={`confrontar-variacao ${variacaoClass}`}>
                          {variacao !== null && (
                            variacao >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />
                          )}
                          {formatarVariacao(variacao)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="confrontar-melhores-dias">
            <ListaTopDias
              titulo="Melhores dias — Período A"
              dias={resultado.periodo_a.top_dias_vendas}
            />
            <ListaTopDias
              titulo="Melhores dias — Período B"
              dias={resultado.periodo_b.top_dias_vendas}
            />
          </div>

          <div className="confrontar-melhor-dia-destaque">
            <div className="confrontar-melhor-item">
              <span className="confrontar-melhor-label">Melhor dia — Período A</span>
              {resultado.periodo_a.melhor_dia.data ? (
                <>
                  <strong>{formatarDataIso(resultado.periodo_a.melhor_dia.data)}</strong>
                  <span>{formatarMoeda(resultado.periodo_a.melhor_dia.total)} · {resultado.periodo_a.melhor_dia.quantidade} venda(s)</span>
                </>
              ) : (
                <span className="confrontar-empty">Sem vendas</span>
              )}
            </div>
            <div className="confrontar-melhor-item">
              <span className="confrontar-melhor-label">Melhor dia — Período B</span>
              {resultado.periodo_b.melhor_dia.data ? (
                <>
                  <strong>{formatarDataIso(resultado.periodo_b.melhor_dia.data)}</strong>
                  <span>{formatarMoeda(resultado.periodo_b.melhor_dia.total)} · {resultado.periodo_b.melhor_dia.quantidade} venda(s)</span>
                </>
              ) : (
                <span className="confrontar-empty">Sem vendas</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
