import { Calculator, Percent, Calendar, CalendarDays, StickyNote, Banknote, Gift, BadgePercent } from 'lucide-react'
import { PageShell } from '../PageShell'
import type { Pagina } from '../../navigation'

interface RecursosResumoPageProps {
  onNavigate?: (pagina: Pagina) => void
}

const atalhos: { pagina: Pagina; label: string; desc: string; icon: typeof Calculator }[] = [
  {
    pagina: 'recursos-calculadora',
    label: 'Calculadora',
    desc: 'Operações básicas (+, −, ×, ÷)',
    icon: Calculator,
  },
  {
    pagina: 'recursos-porcentagem',
    label: 'Calculadora de %',
    desc: 'Percentuais, descontos e variações',
    icon: Percent,
  },
  {
    pagina: 'recursos-calendario',
    label: 'Calendário',
    desc: 'Visualização mensal com eventos',
    icon: Calendar,
  },
  {
    pagina: 'recursos-agenda',
    label: 'Agenda',
    desc: 'Compromissos e lembretes',
    icon: CalendarDays,
  },
  {
    pagina: 'recursos-notas',
    label: 'Anotações',
    desc: 'Bloco de notas rápido',
    icon: StickyNote,
  },
  {
    pagina: 'recursos-cedulas',
    label: 'Registrar Cédulas',
    desc: 'Contagem de cédulas e moedas',
    icon: Banknote,
  },
  {
    pagina: 'recursos-sorteador',
    label: 'Sorteador',
    desc: 'Sorteios para clientes da loja',
    icon: Gift,
  },
  {
    pagina: 'recursos-promocoes',
    label: 'Promoções',
    desc: 'Descontos, brindes e campanhas',
    icon: BadgePercent,
  },
]

export function RecursosResumoPage({ onNavigate }: RecursosResumoPageProps) {
  return (
    <PageShell title="Recursos" subtitle="Ferramentas e utilidades do dia a dia">
      <div className="recursos-hub">
        <div className="atalhos-grid">
          {atalhos.map(({ pagina, label, desc, icon: Icon }) => (
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
    </PageShell>
  )
}
