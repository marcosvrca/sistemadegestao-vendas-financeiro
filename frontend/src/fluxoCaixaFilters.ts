import { toDateInput } from './utils'

export type PresetFluxoCaixa =
  | 'diario'
  | 'semanal'
  | '15d'
  | '30d'
  | '60d'
  | '90d'
  | 'personalizado'

export type GranularidadeFluxo = 'dia' | 'semana'

export interface FluxoCaixaFiltros {
  preset: PresetFluxoCaixa
  dataInicio: string
  dataFim: string
}

export const fluxoCaixaFiltrosIniciais: FluxoCaixaFiltros = {
  preset: '30d',
  dataInicio: '',
  dataFim: '',
}

function addDays(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

function diasEntre(inicio: string, fim: string): number {
  const a = new Date(inicio)
  const b = new Date(fim)
  const diff = b.getTime() - a.getTime()
  return Math.max(1, Math.floor(diff / (1000 * 60 * 60 * 24)) + 1)
}

function granularidadeParaIntervalo(dias: number): GranularidadeFluxo {
  return dias > 45 ? 'semana' : 'dia'
}

export interface FluxoCaixaQuery {
  params: Record<string, string>
  granularidade: GranularidadeFluxo
  descricao: string
  labelAgrupamento: string
}

export function buildFluxoCaixaQuery(f: FluxoCaixaFiltros): FluxoCaixaQuery | null {
  const hoje = new Date()
  const hojeStr = toDateInput(hoje)

  let inicio = ''
  let fim = hojeStr
  let granularidade: GranularidadeFluxo = 'dia'
  let descricao = ''

  switch (f.preset) {
    case 'diario':
      inicio = hojeStr
      fim = hojeStr
      granularidade = 'dia'
      descricao = 'Hoje'
      break
    case 'semanal':
      inicio = toDateInput(addDays(hoje, -55))
      granularidade = 'semana'
      descricao = 'Últimas 8 semanas'
      break
    case '15d':
      inicio = toDateInput(addDays(hoje, -14))
      granularidade = 'dia'
      descricao = 'Últimos 15 dias'
      break
    case '30d':
      inicio = toDateInput(addDays(hoje, -29))
      granularidade = 'dia'
      descricao = 'Últimos 30 dias'
      break
    case '60d':
      inicio = toDateInput(addDays(hoje, -59))
      granularidade = 'semana'
      descricao = 'Últimos 60 dias'
      break
    case '90d':
      inicio = toDateInput(addDays(hoje, -89))
      granularidade = 'semana'
      descricao = 'Últimos 90 dias'
      break
    case 'personalizado':
      if (!f.dataInicio || !f.dataFim) return null
      if (f.dataInicio > f.dataFim) return null
      inicio = f.dataInicio
      fim = f.dataFim
      granularidade = granularidadeParaIntervalo(diasEntre(inicio, fim))
      descricao = `${formatarDataBr(inicio)} a ${formatarDataBr(fim)}`
      break
  }

  const params: Record<string, string> = {
    filtro: 'periodo',
    data_inicio: new Date(inicio).toISOString(),
    data_fim: new Date(fim + 'T23:59:59').toISOString(),
    periodo: granularidade,
  }

  return {
    params,
    granularidade,
    descricao,
    labelAgrupamento: granularidade === 'semana' ? 'Semana' : 'Dia',
  }
}

function formatarDataBr(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

export const PRESETS_FLUXO_CAIXA: { id: PresetFluxoCaixa; label: string }[] = [
  { id: 'diario', label: 'Diário' },
  { id: 'semanal', label: 'Semanal' },
  { id: '15d', label: '15 dias' },
  { id: '30d', label: '30 dias' },
  { id: '60d', label: '60 dias' },
  { id: '90d', label: '90 dias' },
  { id: 'personalizado', label: 'Personalizado' },
]
