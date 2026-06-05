import type { StatusPedido } from './types'

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  finalizado: 'Finalizado',
  cancelado: 'Cancelado',
}

export function badgeClassStatusPedido(status: StatusPedido): string {
  switch (status) {
    case 'pendente':
      return 'badge-warn'
    case 'em_andamento':
      return 'badge-itens'
    case 'finalizado':
      return ''
    case 'cancelado':
      return 'badge-error'
    default:
      return ''
  }
}

export function diasAteDataPrevista(dataPrevista: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const [ano, mes, dia] = dataPrevista.split('-').map(Number)
  const prevista = new Date(ano, mes - 1, dia)
  const diff = prevista.getTime() - hoje.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function labelDataPrevista(dias: number): string {
  if (dias < 0) return `${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''} atrasado`
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Amanhã'
  return `Em ${dias} dias`
}
