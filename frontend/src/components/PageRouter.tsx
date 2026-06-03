import { Dashboard } from './Dashboard'
import { VendasList } from './VendasList'
import { VendaForm } from './VendaForm'
import { ImportExcel } from './ImportExcel'
import { ContasPagarPage } from './ContasPagarPage'
import { ContasPagarRecorrentesPage } from './ContasPagarRecorrentesPage'
import { DdaEmAbertoPage } from './DdaEmAbertoPage'
import { NovaContaPagarPage } from './NovaContaPagarPage'
import { HistoricoPagamentosPage } from './HistoricoPagamentosPage'
import { ConfrontarDadosPage } from './ConfrontarDadosPage'
import { CaixaPage } from './CaixaPage'
import { ContasReceberPage } from './ContasReceberPage'
import { ContasRecorrentesPage } from './ContasRecorrentesPage'
import { NovaContaReceberPage } from './NovaContaReceberPage'
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
      return <ContasPagarPage key={refreshKey} onRefresh={onRefresh} />
    case 'contas-pagar-recorrentes':
      return <ContasPagarRecorrentesPage key={refreshKey} onRefresh={onRefresh} />
    case 'dda-em-aberto':
      return <DdaEmAbertoPage key={refreshKey} onRefresh={onRefresh} />
    case 'nova-conta-pagar':
      return <NovaContaPagarPage key={refreshKey} onRefresh={onRefresh} />
    case 'historico-pagamentos':
      return <HistoricoPagamentosPage key={refreshKey} onRefresh={onRefresh} />
    case 'contas-a-receber':
      return <ContasReceberPage key={refreshKey} onRefresh={onRefresh} />
    case 'contas-recorrentes':
      return <ContasRecorrentesPage key={refreshKey} onRefresh={onRefresh} />
    case 'nova-conta-receber':
      return <NovaContaReceberPage key={refreshKey} onRefresh={onRefresh} />
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
