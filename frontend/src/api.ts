import type {
  ColunasImportacao,
  ConfrontarPeriodosResponse,
  DashboardKPIs,
  EstoqueResumo,
  ImportacaoResultado,
  ImportacaoNFeResultado,
  MovimentacaoEstoque,
  MovimentacaoEstoqueCreate,
  Produto,
  ProdutoCreate,
  ProdutoOpcao,
  Saida,
  SaidaCreate,
  SaidaMesAtual,
  SaidaPorCategoria,
  SaidaPorPeriodo,
  TopItem,
  Venda,
  VendaCreate,
  VendaAVResumo,
  VendasAVPendentes,
  VendaMesAtual,
  VendaPorFormaPagamento,
  VendaPorPeriodo,
  CaixaDiario,
  CaixaDiarioListItem,
  CaixaAberturaCreate,
  CaixaFechamentoCreate,
} from './types'

const API = '/api'

function queryString(params?: Record<string, string>) {
  return params ? '?' + new URLSearchParams(params).toString() : ''
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Erro desconhecido' }))
    const detail = error.detail
    const message = typeof detail === 'string'
      ? detail
      : Array.isArray(detail)
        ? detail.map((d: { msg?: string }) => d.msg).join(', ')
        : 'Erro na requisição'
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return response.json()
}

