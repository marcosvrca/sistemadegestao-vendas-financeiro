import { Cross } from 'lucide-react'
import { useAparencia } from '../theme/AparenciaContext'

interface AppBrandProps {
  iconSize?: number
  showSubtitle?: boolean
  compact?: boolean
}

export function AppBrand({ iconSize = 22, showSubtitle = true, compact = false }: AppBrandProps) {
  const { config, nomeMarca } = useAparencia()

  return (
    <>
      <div className={`sidebar-logo-icon ${config.logoUrl ? 'sidebar-logo-icon--imagem' : ''}`}>
        {config.logoUrl ? (
          <img src={config.logoUrl} alt="" className="app-brand-logo" />
        ) : (
          <Cross size={iconSize} />
        )}
      </div>
      {!compact && (
        <div>
          <div className="sidebar-logo">{nomeMarca}</div>
          {showSubtitle && <div className="sidebar-subtitle">Gestão Comercial</div>}
        </div>
      )}
    </>
  )
}
