import { Construction } from 'lucide-react'
import type { Pagina } from '../navigation'
import { EM_BREVE_CONFIG } from '../navigation'

interface EmBrevePageProps {
  pagina: Pagina
  onNavigate?: (pagina: Pagina) => void
}

export function EmBrevePage({ pagina, onNavigate }: EmBrevePageProps) {
  const config = EM_BREVE_CONFIG[pagina]
  if (!config) {
    return (
      <div className="empty-state">
        <p>Página em desenvolvimento.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">{config.titulo}</h1>
        <p className="page-subtitle">{config.descricao}</p>
      </div>

      <div className="form-card em-breve-card">
        <div className="em-breve-icon">
          <Construction size={40} />
        </div>
        <h3 className="chart-title">Em desenvolvimento</h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Esta tela já está prevista no sistema. Em breve implementaremos as regras de negócio.
        </p>

        <h4 className="em-breve-list-title">Recursos previstos</h4>
        <ul className="em-breve-list">
          {config.recursosPrevistos.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        {config.paginasRelacionadas && config.paginasRelacionadas.length > 0 && onNavigate && (
          <div className="em-breve-links">
            <span className="form-label">Enquanto isso, utilize:</span>
            <div className="em-breve-links-row">
              {config.paginasRelacionadas.map(({ pagina: p, label }) => (
                <button
                  key={p}
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigate(p)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
