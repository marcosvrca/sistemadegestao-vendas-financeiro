import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface KPICardProps {
  label: string
  value: string
  icon: LucideIcon
  iconColor: 'gold' | 'green' | 'blue' | 'purple' | 'red'
  change?: number
  changeLabel?: string
  subtitle?: string
}

export function KPICard({ label, value, icon: Icon, iconColor, change, changeLabel, subtitle }: KPICardProps) {
  const changeClass =
    change === undefined ? 'neutral' : change >= 0 ? 'positive' : 'negative'

  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <span className="kpi-label">{label}</span>
        <div className={`kpi-icon ${iconColor}`}>
          <Icon size={20} />
        </div>
      </div>
      <div className="kpi-value">{value}</div>
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
      {change !== undefined && (
        <div className={`kpi-change ${changeClass}`}>
          {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {change >= 0 ? '+' : ''}{change}% {changeLabel || 'vs mês anterior'}
        </div>
      )}
    </div>
  )
}
