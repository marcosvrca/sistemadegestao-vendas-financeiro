import { Dashboard } from './Dashboard'
import { VendasList } from './VendasList'
import { VendaForm } from './VendaForm'
import { ImportExcel } from './ImportExcel'
import { SaidasPage } from './SaidasPage'
import { ConfrontarDadosPage } from './ConfrontarDadosPage'
import { CaixaPage } from './CaixaPage'
import { EstoquePage } from './EstoquePage'
import { EstoqueResumoPage } from './EstoqueResumoPage'
import { EstoqueConfigPage } from './EstoqueConfigPage'
import { EmBrevePage } from './EmBrevePage'
import type { Pagina } from '../navigation'
import { isPaginaEmBreve, paginaParaSecaoEstoque } from '../navigation'

interface PageRouterProps {
  pagina: Pagina
  refreshKey: number
  onRefresh: () => void
  onNavigate: (pagina: Pagina) => void
}

export function PageRouter({ pagina, refreshKey, onRefresh, onNavigate }: PageRouterProps) {
  const secaoEstoque = paginaParaSecaoEstoque(pagina)

  if (isPaginaEmBreve(pagina)) {
    return <EmBrevePage pagina={pagina} onNavigate={onNavigate} />
  }

  switch (pagina) {
    case 'dashboard':
      return <Dashboard key={refreshKey} />
    case 'confrontar':
      return <ConfrontarDadosPage key={refreshKey} />
    case 'vendas':
      return <VendasList key={refreshKey} onRefresh={onRefresh} />
    case 'nova-venda':
      return <VendaForm onSuccess={onRefresh} />
    case 'importar-vendas':
      return <ImportExcel onSuccess={onRefresh} />
    case 'estoque-resumo':
      return <EstoqueResumoPage onNavigate={onNavigate} />
    case 'estoque-configuracoes':
      return <EstoqueConfigPage />
    case 'caixa':
      return <CaixaPage onRefresh={onRefresh} />
    case 'contas-a-pagar':
      return <SaidasPage onRefresh={onRefresh} variant="contas-a-pagar" />
    default:
      if (secaoEstoque) {
        return (
          <EstoquePage
            key={`${pagina}-${refreshKey}`}
            secao={secaoEstoque}
            onRefresh={onRefresh}
          />
        )
      }
      return <EmBrevePage pagina={pagina} onNavigate={onNavigate} />
  }
}
