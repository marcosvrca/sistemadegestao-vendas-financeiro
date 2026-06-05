import { Menu } from 'lucide-react'
import type { Pagina } from '../navigation'
import { PAGINA_TITULOS } from '../navigation'
import { ThemeToggle } from './ThemeToggle'
import { AppBrand } from './AppBrand'
import { useAparencia } from '../theme/AparenciaContext'

interface AppHeaderProps {
  paginaAtual: Pagina
  onMenuClick: () => void
}

export function AppHeader({ paginaAtual, onMenuClick }: AppHeaderProps) {
  const { nomeMarca } = useAparencia()

  return (
    <header className="app-header">
      <button
        type="button"
        className="btn btn-icon btn-ghost app-header-menu"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu size={22} />
      </button>
      <div className="app-header-brand">
        <AppBrand iconSize={18} showSubtitle={false} compact />
        <div>
          <span className="app-header-title">
            {PAGINA_TITULOS[paginaAtual] ?? nomeMarca}
          </span>
          <span className="app-header-sub">Gestão Comercial</span>
        </div>
      </div>
      <ThemeToggle compact />
    </header>
  )
}
