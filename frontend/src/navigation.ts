import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  GitCompare,
  Bell,
  ShoppingCart,
  PlusCircle,
  FileSpreadsheet,
  Package,
  Boxes,
  ArrowDownUp,
  FileCode2,
  Settings,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  TrendingUp,
  Users,
  Truck,
  Tags,
  BarChart3,
  Repeat,
  Plus,
  History,
  CalendarDays,
  Lock,
  Calculator,
  Percent,
  Calendar,
  StickyNote,
  Wrench,
  Receipt,
  Banknote,
  Gift,
  BadgePercent,
  ClipboardList,
} from 'lucide-react'

export type Pagina =
  | 'dashboard'
  | 'alertas'
  | 'confrontar'
  | 'vendas'
  | 'nova-venda'
  | 'importar-vendas'
  | 'pedidos'
  | 'novo-pedido'
  | 'produtos'
  | 'estoque-resumo'
  | 'estoque-movimentacoes'
  | 'estoque-importar-xml'
  | 'estoque-configuracoes'
  | 'caixa-visao-geral'
  | 'fluxo-caixa'
  | 'caixa-controle-diario'
  | 'saidas-diarias'
  | 'caixa-abertura-fechamento'
  | 'caixa-relatorios'
  | 'contas-a-pagar'
  | 'contas-pagar-recorrentes'
  | 'nova-conta-pagar'
  | 'historico-pagamentos'
  | 'contas-a-receber'
  | 'contas-recorrentes'
  | 'nova-conta-receber'
  | 'cadastro-clientes'
  | 'cadastro-fornecedores'
  | 'cadastro-categorias'
  | 'relatorios'
  | 'recursos'
  | 'recursos-calculadora'
  | 'recursos-porcentagem'
  | 'recursos-calendario'
  | 'recursos-agenda'
  | 'recursos-notas'
  | 'recursos-cedulas'
  | 'recursos-configuracoes'
  | 'recursos-atalhos-teclado'
  | 'recursos-aparencia'
  | 'recursos-alterar-dashboard'
  | 'recursos-sorteador'
  | 'recursos-promocoes'

export interface NavSubItem {
  id: Pagina
  label: string
  icon: LucideIcon
}

export interface NavItem {
  id?: Pagina
  groupId?: string
  label: string
  icon: LucideIcon
  emBreve?: boolean
  children?: NavSubItem[]
}

export interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

