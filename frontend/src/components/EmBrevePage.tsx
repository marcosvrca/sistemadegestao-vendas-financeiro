import { Construction } from 'lucide-react'
import { PageShell } from './PageShell'
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
    <PageShell title={config.titulo} subtitle={config.descricao} width="form">
      <div className="form-card form-card--full em-breve-card">
        <div className="em-breve-icon">
          <Construction size={40} />
        </div>
        <h3 className="chart-title">Em desenvolvimento</h3>
        <p className="em-breve-desc">
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
    </PageShell>
  )
}
