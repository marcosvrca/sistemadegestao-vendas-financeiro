import { ChevronRight } from 'lucide-react'
import type { Pagina } from '../../navigation'

export interface ConfigBreadcrumbItem {
  label: string
  pagina?: Pagina
}

interface ConfigBreadcrumbProps {
  items: ConfigBreadcrumbItem[]
  onNavigate?: (pagina: Pagina) => void
}

export function ConfigBreadcrumb({ items, onNavigate }: ConfigBreadcrumbProps) {
  return (
    <nav className="config-breadcrumb" aria-label="Navegação">
      <ol className="config-breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="config-breadcrumb-item">
              {index > 0 && (
                <ChevronRight size={14} className="config-breadcrumb-sep" aria-hidden />
              )}
              {item.pagina && onNavigate && !isLast ? (
                <button
                  type="button"
                  className="config-breadcrumb-link"
                  onClick={() => onNavigate(item.pagina!)}
                >
                  {item.label}
                </button>
              ) : (
                <span className={isLast ? 'config-breadcrumb-current' : 'config-breadcrumb-text'}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
