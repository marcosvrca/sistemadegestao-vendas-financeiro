export const FORMA_PAGAMENTO_AV = 'AV'
export const FORMA_CARTAO_CREDITO = 'Cartão Crédito'

export function isVendaAV(formaPagamento: string): boolean {
  return formaPagamento === FORMA_PAGAMENTO_AV
}

export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Interpreta data/hora da API sem deslocar o dia por fuso UTC. */
export function parseApiDatetime(valor: string): Date {
  const limpo = valor.trim().replace('Z', '').split('.')[0]
  const [datePart, timePart = '00:00:00'] = limpo.split('T')
  const [ano, mes, dia] = datePart.split('-').map(Number)
  const [horas, minutos, segundos = 0] = timePart.split(':').map(Number)
  return new Date(ano, mes - 1, dia, horas, minutos, segundos)
}

export function formatarData(data: string): string {
  return parseApiDatetime(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatarDataCurta(data: string): string {
  return parseApiDatetime(data).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatarDataIso(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarPeriodo(periodo: string): string {
  if (periodo.includes('W')) return periodo.replace('W', ' Sem ')
  const partes = periodo.split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}`
  }
  if (partes.length === 2) {
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${meses[parseInt(partes[1]) - 1]}/${partes[0]}`
  }
  return periodo
}

export function calcularValorTotal(quantidade: number, valorUnitario: number, desconto: number): number {
  return Math.max(quantidade * valorUnitario - desconto, 0)
}

export function toDatetimeLocal(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function apiDatetimeToDatetimeLocal(valor: string): string {
  return toDatetimeLocal(parseApiDatetime(valor))
}

/** Envia para a API o mesmo dia/hora escolhidos no input datetime-local. */
export function datetimeLocalParaApi(valor: string): string {
  const [datePart, timePart = '00:00'] = valor.trim().split('T')
  const [horas, minutos = '0'] = timePart.split(':')
  return `${datePart}T${horas.padStart(2, '0')}:${minutos.padStart(2, '0')}:00`
}

export function toDateInput(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function limparDocumento(valor: string): string {
  return valor.replace(/\D/g, '')
}

export function formatarDocumento(documento: string): string {
  const doc = limparDocumento(documento)
  if (doc.length === 11) {
    return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`
  }
  if (doc.length === 14) {
    return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`
  }
  return documento
}

export function labelTipoDocumento(documento: string): 'CPF' | 'CNPJ' | 'Documento' {
  const doc = limparDocumento(documento)
  if (doc.length === 11) return 'CPF'
  if (doc.length === 14) return 'CNPJ'
  return 'Documento'
}
