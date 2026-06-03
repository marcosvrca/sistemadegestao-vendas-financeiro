export function diasAteVencimento(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date()
  venc.setHours(0, 0, 0, 0)
  hoje.setHours(0, 0, 0, 0)
  return Math.floor((hoje.getTime() - venc.getTime()) / 86_400_000)
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
  is_dda: boolean
  recorrente_id?: number | null
}): string {
  if (conta.is_dda) return 'DDA'
  if (conta.recorrente_id) return 'Recorrente'
  return 'Avulsa'
}
