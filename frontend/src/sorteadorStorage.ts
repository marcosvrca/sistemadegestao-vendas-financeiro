import { formatarDataCurta, gerarId } from './recursosStorage'

export interface ParticipanteSorteio {
  id: string
  nome: string
  telefone: string
  endereco: string
  observacao: string
  criadoEm: string
}

export interface Sorteio {
  id: string
  /** Nome/título da campanha de sorteio */
  nome: string
  dataInicio: string
  dataFim: string
  participantes: ParticipanteSorteio[]
  ganhadorId?: string
  sorteadoEm?: string
  arquivado?: boolean
  arquivadoEm?: string
  criadoEm: string
}

const STORAGE_KEY = 'recanto-recursos-sorteador'
export const SORTEADOR_ALTERADO_EVENT = 'recanto-sorteador-alterado'

export function hojeIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function carregarSorteios(): Sorteio[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Sorteio[]
  } catch {
    return []
  }
}

export function salvarSorteios(sorteios: Sorteio[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorteios))
  window.dispatchEvent(new CustomEvent(SORTEADOR_ALTERADO_EVENT))
}

export function sorteioEstaAtivo(s: Sorteio, hoje = hojeIso()): boolean {
  if (s.arquivado) return false
  return s.dataInicio <= hoje && s.dataFim >= hoje
}

export function sorteioConcluido(s: Sorteio): boolean {
  return Boolean(s.ganhadorId) && !s.arquivado
}

export function sorteioArquivado(s: Sorteio): boolean {
  return Boolean(s.arquivado)
}

/** Mês de referência para agrupamento (YYYY-MM). */
export function mesReferenciaSorteio(s: Sorteio): string {
  const iso = s.arquivadoEm ?? s.sorteadoEm ?? s.dataFim
  return iso.slice(0, 7)
}

const MESES_PT = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function formatarMesAno(anoMes: string): string {
  const [ano, mes] = anoMes.split('-').map(Number)
  if (!ano || !mes) return anoMes
  return `${MESES_PT[mes - 1] ?? anoMes} ${ano}`
}

export function listarMesesArquivo(sorteios: Sorteio[]): string[] {
  const meses = new Set(
    sorteios.filter((s) => s.arquivado).map(mesReferenciaSorteio)
  )
  return [...meses].sort((a, b) => b.localeCompare(a))
}

export function agruparSorteiosPorMes(sorteios: Sorteio[]): Map<string, Sorteio[]> {
  const map = new Map<string, Sorteio[]>()
  for (const s of sorteios) {
    const mes = mesReferenciaSorteio(s)
    const lista = map.get(mes) ?? []
    lista.push(s)
    map.set(mes, lista)
  }
  for (const lista of map.values()) {
    lista.sort((a, b) => (b.arquivadoEm ?? b.sorteadoEm ?? '').localeCompare(a.arquivadoEm ?? a.sorteadoEm ?? ''))
  }
  return map
}

export function formatarPeriodoSorteio(dataInicio: string, dataFim: string): string {
  if (dataInicio === dataFim) return formatarDataCurta(dataInicio)
  return `${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}`
}

export function criarSorteio(nome: string, dataFim: string): Sorteio {
  const hoje = hojeIso()
  return {
    id: gerarId(),
    nome: nome.trim(),
    dataInicio: hoje,
    dataFim: dataFim < hoje ? hoje : dataFim,
    participantes: [],
    criadoEm: new Date().toISOString(),
  }
}

export function criarParticipante(
  dados: Omit<ParticipanteSorteio, 'id' | 'criadoEm'>
): ParticipanteSorteio {
  return {
    id: gerarId(),
    nome: dados.nome.trim(),
    telefone: dados.telefone.trim(),
    endereco: dados.endereco.trim(),
    observacao: dados.observacao.trim(),
    criadoEm: new Date().toISOString(),
  }
}

export function sortearParticipante(sorteio: Sorteio): ParticipanteSorteio | null {
  if (sorteio.participantes.length === 0) return null
  const idx = Math.floor(Math.random() * sorteio.participantes.length)
  return sorteio.participantes[idx]
}
