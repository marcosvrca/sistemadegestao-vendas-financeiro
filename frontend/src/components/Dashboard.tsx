import { useEffect, useMemo, useState } from 'react'
import {
  DollarSign,
  ShoppingBag,
  Receipt,
  Tag,
  Package,
  ArrowDownCircle,
  Wallet,
  Trophy,
  AlertTriangle,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { api } from '../api'
import { kpisVazios, vendasAVVazias } from '../dashboardDefaults'
import { buildDashboardParams, filtrosIniciais } from '../dashboardFilters'
import type { DashboardFiltrosState } from '../dashboardFilters'
import { formatarMoeda, formatarDataIso, formatarPeriodo } from '../utils'
import type { DashboardKPIs, SaidaPorCategoria, SaidaPorPeriodo, TopItem, VendaMesAtual, VendaPorFormaPagamento, VendaPorPeriodo, VendasAVPendentes } from '../types'
import { KPICard } from './KPICard'
import { DashboardFiltros } from './DashboardFiltros'
import { VendasAVAlerta } from './VendasAVAlerta'
import { useTheme } from '../theme/ThemeContext'
import { chartTooltipStyle, getChartTheme } from '../theme/chartTheme'

function ChartVazio({ altura = 280 }: { altura?: number }) {
  return (
    <div className="chart-vazio" style={{ height: altura }}>
      Sem dados no período
    </div>
  )
}

export function Dashboard() {
  const { theme } = useTheme()
  const chart = useMemo(() => getChartTheme(), [theme])
  const tooltipStyle = useMemo(() => chartTooltipStyle(), [theme])
  const CORES = useMemo(
    () => [chart.accent, chart.success, chart.info, chart.purple, chart.danger],
    [chart],
  )

  const [filtros, setFiltros] = useState<DashboardFiltrosState>(filtrosIniciais)
  const [kpis, setKpis] = useState<DashboardKPIs>(() => kpisVazios())
  const [vendasPeriodo, setVendasPeriodo] = useState<VendaPorPeriodo[]>([])
  const [formasPagamento, setFormasPagamento] = useState<VendaPorFormaPagamento[]>([])
  const [topProdutos, setTopProdutos] = useState<TopItem[]>([])
  const [topClientes, setTopClientes] = useState<TopItem[]>([])
  const [vendasMes, setVendasMes] = useState<VendaMesAtual[]>([])
  const [saidasPeriodo, setSaidasPeriodo] = useState<SaidaPorPeriodo[]>([])
  const [saidasCategoria, setSaidasCategoria] = useState<SaidaPorCategoria[]>([])
  const [vendasAV, setVendasAV] = useState<VendasAVPendentes>(vendasAVVazias)
  const [loading, setLoading] = useState(true)
  const [erroConexao, setErroConexao] = useState<string | null>(null)

  const params = useMemo(() => buildDashboardParams(filtros), [filtros])

  useEffect(() => {
    if (!params) {
      setLoading(false)
      setKpis(kpisVazios('Selecione as datas do filtro'))
      setVendasPeriodo([])
      setFormasPagamento([])
      setTopProdutos([])
      setTopClientes([])
      setVendasMes([])
      setSaidasPeriodo([])
      setSaidasCategoria([])
      return
    }

    async function carregar() {
      setLoading(true)
      setErroConexao(null)
      try {
        const resultados = await Promise.allSettled([
          api.getKPIs(params),
          api.getVendasPeriodo(params),
          api.getFormasPagamentoDashboard(params),
          api.getTopProdutos(params, 5),
          api.getTopClientes(params, 5),
          api.getVendasMesAtual(params),
          api.getSaidasPeriodo(params),
          api.getSaidasCategoria(params),
          api.getVendasAVPendentes(),
        ])

        const valor = <T,>(index: number, fallback: T): T =>
          resultados[index].status === 'fulfilled'
            ? (resultados[index] as PromiseFulfilledResult<T>).value
            : fallback

        setKpis(valor(0, kpisVazios()))
        setVendasPeriodo(valor(1, []))
        setFormasPagamento(valor(2, []))
        setTopProdutos(valor(3, []))
        setTopClientes(valor(4, []))
        setVendasMes(valor(5, []))
        setSaidasPeriodo(valor(6, []))
        setSaidasCategoria(valor(7, []))
        setVendasAV(valor(8, vendasAVVazias))

        const falhas = resultados.filter((r) => r.status === 'rejected')
        if (falhas.length === resultados.length) {
          setErroConexao('Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
        }
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(carregar, 250)
    return () => clearTimeout(timer)
  }, [params])

  const dadosPeriodo = vendasPeriodo.map((v) => ({
    ...v,
    label: formatarPeriodo(v.periodo),
  }))

  const dadosPagamento = formasPagamento.map((f) => ({
    name: f.forma_pagamento,
    value: f.total,
    quantidade: f.quantidade,
  }))

  const dadosSaidasPeriodo = saidasPeriodo.map((s) => ({
    ...s,
    label: formatarPeriodo(s.periodo),
  }))

  const dadosSaidasCategoria = saidasCategoria.map((s) => ({
    name: s.categoria,
    value: s.total,
    quantidade: s.quantidade,
  }))

  if (loading && vendasPeriodo.length === 0 && kpis.total_vendas === 0 && !erroConexao) {
    return <div className="loading">Carregando dashboard...</div>
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Indicadores estratégicos — vendas, saídas e resultado</p>
      </div>

      {erroConexao && <div className="error-message">{erroConexao}</div>}

      <DashboardFiltros
        filtros={filtros}
        onChange={setFiltros}
        descricaoPeriodo={kpis.descricao_periodo}
      />

      {vendasAV.quantidade > 0 && <VendasAVAlerta dados={vendasAV} />}

      <div className={`kpi-grid ${loading ? 'kpi-grid-loading' : ''}`}>
        <KPICard
          label="Faturamento"
          value={formatarMoeda(kpis.total_vendas)}
          icon={DollarSign}
          iconColor="gold"
          subtitle="Somente vendas pagas (AV pendente não entra)"
        />
        <KPICard
          label="Média de Venda"
          value={formatarMoeda(kpis.ticket_medio)}
          icon={Receipt}
          iconColor="purple"
        />
        <KPICard
          label="Quantidade de Vendas"
          value={kpis.quantidade_vendas.toString()}
          icon={ShoppingBag}
          iconColor="green"
        />
        <KPICard
          label="Itens Vendidos"
          value={kpis.total_itens.toString()}
          icon={Package}
          iconColor="blue"
        />
        <KPICard
          label="Descontos"
          value={formatarMoeda(kpis.total_descontos)}
          icon={Tag}
          iconColor="red"
        />
        <KPICard
          label="Total de Saídas"
          value={formatarMoeda(kpis.total_saidas)}
          icon={ArrowDownCircle}
          iconColor="red"
        />
        <KPICard
          label="Quantidade de Saídas"
          value={kpis.quantidade_saidas.toString()}
          icon={ArrowDownCircle}
          iconColor="red"
        />
        <KPICard
          label="Saldo"
          value={formatarMoeda(kpis.saldo)}
          icon={Wallet}
          iconColor={kpis.saldo >= 0 ? 'green' : 'red'}
        />
        <KPICard
          label="Melhor Dia de Vendas"
          value={kpis.melhor_dia ? formatarDataIso(kpis.melhor_dia) : '—'}
          subtitle={
            kpis.melhor_dia
              ? `${formatarMoeda(kpis.melhor_dia_total ?? 0)} · ${kpis.melhor_dia_quantidade ?? 0} venda(s)`
              : 'Sem vendas no período'
          }
          icon={Trophy}
          iconColor="gold"
        />
        {vendasAV.quantidade > 0 && (
          <KPICard
            label="AV Pendentes"
            value={vendasAV.quantidade.toString()}
            subtitle={`${formatarMoeda(vendasAV.total)} a receber`}
            icon={AlertTriangle}
            iconColor="red"
          />
        )}
      </div>

      <div className="charts-grid">
        <div className="chart-card full-width">
          <h3 className="chart-title">Evolução de Vendas</h3>
          {dadosPeriodo.length === 0 ? (
            <ChartVazio altura={300} />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dadosPeriodo}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.accent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chart.accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="label" stroke={chart.axis} fontSize={12} />
                <YAxis stroke={chart.axis} fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatarMoeda(value), 'Total']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={chart.accent}
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card full-width">
          <h3 className="chart-title">Evolução de Saídas</h3>
          {dadosSaidasPeriodo.length === 0 ? (
            <ChartVazio altura={280} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dadosSaidasPeriodo}>
                <defs>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chart.danger} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={chart.danger} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="label" stroke={chart.axis} fontSize={12} />
                <YAxis stroke={chart.axis} fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatarMoeda(value), 'Saídas']}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={chart.danger}
                  strokeWidth={2}
                  fill="url(#colorSaidas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Saídas por Categoria</h3>
          {dadosSaidasCategoria.length === 0 ? (
            <ChartVazio />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dadosSaidasCategoria}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dadosSaidasCategoria.map((_, index) => (
                    <Cell key={index} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => formatarMoeda(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Vendas por Forma de Pagamento</h3>
          {dadosPagamento.length === 0 ? (
            <ChartVazio />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={dadosPagamento}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {dadosPagamento.map((_, index) => (
                    <Cell key={index} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => formatarMoeda(value)}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Vendas por Dia</h3>
          {vendasMes.length === 0 ? (
            <ChartVazio />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={vendasMes}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis dataKey="dia" stroke={chart.axis} fontSize={12} />
                <YAxis stroke={chart.axis} fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatarMoeda(value), 'Total']}
                  labelFormatter={(dia) => `Dia ${dia}`}
                />
                <Bar dataKey="total" fill={chart.success} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Top 5 Produtos</h3>
          {topProdutos.length === 0 ? (
            <ChartVazio />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topProdutos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis type="number" stroke={chart.axis} fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  stroke={chart.axis}
                  fontSize={11}
                  width={120}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatarMoeda(value), 'Faturamento']}
                />
                <Bar dataKey="total" fill={chart.info} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Top 5 Clientes</h3>
          {topClientes.length === 0 ? (
            <ChartVazio />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topClientes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                <XAxis type="number" stroke={chart.axis} fontSize={12} tickFormatter={(v) => `R$${v}`} />
                <YAxis
                  type="category"
                  dataKey="nome"
                  stroke={chart.axis}
                  fontSize={11}
                  width={120}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [formatarMoeda(value), 'Total Comprado']}
                />
                <Bar dataKey="total" fill={chart.purple} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
