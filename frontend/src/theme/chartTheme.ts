/** Lê variáveis CSS do tema ativo para gráficos Recharts */
export function getChartTheme() {
  const root = document.documentElement
  const style = getComputedStyle(root)
  const v = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback

  return {
    grid: v('--chart-grid', '#2d3f54'),
    axis: v('--chart-axis', '#64748b'),
    tooltipBg: v('--chart-tooltip-bg', '#1e2a3a'),
    tooltipBorder: v('--chart-tooltip-border', '#2d3f54'),
    tooltipText: v('--chart-tooltip-text', '#f0f4f8'),
    accent: v('--accent', '#c9a227'),
    success: v('--success', '#22c55e'),
    danger: v('--danger', '#ef4444'),
    info: v('--info', '#3b82f6'),
    purple: v('--purple', '#a855f7'),
  }
}

export function chartTooltipStyle() {
  const c = getChartTheme()
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: '10px',
    color: c.tooltipText,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
  }
}
