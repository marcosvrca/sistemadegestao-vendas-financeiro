import { useEffect, useState } from 'react'
import { ChevronDown, Cross, X } from 'lucide-react'
import type { Pagina } from '../navigation'
import { NAV_SECOES, secaoIdDaPagina } from '../navigation'
import { ThemeToggle } from './ThemeToggle'

interface SidebarProps {
  paginaAtual: Pagina
  onNavigate: (pagina: Pagina) => void
  aberto?: boolean
  onFechar?: () => void
}

function criarExpandidasIniciais(pagina: Pagina): Set<string> {
  return new Set([secaoIdDaPagina(pagina)])
}

export function Sidebar({ paginaAtual, onNavigate, aberto, onFechar }: SidebarProps) {
  const [expandidas, setExpandidas] = useState<Set<string>>(() =>
    criarExpandidasIniciais(paginaAtual),
  )

  useEffect(() => {
    const id = secaoIdDaPagina(paginaAtual)
    setExpandidas((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }, [paginaAtual])

  function toggleSecao(secaoId: string) {
    setExpandidas((prev) => {
      const next = new Set(prev)
      if (next.has(secaoId)) next.delete(secaoId)
      else next.add(secaoId)
      return next
    })
  }

  function secaoTemPaginaAtiva(secaoId: string) {
    const secao = NAV_SECOES.find((s) => s.id === secaoId)
    return secao?.items.some((i) => i.id === paginaAtual) ?? false
  }

  return (
    <aside className={`sidebar ${aberto ? 'sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-logo-icon">
            <Cross size={22} />
          </div>
          <div>
            <div className="sidebar-logo">Recanto da Fé</div>
            <div className="sidebar-subtitle">Gestão Comercial</div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-icon btn-ghost sidebar-close"
          onClick={onFechar}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {NAV_SECOES.map((secao) => {
          const aberta = expandidas.has(secao.id)
          const ativa = secaoTemPaginaAtiva(secao.id)

          return (
            <div
              key={secao.id}
              className={`sidebar-section ${aberta ? 'expanded' : ''} ${ativa ? 'has-active' : ''}`}
            >
              <button
                type="button"
                className="sidebar-section-toggle"
                onClick={() => toggleSecao(secao.id)}
                aria-expanded={aberta}
                aria-controls={`sidebar-section-${secao.id}`}
              >
                <span className="sidebar-section-toggle-label">{secao.label}</span>
                <ChevronDown size={18} className="sidebar-section-chevron" aria-hidden />
              </button>

              <div
                id={`sidebar-section-${secao.id}`}
                className="sidebar-section-items"
                hidden={!aberta}
              >
                {secao.items.map(({ id, label, icon: Icon, emBreve }) => (
                  <button
                    key={id}
                    type="button"
                    className={`nav-item nav-item-nested ${paginaAtual === id ? 'active' : ''}`}
                    onClick={() => onNavigate(id)}
                  >
                    <span className="nav-item-icon">
                      <Icon size={18} />
                    </span>
                    <span className="nav-item-label">{label}</span>
                    {emBreve && <span className="nav-item-badge">Em breve</span>}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </nav>
      <div className="sidebar-footer">
        <ThemeToggle />
      </div>
    </aside>
  )
}
