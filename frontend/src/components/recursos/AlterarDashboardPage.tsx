import { useEffect, useState } from 'react'
import { RotateCcw, Save } from 'lucide-react'
import { PageShell } from '../PageShell'
import { ConfigBreadcrumb } from './ConfigBreadcrumb'
import type { Pagina } from '../../navigation'
import {
  DASHBOARD_WIDGETS,
  type DashboardLayoutConfig,
  type DashboardWidgetId,
  carregarDashboardLayout,
  restaurarDashboardLayoutPadrao,
  salvarDashboardLayout,
} from '../../dashboardLayoutStorage'

interface AlterarDashboardPageProps {
  onNavigate?: (pagina: Pagina) => void
}

const GRUPO_TITULOS = {
  kpis: 'Indicadores (KPIs)',
  graficos: 'Gráficos',
  alertas: 'Alertas',
} as const

export function AlterarDashboardPage({ onNavigate }: AlterarDashboardPageProps) {
  const [layout, setLayout] = useState<DashboardLayoutConfig>(() => carregarDashboardLayout())
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (!salvo) return
    const t = setTimeout(() => setSalvo(false), 2500)
    return () => clearTimeout(t)
  }, [salvo])

  function alternar(id: DashboardWidgetId) {
    setLayout((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function salvar() {
    salvarDashboardLayout(layout)
    setSalvo(true)
  }

  function restaurar() {
    if (!confirm('Restaurar todos os blocos do Dashboard para o padrão?')) return
    setLayout(restaurarDashboardLayoutPadrao())
    setSalvo(true)
  }

  const grupos = (['kpis', 'alertas', 'graficos'] as const).map((grupo) => ({
    grupo,
    titulo: GRUPO_TITULOS[grupo],
    widgets: DASHBOARD_WIDGETS.filter((w) => w.grupo === grupo),
  }))

  return (
    <PageShell
      title="Alterar Dashboard"
      subtitle="Ative ou desative as visualizações já existentes no Dashboard — nada é criado aqui, apenas exibido ou ocultado"
      width="form"
    >
      {onNavigate && (
        <ConfigBreadcrumb
          onNavigate={onNavigate}
          items={[
            { label: 'Recursos', pagina: 'recursos' },
            { label: 'Configurações', pagina: 'recursos-configuracoes' },
            { label: 'Alterar Dashboard' },
          ]}
        />
      )}

      <div className="page-stack">
        {salvo && <div className="success-message">Layout do Dashboard salvo.</div>}

        {grupos.map(({ grupo, titulo, widgets }) => (
          <div key={grupo} className="panel-card">
            <div className="card-body">
              <h3 className="card-section-title">{titulo}</h3>
              <p className="atalhos-regras">
                Marque para exibir no Dashboard; desmarque para ocultar.
              </p>
              <ul className="dashboard-layout-lista">
                {widgets.map((widget) => (
                  <li key={widget.id} className="dashboard-layout-item">
                    <label className="dashboard-layout-label">
                      <input
                        type="checkbox"
                        checked={layout[widget.id]}
                        onChange={() => alternar(widget.id)}
                      />
                      {widget.label}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={salvar}>
            <Save size={18} />
            Salvar alterações
          </button>
          <button type="button" className="btn btn-secondary" onClick={restaurar}>
            <RotateCcw size={18} />
            Restaurar padrão
          </button>
        </div>
      </div>
    </PageShell>
  )
}
