import { Dashboard } from './Dashboard'
import { VendasList } from './VendasList'
import { VendaForm } from './VendaForm'
import { ImportExcel } from './ImportExcel'
import { ContasPagarPage } from './ContasPagarPage'
import { ContasPagarRecorrentesPage } from './ContasPagarRecorrentesPage'
import { NovaContaPagarPage } from './NovaContaPagarPage'
import { HistoricoPagamentosPage } from './HistoricoPagamentosPage'
import { ConfrontarDadosPage } from './ConfrontarDadosPage'
import { CaixaPage } from './CaixaPage'
import { CaixaVisaoGeralPage } from './CaixaVisaoGeralPage'
import { CaixaControleDiarioPage } from './CaixaControleDiarioPage'
import { FluxoCaixaPage } from './FluxoCaixaPage'
import { CaixaRelatoriosPage } from './CaixaRelatoriosPage'
import { ContasReceberPage } from './ContasReceberPage'
import { ContasRecorrentesPage } from './ContasRecorrentesPage'
import { NovaContaReceberPage } from './NovaContaReceberPage'
import { EstoquePage } from './EstoquePage'
import { EstoqueResumoPage } from './EstoqueResumoPage'
import { EstoqueConfigPage } from './EstoqueConfigPage'
import { FornecedoresPage } from './FornecedoresPage'
import { ClientesPage } from './ClientesPage'
import { CategoriasPage } from './CategoriasPage'
import { SaidasPage } from './SaidasPage'
import { EmBrevePage } from './EmBrevePage'
import { RecursosResumoPage } from './recursos/RecursosResumoPage'
import { CalculadoraPage } from './recursos/CalculadoraPage'
import { CalculadoraPorcentagemPage } from './recursos/CalculadoraPorcentagemPage'
import { CalendarioPage } from './recursos/CalendarioPage'
import { AgendaPage } from './recursos/AgendaPage'
import { NotasPage } from './recursos/NotasPage'
import { CedulasPage } from './recursos/CedulasPage'
import { RecursosConfigPage } from './recursos/RecursosConfigPage'
import { AtalhosTecladoPage } from './recursos/AtalhosTecladoPage'
import { RecursosAparenciaPage } from './recursos/RecursosAparenciaPage'
import { AlterarDashboardPage } from './recursos/AlterarDashboardPage'
import { SorteadorPage } from './recursos/SorteadorPage'
import { PromocoesPage } from './recursos/PromocoesPage'
import { AlertasPage } from './AlertasPage'
import { PedidosPage } from './PedidosPage'
import { NovoPedidoPage } from './NovoPedidoPage'
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
    case 'alertas':
      return <AlertasPage onNavigate={onNavigate} />
    case 'confrontar':
      return <ConfrontarDadosPage key={refreshKey} />
    case 'vendas':
      return <VendasList key={refreshKey} onRefresh={onRefresh} />
    case 'nova-venda':
      return <VendaForm onSuccess={onRefresh} />
    case 'importar-vendas':
      return <ImportExcel onSuccess={onRefresh} />
    case 'pedidos':
      return (
        <PedidosPage
          key={refreshKey}
          onRefresh={onRefresh}
          onNavigate={onNavigate}
        />
      )
    case 'novo-pedido':
      return <NovoPedidoPage key={refreshKey} onRefresh={onRefresh} />
    case 'estoque-resumo':
      return <EstoqueResumoPage onNavigate={onNavigate} />
    case 'estoque-configuracoes':
      return <EstoqueConfigPage />
    case 'caixa-visao-geral':
      return <CaixaVisaoGeralPage onNavigate={onNavigate} />
    case 'fluxo-caixa':
      return <FluxoCaixaPage key={refreshKey} />
    case 'caixa-controle-diario':
      return <CaixaControleDiarioPage onNavigate={onNavigate} />
    case 'saidas-diarias':
      return <SaidasPage key={refreshKey} onRefresh={onRefresh} variant="saidas" />
    case 'caixa-abertura-fechamento':
      return <CaixaPage onRefresh={onRefresh} />
    case 'caixa-relatorios':
      return (
        <CaixaRelatoriosPage
          key={refreshKey}
          onRefresh={onRefresh}
          onNavigate={onNavigate}
        />
      )
    case 'contas-a-pagar':
      return <ContasPagarPage key={refreshKey} onRefresh={onRefresh} />
    case 'contas-pagar-recorrentes':
      return <ContasPagarRecorrentesPage key={refreshKey} onRefresh={onRefresh} />
    case 'nova-conta-pagar':
      return <NovaContaPagarPage key={refreshKey} onRefresh={onRefresh} />
    case 'historico-pagamentos':
      return <HistoricoPagamentosPage key={refreshKey} onRefresh={onRefresh} />
    case 'cadastro-fornecedores':
      return <FornecedoresPage key={refreshKey} />
    case 'cadastro-clientes':
      return <ClientesPage key={refreshKey} />
    case 'cadastro-categorias':
      return <CategoriasPage key={refreshKey} />
    case 'contas-a-receber':
      return <ContasReceberPage key={refreshKey} onRefresh={onRefresh} />
    case 'contas-recorrentes':
      return <ContasRecorrentesPage key={refreshKey} onRefresh={onRefresh} />
    case 'nova-conta-receber':
      return <NovaContaReceberPage key={refreshKey} onRefresh={onRefresh} />
    case 'recursos':
      return <RecursosResumoPage onNavigate={onNavigate} />
    case 'recursos-calculadora':
      return <CalculadoraPage />
    case 'recursos-porcentagem':
      return <CalculadoraPorcentagemPage />
    case 'recursos-calendario':
      return <CalendarioPage />
    case 'recursos-agenda':
      return <AgendaPage />
    case 'recursos-notas':
      return <NotasPage />
    case 'recursos-cedulas':
      return <CedulasPage />
    case 'recursos-sorteador':
      return <SorteadorPage />
    case 'recursos-promocoes':
      return <PromocoesPage />
    case 'recursos-configuracoes':
      return <RecursosConfigPage onNavigate={onNavigate} />
    case 'recursos-atalhos-teclado':
      return <AtalhosTecladoPage onNavigate={onNavigate} />
    case 'recursos-aparencia':
      return <RecursosAparenciaPage onNavigate={onNavigate} />
    case 'recursos-alterar-dashboard':
      return <AlterarDashboardPage onNavigate={onNavigate} />
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
