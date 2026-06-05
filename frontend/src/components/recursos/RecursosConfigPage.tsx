import { Settings, Keyboard, Palette, LayoutDashboard } from 'lucide-react'
import { PageShell } from '../PageShell'
import { ConfigBreadcrumb } from './ConfigBreadcrumb'
import type { Pagina } from '../../navigation'

interface RecursosConfigPageProps {
  onNavigate?: (pagina: Pagina) => void
}

const opcoes = [
  {
    pagina: 'recursos-atalhos-teclado' as Pagina,
    label: 'Atalhos do teclado',
    desc: 'Cadastre e consulte combinações para abrir telas',
    icon: Keyboard,
  },
  {
    pagina: 'recursos-aparencia' as Pagina,
    label: 'Aparência do sistema',
    desc: 'Cores de destaque, logo e nome no menu',
    icon: Palette,
  },
  {
    pagina: 'recursos-alterar-dashboard' as Pagina,
    label: 'Alterar Dashboard',
    desc: 'Escolha quais blocos do Dashboard exibir ou ocultar',
    icon: LayoutDashboard,
  },
]

export function RecursosConfigPage({ onNavigate }: RecursosConfigPageProps) {
  return (
    <PageShell
      title="Configurações"
      subtitle="Preferências e ajustes dos Recursos"
      width="narrow"
    >
      {onNavigate && (
        <ConfigBreadcrumb
          onNavigate={onNavigate}
          items={[
            { label: 'Recursos', pagina: 'recursos' },
            { label: 'Configurações' },
          ]}
        />
      )}

      <div className="recursos-hub">
        <div className="atalhos-grid">
          {opcoes.map(({ pagina, label, desc, icon: Icon }) => (
            <button
              key={pagina}
              type="button"
              className="atalho-card"
              onClick={() => onNavigate?.(pagina)}
              disabled={!onNavigate}
            >
              <span className="atalho-card-icon">
                <Icon size={22} />
              </span>
              <strong>{label}</strong>
              <span>{desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-card" style={{ marginTop: '1.25rem' }}>
        <div className="card-body">
          <div className="alertas-secao-titulo">
            <span className="atalho-card-icon">
              <Settings size={18} />
            </span>
            <div>
              <h3 className="card-section-title">Sobre</h3>
              <p className="alertas-secao-sub">
                Ajustes de atalhos, aparência e Dashboard ficam organizados nesta seção.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  )
}
