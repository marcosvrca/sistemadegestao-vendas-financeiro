import type { ReactNode } from 'react'

type PageWidth = 'full' | 'narrow' | 'form'

interface PageShellProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  width?: PageWidth
  children: ReactNode
}

export function PageShell({ title, subtitle, actions, width = 'full', children }: PageShellProps) {
  const widthClass =
    width === 'narrow' ? 'page-narrow' : width === 'form' ? 'page-form' : ''

  return (
    <div className={`page-shell ${widthClass}`.trim()}>
      <header className={`page-header ${actions ? 'page-header--row' : ''}`}>
        <div className="page-header-text">
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </header>
      {children}
    </div>
  )
}