export const NAV_SECOES: NavSection[] = [
  {
    id: 'inicio',
    label: 'Início',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'alertas', label: 'Alertas', icon: Bell },
      { id: 'confrontar', label: 'Confrontar Dados', icon: GitCompare },
    ],
  },
  {
    id: 'vendas',
    label: 'Vendas',
    items: [
      { id: 'vendas', label: 'Lista de Vendas', icon: ShoppingCart },
      { id: 'nova-venda', label: 'Nova Venda', icon: PlusCircle },
      { id: 'importar-vendas', label: 'Importar Planilha', icon: FileSpreadsheet },
    ],
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    items: [
      { id: 'pedidos', label: 'Visão Geral', icon: ClipboardList },
      { id: 'novo-pedido', label: 'Novo Pedido', icon: PlusCircle },
    ],
  },
  {
    id: 'produtos',
    label: 'Produtos',
    items: [
      { id: 'produtos', label: 'Catálogo de Produtos', icon: Package },
    ],
  },
  {
    id: 'estoque',
    label: 'Estoque',
    items: [
      { id: 'estoque-resumo', label: 'Visão Geral', icon: Boxes },
      { id: 'estoque-movimentacoes', label: 'Movimentações', icon: ArrowDownUp },
      { id: 'estoque-importar-xml', label: 'Importar XML (NF-e)', icon: FileCode2 },
      { id: 'estoque-configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
  {
    id: 'financeiro',
    label: 'Financeiro',
    items: [
      {
        groupId: 'grupo-caixa',
        label: 'Caixa',
        icon: Wallet,
        children: [
          { id: 'caixa-visao-geral', label: 'Visão Geral', icon: Boxes },
          { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp },
          { id: 'caixa-controle-diario', label: 'Controle Diário', icon: CalendarDays },
          { id: 'saidas-diarias', label: 'Saídas Diárias', icon: Receipt },
          { id: 'caixa-abertura-fechamento', label: 'Abertura e Fechamento', icon: Lock },
          { id: 'caixa-relatorios', label: 'Relatórios', icon: BarChart3 },
        ],
      },
      {
        groupId: 'contas-a-pagar',
        label: 'Contas a Pagar',
        icon: ArrowDownCircle,
        children: [
          { id: 'contas-a-pagar', label: 'Visão Geral', icon: Boxes },
          { id: 'contas-pagar-recorrentes', label: 'Contas Recorrentes', icon: Repeat },
          { id: 'nova-conta-pagar', label: 'Nova Conta a Pagar', icon: Plus },
          { id: 'historico-pagamentos', label: 'Histórico de Pagamentos', icon: History },
        ],
      },
      {
        groupId: 'contas-a-receber',
        label: 'Contas a Receber',
        icon: ArrowUpCircle,
        children: [
          { id: 'contas-a-receber', label: 'Visão Geral', icon: Boxes },
          { id: 'contas-recorrentes', label: 'Contas Recorrentes', icon: Repeat },
          { id: 'nova-conta-receber', label: 'Nova Conta a Receber', icon: Plus },
        ],
      },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    items: [
      { id: 'cadastro-clientes', label: 'Clientes', icon: Users },
      { id: 'cadastro-fornecedores', label: 'Fornecedores', icon: Truck },
      { id: 'cadastro-categorias', label: 'Categorias', icon: Tags },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    items: [
      { id: 'relatorios', label: 'Relatórios Gerais', icon: BarChart3, emBreve: true },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos',
    items: [
      { id: 'recursos', label: 'Visão Geral', icon: Wrench },
      { id: 'recursos-calculadora', label: 'Calculadora', icon: Calculator },
      { id: 'recursos-porcentagem', label: 'Calculadora de %', icon: Percent },
      { id: 'recursos-calendario', label: 'Calendário', icon: Calendar },
      { id: 'recursos-agenda', label: 'Agenda', icon: CalendarDays },
      { id: 'recursos-notas', label: 'Anotações', icon: StickyNote },
      { id: 'recursos-cedulas', label: 'Registrar Cédulas', icon: Banknote },
      { id: 'recursos-sorteador', label: 'Sorteador', icon: Gift },
      { id: 'recursos-promocoes', label: 'Promoções', icon: BadgePercent },
      { id: 'recursos-configuracoes', label: 'Configurações', icon: Settings },
    ],
  },
]

export const PAGINA_TITULOS: Record<Pagina, string> = {
  dashboard: 'Dashboard',
  alertas: 'Alertas',
  confrontar: 'Confrontar Dados',
  vendas: 'Vendas',
  'nova-venda': 'Nova Venda',
  'importar-vendas': 'Importar Vendas',
  pedidos: 'Pedidos — Visão Geral',
  'novo-pedido': 'Novo Pedido',
  produtos: 'Catálogo de Produtos',
  'estoque-resumo': 'Visão do Estoque',
  'estoque-movimentacoes': 'Movimentações de Estoque',
  'estoque-importar-xml': 'Importar XML da NF-e',
  'estoque-configuracoes': 'Configurações de Estoque',
  'caixa-visao-geral': 'Caixa — Visão Geral',
  'fluxo-caixa': 'Fluxo de Caixa',
  'caixa-controle-diario': 'Controle Diário do Caixa',
  'saidas-diarias': 'Saídas Diárias',
  'caixa-abertura-fechamento': 'Abertura e Fechamento de Caixa',
  'caixa-relatorios': 'Relatórios de Caixa',
  'contas-a-pagar': 'Contas a Pagar — Visão Geral',
  'contas-pagar-recorrentes': 'Contas a Pagar Recorrentes',
  'nova-conta-pagar': 'Nova Conta a Pagar',
  'historico-pagamentos': 'Histórico de Pagamentos',
  'contas-a-receber': 'Contas a Receber — Visão Geral',
  'contas-recorrentes': 'Contas Recorrentes',
  'nova-conta-receber': 'Nova Conta a Receber',
  'cadastro-clientes': 'Clientes',
  'cadastro-fornecedores': 'Fornecedores',
  'cadastro-categorias': 'Categorias',
  relatorios: 'Relatórios',
  recursos: 'Recursos',
  'recursos-calculadora': 'Calculadora',
  'recursos-porcentagem': 'Calculadora de Porcentagem',
  'recursos-calendario': 'Calendário',
  'recursos-agenda': 'Agenda',
  'recursos-notas': 'Anotações',
  'recursos-cedulas': 'Registrar Cédulas',
  'recursos-configuracoes': 'Configurações',
  'recursos-atalhos-teclado': 'Atalhos do teclado',
  'recursos-aparencia': 'Aparência do sistema',
  'recursos-alterar-dashboard': 'Alterar Dashboard',
  'recursos-sorteador': 'Sorteador',
  'recursos-promocoes': 'Promoções',
}

export const PAGINA_SUBTITULOS: Partial<Record<Pagina, string>> = {
  dashboard: 'Resumo de vendas, saídas e indicadores',
  alertas: 'Anotações, agenda e calendário marcados como alerta',
  confrontar: 'Compare dois períodos lado a lado',
  vendas: 'Histórico e gestão de vendas',
  'nova-venda': 'Registre uma nova venda',
  'importar-vendas': 'Importe vendas a partir de planilha Excel',
  pedidos: 'Acompanhe pedidos pendentes, em andamento e finalizados',
  'novo-pedido': 'Registre um novo pedido com tipo, valor e data prevista',
  produtos: 'Cadastro, preços e níveis de estoque',
  'estoque-resumo': 'Indicadores e alertas de estoque',
  'estoque-movimentacoes': 'Entradas, saídas e histórico',
  'estoque-importar-xml': 'Entrada automática via nota fiscal',
  'estoque-configuracoes': 'Regras de operação e bloqueios do estoque',
  'caixa-visao-geral': 'Resumo dos caixas abertos, fechados e indicadores do período',
  'fluxo-caixa': 'Entradas e saídas por período com saldo acumulado',
  'caixa-controle-diario': 'Movimentação e conferência do dia selecionado',
  'saidas-diarias': 'Registre despesas pagas no dia (compras, contas, retiradas)',
  'caixa-abertura-fechamento': 'Registrar abertura, fechamento e diferença do caixa físico',
  'caixa-relatorios': 'Histórico de aberturas, fechamentos e diferenças',
  'contas-a-pagar': 'Todas as obrigações pendentes: avulsas e recorrentes',
  'contas-pagar-recorrentes': 'Aluguel, fornecedores fixos e despesas periódicas',
  'nova-conta-pagar': 'Registre uma conta avulsa a pagar',
  'historico-pagamentos': 'Contas já quitadas e saídas registradas',
  'contas-a-receber': 'Todas as cobranças pendentes: vendas AV, avulsas e recorrentes',
  'contas-recorrentes': 'Clientes mensais e cobranças periódicas',
  'nova-conta-receber': 'Registre uma cobrança avulsa (não recorrente)',
  'cadastro-clientes': 'Cadastro de clientes',
  'cadastro-fornecedores': 'Cadastro de fornecedores',
  'cadastro-categorias': 'Categorias de produtos e despesas',
  relatorios: 'Análises e exportações',
  recursos: 'Ferramentas e utilidades do dia a dia',
  'recursos-calculadora': 'Calculadora básica para operações do dia a dia',
  'recursos-porcentagem': 'Calcule percentuais, descontos e variações',
  'recursos-calendario': 'Visualize o calendário mensal e eventos marcados',
  'recursos-agenda': 'Organize compromissos e lembretes',
  'recursos-notas': 'Bloco de notas para anotações rápidas',
  'recursos-cedulas': 'Contagem de cédulas e moedas com total automático',
  'recursos-configuracoes': 'Preferências e ajustes dos Recursos',
  'recursos-atalhos-teclado': 'Atalhos personalizados para abrir telas do sistema',
  'recursos-aparencia': 'Cores de destaque, logo e nome exibidos no sistema',
  'recursos-alterar-dashboard': 'Exibir ou ocultar blocos já existentes no Dashboard',
  'recursos-sorteador': 'Sorteios para clientes — cadastro de participantes e sorteio',
  'recursos-promocoes': 'Campanhas de desconto, brindes e descontos progressivos',
}

export interface EmBreveConfig {
  titulo: string
  descricao: string
  recursosPrevistos: string[]
  paginasRelacionadas?: { pagina: Pagina; label: string }[]
}

export const EM_BREVE_CONFIG: Partial<Record<Pagina, EmBreveConfig>> = {
  relatorios: {
    titulo: 'Relatórios Gerais',
    descricao: 'Relatórios gerenciais de vendas, estoque e financeiro.',
    recursosPrevistos: [
      'Vendas por período e produto',
      'Posição de estoque',
      'DRE simplificado',
      'Exportação PDF e Excel',
    ],
    paginasRelacionadas: [
      { pagina: 'dashboard', label: 'Dashboard' },
      { pagina: 'confrontar', label: 'Confrontar dados' },
    ],
  },
}

export type EstoqueSecao = 'produtos' | 'movimentacoes' | 'importar-xml'

export function paginaParaSecaoEstoque(pagina: Pagina): EstoqueSecao | null {
  if (pagina === 'produtos') return 'produtos'
  if (pagina === 'estoque-movimentacoes') return 'movimentacoes'
  if (pagina === 'estoque-importar-xml') return 'importar-xml'
  return null
}

export function isPaginaEmBreve(pagina: Pagina): boolean {
  return Boolean(EM_BREVE_CONFIG[pagina])
}

export function itemContemPagina(item: NavItem, pagina: Pagina): boolean {
  if (item.id === pagina) return true
  return item.children?.some((sub) => sub.id === pagina) ?? false
}

export function secaoIdDaPagina(pagina: Pagina): string {
  const secao = NAV_SECOES.find((s) => s.items.some((i) => itemContemPagina(i, pagina)))
  return secao?.id ?? NAV_SECOES[0].id
}

export function grupoIdDaPagina(pagina: Pagina): string | null {
  for (const secao of NAV_SECOES) {
    for (const item of secao.items) {
      if (item.groupId && item.children?.some((sub) => sub.id === pagina)) {
        return item.groupId
      }
    }
  }
  return null
}
