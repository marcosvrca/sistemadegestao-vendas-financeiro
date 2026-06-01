import { Menu, Cross } from 'lucide-react'
import type { Pagina } from '../navigation'
import { PAGINA_TITULOS } from '../navigation'
import { ThemeToggle } from './ThemeToggle'

interface AppHeaderProps {
  paginaAtual: Pagina
  onMenuClick: () => void
}

export function AppHeader({ paginaAtual, onMenuClick }: AppHeaderProps) {
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
        <Cross size={18} className="app-header-cross" />
        <div>
          <span className="app-header-title">
            {PAGINA_TITULOS[paginaAtual] ?? 'Recanto da Fé'}
          </span>
          <span className="app-header-sub">Gestão Comercial</span>
        </div>
      </div>
      <ThemeToggle compact />
    </header>
  )
}
