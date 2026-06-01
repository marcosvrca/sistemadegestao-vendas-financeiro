export type FiltroDashboard = 'hoje' | 'mes' | 'periodo' | 'data' | 'total'

export interface DashboardFiltrosState {
  filtro: FiltroDashboard
  dataInicio: string
  dataFim: string
  dataEspecifica: string
  formaPagamento: string
  produto: string
  categoriaSaida: string
}

export const filtrosIniciais: DashboardFiltrosState = {
  filtro: 'mes',
  dataInicio: '',
  dataFim: '',
  dataEspecifica: '',
  formaPagamento: '',
  produto: '',
  categoriaSaida: '',
}

export function buildDashboardParams(f: DashboardFiltrosState): Record<string, string> | null {
  if (f.filtro === 'periodo' && (!f.dataInicio || !f.dataFim)) {
    return null
  }
  if (f.filtro === 'data' && !f.dataEspecifica) {
    return null
  }

  const params: Record<string, string> = { filtro: f.filtro }

  if (f.filtro === 'periodo') {
    if (f.dataInicio) params.data_inicio = new Date(f.dataInicio).toISOString()
    if (f.dataFim) params.data_fim = new Date(f.dataFim + 'T23:59:59').toISOString()
  }
  if (f.filtro === 'data' && f.dataEspecifica) {
    params.data = new Date(f.dataEspecifica).toISOString()
  }
  if (f.formaPagamento) params.forma_pagamento = f.formaPagamento
  if (f.produto) params.produto = f.produto
  if (f.categoriaSaida) params.categoria_saida = f.categoriaSaida

  return params
}
