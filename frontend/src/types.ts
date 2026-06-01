export interface ItemVenda {
  id?: number
  produto: string
  quantidade: number
  valor_unitario: number
  desconto: number
  valor?: number
}

export interface Venda {
  id: number
  data: string
  produto: string
  cliente: string
  quantidade: number
  valor_unitario: number
  desconto: number
  valor: number
  forma_pagamento: string
  troco?: number | null
  valor_recebido?: number | null
  parcelas?: number | null
  observacao?: string | null
  itens?: ItemVenda[]
}

export interface VendaCreate {
  data?: string
  cliente: string
  forma_pagamento: string
  troco?: number
  valor_recebido?: number
  parcelas?: number
  observacao?: string
  itens: ItemVenda[]
  produto?: string
  quantidade?: number
  valor_unitario?: number
  desconto?: number
}

export interface MediaVenda {
  media: number
  total: number
  quantidade: number
  descricao_periodo: string
}

export interface DashboardKPIs {
  total_vendas: number
  quantidade_vendas: number
  ticket_medio: number
  total_descontos: number
  total_itens: number
  total_saidas: number
  quantidade_saidas: number
  saldo: number
  descricao_periodo: string
  melhor_dia?: string | null
  melhor_dia_total?: number
  melhor_dia_quantidade?: number
  vendas_hoje?: number
  vendas_mes?: number
  crescimento_mes?: number
  saidas_hoje?: number
  saidas_mes?: number
  saldo_mes?: number
}

export interface VendasAVPendentes {
  quantidade: number
  total: number
  vendas: VendaAVResumo[]
}

export interface VendaAVResumo {
  id: number
  data: string
  cliente: string
  produto: string
  valor: number
}

export interface VendaPorPeriodo {
  periodo: string
  total: number
  quantidade: number
}

export interface VendaPorFormaPagamento {
  forma_pagamento: string
  total: number
  quantidade: number
}

export interface TopItem {
  nome: string
  total: number
  quantidade: number
}

export interface VendaMesAtual {
  dia: number
  total: number
}

export type { Pagina } from './navigation'

export interface Produto {
  id: number
  nome: string
  nome_normalizado: string
  categoria: string
  preco_venda: number
  estoque_atual: number
  estoque_minimo: number
  unidade: string
  ativo: boolean
  observacao?: string | null
  criado_em: string
  atualizado_em: string
  status_estoque: 'ok' | 'baixo' | 'zerado'
}

export interface ProdutoCreate {
  nome: string
  categoria: string
  preco_venda: number
  estoque_atual: number
  estoque_minimo: number
  unidade: string
  ativo: boolean
  observacao?: string
}

export interface ProdutoOpcao {
  id: number
  nome: string
  preco_venda: number
  estoque_atual: number
  categoria: string
}

export interface MovimentacaoEstoque {
  id: number
  produto_id: number
  produto_nome: string
  tipo: string
  quantidade: number
  estoque_anterior: number
  estoque_posterior: number
  venda_id?: number | null
  observacao?: string | null
  data: string
}

export interface MovimentacaoEstoqueCreate {
  produto_id: number
  tipo: 'entrada' | 'saida' | 'ajuste'
  quantidade: number
  observacao?: string
}

export interface EstoqueResumo {
  total_produtos: number
  produtos_ativos: number
  produtos_estoque_baixo: number
  produtos_sem_estoque: number
  valor_total_estoque: number
  total_unidades: number
}

export interface ImportacaoNFeItemResultado {
  numero_item: number
  produto: string
  quantidade: number
  acao: string
  produto_id?: number | null
  estoque_posterior?: number | null
}

export interface ImportacaoNFeResultado {
  nota_numero?: string | null
  nota_serie?: string | null
  emitente?: string | null
  itens_processados: number
  produtos_criados: number
  total_unidades: number
  itens: ImportacaoNFeItemResultado[]
  erros: string[]
}

export interface CaixaVendaPorForma {
  forma_pagamento: string
  total: number
}

export interface CaixaResumoSistema {
  faturamento: number
  quantidade_vendas: number
  vendas_dinheiro: number
  total_saidas: number
  quantidade_saidas: number
  saidas_dinheiro: number
  vendas_por_forma: CaixaVendaPorForma[]
}

export interface CaixaDiario {
  id?: number | null
  data: string
  valor_inicial?: number | null
  valor_fechamento?: number | null
  fechado_em?: string | null
  observacao_abertura?: string | null
  observacao_fechamento?: string | null
  aberto: boolean
  fechado: boolean
  resumo_sistema: CaixaResumoSistema
  saldo_esperado?: number | null
  diferenca?: number | null
}

export interface CaixaDiarioListItem {
  id: number
  data: string
  valor_inicial: number
  valor_fechamento?: number | null
  fechado_em?: string | null
  saldo_esperado?: number | null
  diferenca?: number | null
  faturamento: number
}

export interface CaixaAberturaCreate {
  data: string
  valor_inicial: number
  observacao?: string
}

export interface CaixaFechamentoCreate {
  data: string
  valor_fechamento: number
  observacao?: string
}

export interface DiaVendasResumo {
  data: string | null
  total: number
  quantidade: number
}

export interface ResumoPeriodo {
  descricao: string
  data_inicio: string
  data_fim: string
  faturamento: number
  quantidade_vendas: number
  total_saidas: number
  quantidade_saidas: number
  saldo: number
  ticket_medio: number
  total_itens: number
  dias_com_venda: number
  melhor_dia: DiaVendasResumo
  top_dias_vendas: DiaVendasResumo[]
}

export interface ComparacaoMetrica {
  chave: string
  label: string
  periodo_a: number
  periodo_b: number
  variacao_pct: number | null
}

export interface ConfrontarPeriodosResponse {
  periodo_a: ResumoPeriodo
  periodo_b: ResumoPeriodo
  comparacoes: ComparacaoMetrica[]
}

export interface Saida {
  id: number
  data: string
  descricao: string
  categoria: string
  valor: number
  forma_pagamento: string
  observacao?: string | null
}

export interface SaidaCreate {
  data?: string
  descricao: string
  categoria: string
  valor: number
  forma_pagamento: string
  observacao?: string
}

export interface SaidaPorPeriodo {
  periodo: string
  total: number
  quantidade: number
}

export interface SaidaPorCategoria {
  categoria: string
  total: number
  quantidade: number
}

export interface SaidaMesAtual {
  dia: number
  total: number
}

export interface ImportacaoErro {
  linha: number
  mensagem: string
  produto?: string | null
}

export interface ImportacaoIgnorada {
  linha: number
  id?: number | null
  produto?: string | null
  motivo: string
}

export interface ImportacaoResultado {
  importadas: number
  ignoradas: number
  erros: ImportacaoErro[]
  detalhes_ignoradas: ImportacaoIgnorada[]
  colunas_detectadas: string[]
}

export interface ColunasImportacao {
  obrigatorias: string[]
  opcionais: string[]
  formas_pagamento: string[]
}
