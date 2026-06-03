import { useEffect, useState } from 'react'
import { ChevronDown, Cross, X } from 'lucide-react'
import type { NavItem, Pagina } from '../navigation'
import { NAV_SECOES, grupoIdDaPagina, itemContemPagina, secaoIdDaPagina } from '../navigation'
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

function criarGruposExpandidosIniciais(pagina: Pagina): Set<string> {
  const grupos = new Set<string>()
  const grupo = grupoIdDaPagina(pagina)
  if (grupo) grupos.add(grupo)
  return grupos
}

function grupoTemPaginaAtiva(item: NavItem, pagina: Pagina): boolean {
  return item.children?.some((sub) => sub.id === pagina) ?? false
}

export function Sidebar({ paginaAtual, onNavigate, aberto, onFechar }: SidebarProps) {
  const [expandidas, setExpandidas] = useState<Set<string>>(() =>
    criarExpandidasIniciais(paginaAtual),
  )
  const [gruposExpandidos, setGruposExpandidos] = useState<Set<string>>(() =>
    criarGruposExpandidosIniciais(paginaAtual),
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

  useEffect(() => {
    const grupo = grupoIdDaPagina(paginaAtual)
    if (!grupo) return
    setGruposExpandidos((prev) => {
      if (prev.has(grupo)) return prev
      const next = new Set(prev)
      next.add(grupo)
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

  function toggleGrupo(groupId: string) {
    setGruposExpandidos((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  function secaoTemPaginaAtiva(secaoId: string) {
    const secao = NAV_SECOES.find((s) => s.id === secaoId)
    return secao?.items.some((i) => itemContemPagina(i, paginaAtual)) ?? false
  }

  function renderNavItem(item: NavItem) {
    if (item.children && item.groupId) {
      const grupoAberto = gruposExpandidos.has(item.groupId)
      const grupoAtivo = grupoTemPaginaAtiva(item, paginaAtual)
      const Icon = item.icon

      return (
        <div
          key={item.groupId}
          className={`nav-item-group ${grupoAberto ? 'expanded' : ''} ${grupoAtivo ? 'has-active' : ''}`}
        >
          <button
            type="button"
            className="nav-item-group-toggle nav-item nav-item-nested"
            onClick={() => toggleGrupo(item.groupId!)}
            aria-expanded={grupoAberto}
          >
            <span className="nav-item-icon">
              <Icon size={18} />
            </span>
            <span className="nav-item-label">{item.label}</span>
            <ChevronDown size={16} className="nav-item-group-chevron" aria-hidden />
          </button>
          <div className="nav-item-subitems" hidden={!grupoAberto}>
            {item.children.map(({ id, label, icon: SubIcon }) => (
              <button
                key={id}
                type="button"
                className={`nav-item nav-item-sub ${paginaAtual === id ? 'active' : ''}`}
                onClick={() => onNavigate(id)}
              >
                <span className="nav-item-icon">
                  <SubIcon size={16} />
                </span>
                <span className="nav-item-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )
    }

    if (!item.id) return null

    const Icon = item.icon
    return (
      <button
        key={item.id}
        type="button"
        className={`nav-item nav-item-nested ${paginaAtual === item.id ? 'active' : ''}`}
        onClick={() => onNavigate(item.id!)}
      >
        <span className="nav-item-icon">
          <Icon size={18} />
        </span>
        <span className="nav-item-label">{item.label}</span>
        {item.emBreve && <span className="nav-item-badge">Em breve</span>}
      </button>
    )
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
                {secao.items.map((item) => renderNavItem(item))}
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
