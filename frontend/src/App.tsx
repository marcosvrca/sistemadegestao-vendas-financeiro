import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { AppHeader } from './components/AppHeader'
import { PageRouter } from './components/PageRouter'
import type { Pagina } from './navigation'

export default function App() {
  const [pagina, setPagina] = useState<Pagina>('dashboard')
  const [refreshKey, setRefreshKey] = useState(0)
  const [menuAberto, setMenuAberto] = useState(false)

  function handleAtualizar() {
    setRefreshKey((k) => k + 1)
  }

  function navegar(p: Pagina) {
    setPagina(p)
    setMenuAberto(false)
  }

  useEffect(() => {
    if (!menuAberto) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuAberto(false)
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [menuAberto])

  return (
    <div className="app-layout">
      {menuAberto && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}
      <Sidebar
        paginaAtual={pagina}
        onNavigate={navegar}
        aberto={menuAberto}
        onFechar={() => setMenuAberto(false)}
      />
      <div className="app-main">
        <AppHeader paginaAtual={pagina} onMenuClick={() => setMenuAberto(true)} />
        <main className="main-content">
          <PageRouter
            pagina={pagina}
            refreshKey={refreshKey}
            onRefresh={handleAtualizar}
            onNavigate={navegar}
          />
        </main>
      </div>
    </div>
  )
}
