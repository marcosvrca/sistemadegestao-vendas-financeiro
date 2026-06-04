export interface EventoAgenda {
  id: string
  titulo: string
  descricao: string
  data: string
  dataFim?: string
  hora: string
  criadoEm: string
  alerta?: boolean
  alertaOrigem?: 'agenda' | 'calendario'
}

export interface Nota {
  id: string
  titulo: string
  conteudo: string
  atualizadoEm: string
  alerta?: boolean
}

export type TipoAlerta = 'nota' | 'agenda' | 'calendario'

export interface AlertaItem {
  id: string
  tipo: TipoAlerta
  titulo: string
  descricao: string
  data?: string
  dataFim?: string
  hora?: string
  referencia: string
  atualizadoEm: string
}

const AGENDA_KEY = 'recanto-recursos-agenda'
const NOTAS_KEY = 'recanto-recursos-notas'
export const RECURSOS_ALTERADOS_EVENT = 'recanto-recursos-alterados'

function ler<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function salvar<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data))
}

function notificarAlteracao(): void {
  window.dispatchEvent(new CustomEvent(RECURSOS_ALTERADOS_EVENT))
}

export function dataFimDoEvento(ev: EventoAgenda): string {
  if (ev.dataFim && ev.dataFim >= ev.data) return ev.dataFim
  return ev.data
}

export function eventoOcorreNoDia(ev: EventoAgenda, dia: string): boolean {
  return dia >= ev.data && dia <= dataFimDoEvento(ev)
}

export function formatarDataCurta(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatarPeriodoEvento(data: string, dataFim?: string): string {
  if (dataFim && dataFim > data) {
    return `${formatarDataCurta(data)} a ${formatarDataCurta(dataFim)}`
  }
  return formatarDataCurta(data)
}

export function eventoEhPassado(ev: EventoAgenda, hoje: string): boolean {
  return dataFimDoEvento(ev) < hoje
}

export function carregarEventosAgenda(): EventoAgenda[] {
  return ler<EventoAgenda[]>(AGENDA_KEY, [])
}

export function salvarEventosAgenda(eventos: EventoAgenda[]): void {
  salvar(AGENDA_KEY, eventos)
  notificarAlteracao()
}

export function carregarNotas(): Nota[] {
  return ler<Nota[]>(NOTAS_KEY, [])
}

export function salvarNotas(notas: Nota[]): void {
  salvar(NOTAS_KEY, notas)
  notificarAlteracao()
}

export function gerarId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function alternarAlertaNota(id: string): void {
  const notas = carregarNotas().map((n) =>
    n.id === id ? { ...n, alerta: !n.alerta } : n
  )
  salvarNotas(notas)
}

export function alternarAlertaEvento(
  id: string,
  origem: 'agenda' | 'calendario'
): void {
  const eventos = carregarEventosAgenda().map((ev) => {
    if (ev.id !== id) return ev
    const ativo = !ev.alerta
    return {
      ...ev,
      alerta: ativo,
      alertaOrigem: ativo ? origem : undefined,
    }
  })
  salvarEventosAgenda(eventos)
}

export function carregarAlertas(): {
  notas: AlertaItem[]
  agenda: AlertaItem[]
  calendario: AlertaItem[]
  total: number
} {
  const notas = carregarNotas()
    .filter((n) => n.alerta)
    .map((n) => ({
      id: `nota-${n.id}`,
      tipo: 'nota' as const,
      titulo: n.titulo || 'Sem título',
      descricao: n.conteudo,
      referencia: n.id,
      atualizadoEm: n.atualizadoEm,
    }))
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))

  const eventosAgenda = carregarEventosAgenda().filter((ev) => ev.alerta)

  const agenda = eventosAgenda
    .filter((ev) => (ev.alertaOrigem ?? 'agenda') === 'agenda')
    .map(eventoParaAlerta('agenda'))
    .sort(ordenarEventos)

  const calendario = eventosAgenda
    .filter((ev) => ev.alertaOrigem === 'calendario')
    .map(eventoParaAlerta('calendario'))
    .sort(ordenarEventos)

  return {
    notas,
    agenda,
    calendario,
    total: notas.length + agenda.length + calendario.length,
  }
}

export function contarAlertas(): number {
  return carregarAlertas().total
}

function eventoParaAlerta(tipo: 'agenda' | 'calendario') {
  return (ev: EventoAgenda): AlertaItem => ({
    id: `${tipo}-${ev.id}`,
    tipo,
    titulo: ev.titulo,
    descricao: ev.descricao,
    data: ev.data,
    dataFim: ev.dataFim,
    hora: ev.hora,
    referencia: ev.id,
    atualizadoEm: ev.criadoEm,
  })
}

function ordenarEventos(a: AlertaItem, b: AlertaItem): number {
  const dataA = a.data ?? ''
  const dataB = b.data ?? ''
  const cmp = dataA.localeCompare(dataB)
  if (cmp !== 0) return cmp
  return (a.hora ?? '').localeCompare(b.hora ?? '')
}

export function paginaDoAlerta(tipo: TipoAlerta): 'recursos-notas' | 'recursos-agenda' | 'recursos-calendario' {
  if (tipo === 'nota') return 'recursos-notas'
  if (tipo === 'agenda') return 'recursos-agenda'
  return 'recursos-calendario'
}

export function removerAlerta(item: AlertaItem): void {
  if (item.tipo === 'nota') {
    alternarAlertaNota(item.referencia)
    return
  }
  alternarAlertaEvento(
    item.referencia,
    item.tipo === 'calendario' ? 'calendario' : 'agenda'
  )
}

export function montarMapaEventosPorDia(eventos: EventoAgenda[]): Map<string, EventoAgenda[]> {
  const map = new Map<string, EventoAgenda[]>()
  for (const ev of eventos) {
    const fim = dataFimDoEvento(ev)
    let dia = ev.data
    while (dia <= fim) {
      const lista = map.get(dia) ?? []
      if (!lista.some((item) => item.id === ev.id)) lista.push(ev)
      map.set(dia, lista)
      dia = proximoDiaIso(dia)
    }
  }
  return map
}

function proximoDiaIso(iso: string): string {
  const [ano, mes, dia] = iso.split('-').map(Number)
  const d = new Date(ano, mes - 1, dia + 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
