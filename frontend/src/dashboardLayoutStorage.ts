export type DashboardWidgetId =
  | 'kpi_faturamento'
  | 'kpi_ticket_medio'
  | 'kpi_quantidade_vendas'
  | 'kpi_itens_vendidos'
  | 'kpi_descontos'
  | 'kpi_total_saidas'
  | 'kpi_quantidade_saidas'
  | 'kpi_saldo'
  | 'kpi_melhor_dia'
  | 'kpi_av_pendentes'
  | 'alerta_vendas_av'
  | 'chart_evolucao_vendas'
  | 'chart_evolucao_saidas'
  | 'chart_saidas_categoria'
  | 'chart_formas_pagamento'
  | 'chart_vendas_dia'
  | 'chart_top_produtos'
  | 'chart_top_clientes'

export interface DashboardWidgetDef {
  id: DashboardWidgetId
  label: string
  grupo: 'kpis' | 'graficos' | 'alertas'
}

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: 'kpi_faturamento', label: 'Faturamento', grupo: 'kpis' },
  { id: 'kpi_ticket_medio', label: 'Média de Venda', grupo: 'kpis' },
  { id: 'kpi_quantidade_vendas', label: 'Quantidade de Vendas', grupo: 'kpis' },
  { id: 'kpi_itens_vendidos', label: 'Itens Vendidos', grupo: 'kpis' },
  { id: 'kpi_descontos', label: 'Descontos', grupo: 'kpis' },
  { id: 'kpi_total_saidas', label: 'Total de Saídas', grupo: 'kpis' },
  { id: 'kpi_quantidade_saidas', label: 'Quantidade de Saídas', grupo: 'kpis' },
  { id: 'kpi_saldo', label: 'Saldo', grupo: 'kpis' },
  { id: 'kpi_melhor_dia', label: 'Melhor Dia de Vendas', grupo: 'kpis' },
  { id: 'kpi_av_pendentes', label: 'AV Pendentes', grupo: 'kpis' },
  { id: 'alerta_vendas_av', label: 'Alerta de vendas AV', grupo: 'alertas' },
  { id: 'chart_evolucao_vendas', label: 'Evolução de Vendas', grupo: 'graficos' },
  { id: 'chart_evolucao_saidas', label: 'Evolução de Saídas', grupo: 'graficos' },
  { id: 'chart_saidas_categoria', label: 'Saídas por Categoria', grupo: 'graficos' },
  { id: 'chart_formas_pagamento', label: 'Vendas por Forma de Pagamento', grupo: 'graficos' },
  { id: 'chart_vendas_dia', label: 'Vendas por Dia', grupo: 'graficos' },
  { id: 'chart_top_produtos', label: 'Top 5 Produtos', grupo: 'graficos' },
  { id: 'chart_top_clientes', label: 'Top 5 Clientes', grupo: 'graficos' },
]

const STORAGE_KEY = 'recanto-dashboard-layout'
export const DASHBOARD_LAYOUT_ALTERADO_EVENT = 'recanto-dashboard-layout-alterado'

export type DashboardLayoutConfig = Record<DashboardWidgetId, boolean>

function layoutPadrao(): DashboardLayoutConfig {
  return Object.fromEntries(
    DASHBOARD_WIDGETS.map((w) => [w.id, true])
  ) as DashboardLayoutConfig
}

export function carregarDashboardLayout(): DashboardLayoutConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return layoutPadrao()
    const parsed = JSON.parse(raw) as Partial<DashboardLayoutConfig>
    const base = layoutPadrao()
    for (const w of DASHBOARD_WIDGETS) {
      if (typeof parsed[w.id] === 'boolean') {
        base[w.id] = parsed[w.id]!
      }
    }
    return base
  } catch {
    return layoutPadrao()
  }
}

export function salvarDashboardLayout(config: DashboardLayoutConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent(DASHBOARD_LAYOUT_ALTERADO_EVENT))
}

export function restaurarDashboardLayoutPadrao(): DashboardLayoutConfig {
  const padrao = layoutPadrao()
  salvarDashboardLayout(padrao)
  return padrao
}

export function widgetDashboardVisivel(
  config: DashboardLayoutConfig,
  id: DashboardWidgetId
): boolean {
  return config[id] ?? true
}
