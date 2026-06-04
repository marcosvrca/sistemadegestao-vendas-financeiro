export function diasAteVencimento(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date()
  venc.setHours(0, 0, 0, 0)
  hoje.setHours(0, 0, 0, 0)
  return Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000)
}

/** Conta ainda não vencida e com vencimento até N dias à frente (inclusive hoje). */
export function venceEmProximosDias(dataVencimento: string, dias = 3): boolean {
  const diff = diasAteVencimento(dataVencimento)
  return diff <= 0 && diff >= -dias
}

export function labelVencimentoConta(dias: number): string {
  if (dias > 0) {
    if (dias === 1) return '1 dia atraso'
    return `${dias} dias atraso`
  }
  if (dias === 0) return 'Vence hoje'
  const faltam = Math.abs(dias)
  if (faltam === 1) return 'Vence amanhã'
  return `Em ${faltam} dias`
}

export function tipoContaPagarLabel(conta: {
  recorrente_id?: number | null
}): string {
  if (conta.recorrente_id) return 'Recorrente'
  return 'Avulsa'
}
