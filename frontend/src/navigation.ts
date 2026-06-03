import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard,
  GitCompare,
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
  Landmark,
  History,
} from 'lucide-react'

export type Pagina =
  | 'dashboard'
  | 'confrontar'
  | 'vendas'
  | 'nova-venda'
  | 'importar-vendas'
  | 'produtos'
  | 'estoque-resumo'
  | 'estoque-movimentacoes'
  | 'estoque-importar-xml'
  | 'estoque-configuracoes'
  | 'caixa'
  | 'contas-a-pagar'
  | 'contas-pagar-recorrentes'
  | 'dda-em-aberto'
  | 'nova-conta-pagar'
  | 'historico-pagamentos'
  | 'contas-a-receber'
  | 'contas-recorrentes'
  | 'nova-conta-receber'
  | 'fluxo-caixa'
  | 'cadastro-clientes'
  | 'cadastro-fornecedores'
  | 'cadastro-categorias'
  | 'relatorios'

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
      { id: 'caixa', label: 'Caixa', icon: Wallet },
      {
        groupId: 'contas-a-pagar',
        label: 'Contas a Pagar',
        icon: ArrowDownCircle,
        children: [
          { id: 'contas-a-pagar', label: 'Visão Geral', icon: Boxes },
          { id: 'contas-pagar-recorrentes', label: 'Contas Recorrentes', icon: Repeat },
          { id: 'dda-em-aberto', label: 'DDA em Aberto', icon: Landmark },
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
      { id: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, emBreve: true },
    ],
  },
  {
    id: 'cadastros',
    label: 'Cadastros',
    items: [
      { id: 'cadastro-clientes', label: 'Clientes', icon: Users, emBreve: true },
      { id: 'cadastro-fornecedores', label: 'Fornecedores', icon: Truck, emBreve: true },
      { id: 'cadastro-categorias', label: 'Categorias', icon: Tags, emBreve: true },
    ],
  },
  {
    id: 'relatorios',
    label: 'Relatórios',
    items: [
      { id: 'relatorios', label: 'Relatórios Gerais', icon: BarChart3, emBreve: true },
    ],
  },
]

export const PAGINA_TITULOS: Record<Pagina, string> = {
  dashboard: 'Dashboard',
  confrontar: 'Confrontar Dados',
  vendas: 'Vendas',
  'nova-venda': 'Nova Venda',
  'importar-vendas': 'Importar Vendas',
  produtos: 'Catálogo de Produtos',
  'estoque-resumo': 'Visão do Estoque',
  'estoque-movimentacoes': 'Movimentações de Estoque',
  'estoque-importar-xml': 'Importar XML da NF-e',
  'estoque-configuracoes': 'Configurações de Estoque',
  caixa: 'Caixa',
  'contas-a-pagar': 'Contas a Pagar — Visão Geral',
  'contas-pagar-recorrentes': 'Contas a Pagar Recorrentes',
  'dda-em-aberto': 'DDA em Aberto',
  'nova-conta-pagar': 'Nova Conta a Pagar',
  'historico-pagamentos': 'Histórico de Pagamentos',
  'contas-a-receber': 'Contas a Receber — Visão Geral',
  'contas-recorrentes': 'Contas Recorrentes',
  'nova-conta-receber': 'Nova Conta a Receber',
  'fluxo-caixa': 'Fluxo de Caixa',
  'cadastro-clientes': 'Clientes',
  'cadastro-fornecedores': 'Fornecedores',
  'cadastro-categorias': 'Categorias',
  relatorios: 'Relatórios',
}

export const PAGINA_SUBTITULOS: Partial<Record<Pagina, string>> = {
  dashboard: 'Resumo de vendas, saídas e indicadores',
  confrontar: 'Compare dois períodos lado a lado',
  vendas: 'Histórico e gestão de vendas',
  'nova-venda': 'Registre uma nova venda',
  'importar-vendas': 'Importe vendas a partir de planilha Excel',
  produtos: 'Cadastro, preços e níveis de estoque',
  'estoque-resumo': 'Indicadores e alertas de estoque',
  'estoque-movimentacoes': 'Entradas, saídas e histórico',
  'estoque-importar-xml': 'Entrada automática via nota fiscal',
  'estoque-configuracoes': 'Regras de operação e bloqueios do estoque',
  caixa: 'Abertura, fechamento e conferência do dia',
  'contas-a-pagar': 'Todas as obrigações pendentes: avulsas, recorrentes e DDA',
  'contas-pagar-recorrentes': 'Aluguel, fornecedores fixos e despesas periódicas',
  'dda-em-aberto': 'Débitos automáticos agendados aguardando compensação',
  'nova-conta-pagar': 'Registre uma conta avulsa a pagar',
  'historico-pagamentos': 'Contas já quitadas e saídas registradas',
  'contas-a-receber': 'Todas as cobranças pendentes: vendas AV, avulsas e recorrentes',
  'contas-recorrentes': 'Clientes mensais e cobranças periódicas',
  'nova-conta-receber': 'Registre uma cobrança avulsa (não recorrente)',
  'fluxo-caixa': 'Entradas e saídas consolidadas',
  'cadastro-clientes': 'Cadastro de clientes',
  'cadastro-fornecedores': 'Cadastro de fornecedores',
  'cadastro-categorias': 'Categorias de produtos e despesas',
  relatorios: 'Análises e exportações',
}

export interface EmBreveConfig {
  titulo: string
  descricao: string
  recursosPrevistos: string[]
  paginasRelacionadas?: { pagina: Pagina; label: string }[]
}

export const EM_BREVE_CONFIG: Partial<Record<Pagina, EmBreveConfig>> = {
  'fluxo-caixa': {
    titulo: 'Fluxo de Caixa',
    descricao: 'Visão consolidada de entradas e saídas por período, com projeção e saldo acumulado.',
    recursosPrevistos: [
      'Gráfico de entradas × saídas',
      'Saldo projetado',
      'Filtro por forma de pagamento',
      'Exportação para Excel',
    ],
    paginasRelacionadas: [
      { pagina: 'caixa', label: 'Caixa diário' },
      { pagina: 'contas-a-pagar', label: 'Contas a pagar' },
    ],
  },
  'cadastro-clientes': {
    titulo: 'Clientes',
    descricao: 'Cadastro centralizado de clientes para vendas, histórico e contas a receber.',
    recursosPrevistos: [
      'Nome, contato e observações',
      'Histórico de compras',
      'Vínculo com vendas AV',
    ],
    paginasRelacionadas: [{ pagina: 'vendas', label: 'Vendas' }],
  },
  'cadastro-fornecedores': {
    titulo: 'Fornecedores',
    descricao: 'Cadastro de fornecedores para compras, NF-e e contas a pagar.',
    recursosPrevistos: [
      'Dados do fornecedor e CNPJ',
      'Histórico de notas importadas',
      'Vínculo com contas a pagar',
    ],
    paginasRelacionadas: [
      { pagina: 'estoque-importar-xml', label: 'Importar XML' },
      { pagina: 'contas-a-pagar', label: 'Contas a pagar' },
    ],
  },
  'cadastro-categorias': {
    titulo: 'Categorias',
    descricao: 'Gestão unificada de categorias de produtos e de despesas.',
    recursosPrevistos: [
      'Categorias de produtos',
      'Categorias de saídas/despesas',
      'Ativar e desativar categorias',
    ],
    paginasRelacionadas: [
      { pagina: 'produtos', label: 'Produtos' },
      { pagina: 'contas-a-pagar', label: 'Contas a pagar' },
    ],
  },
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
