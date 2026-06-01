import type { DashboardKPIs, VendasAVPendentes } from './types'

export function kpisVazios(descricaoPeriodo = 'Mês atual'): DashboardKPIs {
  return {
    total_vendas: 0,
    quantidade_vendas: 0,
    ticket_medio: 0,
    total_descontos: 0,
    total_itens: 0,
    total_saidas: 0,
    quantidade_saidas: 0,
    saldo: 0,
    descricao_periodo: descricaoPeriodo,
    melhor_dia: null,
    melhor_dia_total: 0,
    melhor_dia_quantidade: 0,
  }
}

export const vendasAVVazias: VendasAVPendentes = {
  quantidade: 0,
  total: 0,
  vendas: [],
}
