import { gerarId as gerarIdRecursos } from './recursosStorage'

export interface RegistroCedulas {
  id: string
  criadoEm: string
  quantidades: Record<string, number>
  total: number
}

const CEDULAS_KEY = 'recanto-recursos-cedulas'

export function gerarId(): string {
  return gerarIdRecursos()
}

export function carregarRegistrosCedulas(): RegistroCedulas[] {
  try {
    const raw = localStorage.getItem(CEDULAS_KEY)
    if (!raw) return []
    return JSON.parse(raw) as RegistroCedulas[]
  } catch {
    return []
  }
}

export function salvarRegistrosCedulas(registros: RegistroCedulas[]): void {
  localStorage.setItem(CEDULAS_KEY, JSON.stringify(registros))
}