export const api = {
  getFormasPagamento: () => fetchJson<string[]>(`${API}/formas-pagamento`),

  getFormasPagamentoVenda: () => fetchJson<string[]>(`${API}/formas-pagamento-venda`),

  getVendas: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return fetchJson<Venda[]>(`${API}/vendas${query}`)
  },

  createVenda: (venda: VendaCreate) =>
    fetchJson<Venda>(`${API}/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda),
    }),

  updateVenda: (id: number, venda: Partial<VendaCreate>) =>
    fetchJson<Venda>(`${API}/vendas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(venda),
    }),

  deleteVenda: (id: number) =>
    fetchJson<void>(`${API}/vendas/${id}`, { method: 'DELETE' }),

  getKPIs: (params?: Record<string, string>) =>
    fetchJson<DashboardKPIs>(`${API}/dashboard/kpis${queryString(params)}`),

  getVendasAVPendentes: () =>
    fetchJson<VendasAVPendentes>(`${API}/dashboard/vendas-av-pendentes`),

  getVendasPeriodo: (params?: Record<string, string>) =>
    fetchJson<VendaPorPeriodo[]>(`${API}/dashboard/vendas-periodo${queryString(params)}`),

  getFormasPagamentoDashboard: (params?: Record<string, string>) =>
    fetchJson<VendaPorFormaPagamento[]>(`${API}/dashboard/formas-pagamento${queryString(params)}`),

  getTopProdutos: (params?: Record<string, string>, limite = 5) =>
    fetchJson<TopItem[]>(`${API}/dashboard/top-produtos${queryString({ ...(params ?? {}), limite: String(limite) })}`),

  getTopClientes: (params?: Record<string, string>, limite = 5) =>
    fetchJson<TopItem[]>(`${API}/dashboard/top-clientes${queryString({ ...(params ?? {}), limite: String(limite) })}`),

  getVendasMesAtual: (params?: Record<string, string>) =>
    fetchJson<VendaMesAtual[]>(`${API}/dashboard/vendas-mes-atual${queryString(params)}`),

  getColunasImportacao: () =>
    fetchJson<ColunasImportacao>(`${API}/vendas/importar/colunas`),

  importarExcel: (file: File, substituirDuplicados = false) => {
    const formData = new FormData()
    formData.append('file', file)
    return fetchJson<ImportacaoResultado>(
      `${API}/vendas/importar-excel?substituir_duplicados=${substituirDuplicados}`,
      { method: 'POST', body: formData },
    )
  },

  getCategoriasSaida: () => fetchJson<string[]>(`${API}/categorias-saida`),

  getSaidas: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return fetchJson<Saida[]>(`${API}/saidas${query}`)
  },

  createSaida: (saida: SaidaCreate) =>
    fetchJson<Saida>(`${API}/saidas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saida),
    }),

  updateSaida: (id: number, saida: Partial<SaidaCreate>) =>
    fetchJson<Saida>(`${API}/saidas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(saida),
    }),

  deleteSaida: (id: number) =>
    fetchJson<void>(`${API}/saidas/${id}`, { method: 'DELETE' }),

  getSaidasPeriodo: (params?: Record<string, string>) =>
    fetchJson<SaidaPorPeriodo[]>(`${API}/dashboard/saidas-periodo${queryString(params)}`),

  getSaidasCategoria: (params?: Record<string, string>) =>
    fetchJson<SaidaPorCategoria[]>(`${API}/dashboard/saidas-categoria${queryString(params)}`),

  getProdutosVendidos: () => fetchJson<string[]>(`${API}/dashboard/produtos-vendidos`),

  getSaidasMesAtual: () =>
    fetchJson<SaidaMesAtual[]>(`${API}/dashboard/saidas-mes-atual`),

  getCaixaLista: (limite = 60) =>
    fetchJson<CaixaDiarioListItem[]>(`${API}/caixa?limite=${limite}`),

  getCaixaDia: (data: string) =>
    fetchJson<CaixaDiario>(`${API}/caixa/dia?data=${data}`),

  registrarAberturaCaixa: (dados: CaixaAberturaCreate) =>
    fetchJson<CaixaDiario>(`${API}/caixa/abertura`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }),

  registrarFechamentoCaixa: (dados: CaixaFechamentoCreate) =>
    fetchJson<CaixaDiario>(`${API}/caixa/fechamento`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }),

  deleteCaixa: (id: number) =>
    fetchJson<void>(`${API}/caixa/${id}`, { method: 'DELETE' }),

  getEstoqueResumo: () => fetchJson<EstoqueResumo>(`${API}/estoque/resumo`),

  getCategoriasProduto: () => fetchJson<string[]>(`${API}/estoque/categorias`),

  getProdutosEstoque: (params?: Record<string, string>) =>
    fetchJson<Produto[]>(`${API}/estoque/produtos${queryString(params)}`),

  getProdutoOpcoes: (params?: Record<string, string>) =>
    fetchJson<ProdutoOpcao[]>(`${API}/estoque/opcoes${queryString(params)}`),

  createProduto: (produto: ProdutoCreate) =>
    fetchJson<Produto>(`${API}/estoque/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    }),

  updateProduto: (id: number, produto: Partial<ProdutoCreate>) =>
    fetchJson<Produto>(`${API}/estoque/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(produto),
    }),

  deleteProduto: (id: number) =>
    fetchJson<void>(`${API}/estoque/produtos/${id}`, { method: 'DELETE' }),

  getMovimentacoesEstoque: (params?: Record<string, string>) =>
    fetchJson<MovimentacaoEstoque[]>(`${API}/estoque/movimentacoes${queryString(params)}`),

  registrarMovimentacaoEstoque: (dados: MovimentacaoEstoqueCreate) =>
    fetchJson<MovimentacaoEstoque>(`${API}/estoque/movimentacoes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    }),

  importarXmlNFe: (
    file: File,
    opcoes?: { atualizar_preco?: boolean; criar_inexistentes?: boolean },
  ) => {
    const formData = new FormData()
    formData.append('file', file)
    const params = new URLSearchParams()
    if (opcoes?.atualizar_preco) params.set('atualizar_preco', 'true')
    if (opcoes?.criar_inexistentes === false) params.set('criar_inexistentes', 'false')
    const qs = params.toString()
    return fetchJson<ImportacaoNFeResultado>(
      `${API}/estoque/importar-xml${qs ? `?${qs}` : ''}`,
      { method: 'POST', body: formData },
    )
  },

  confrontarPeriodos: (params: {
    data_a_inicio: string
    data_a_fim: string
    data_b_inicio: string
    data_b_fim: string
  }) => fetchJson<ConfrontarPeriodosResponse>(
    `${API}/dashboard/confrontar${queryString({
      data_a_inicio: params.data_a_inicio,
      data_a_fim: params.data_a_fim,
      data_b_inicio: params.data_b_inicio,
      data_b_fim: params.data_b_fim,
    })}`,
  ),
}
