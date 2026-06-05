import { formatarDataCurta, gerarId } from './recursosStorage'

export type TipoPromocao = 'desconto_direto' | 'brinde_valor' | 'desconto_progressivo'

export interface ProdutoDescontoDireto {
  produtoId: number
  produtoNome: string
  descontoPercentual: number
}

export interface FaixaProgressiva {
  id: string
  quantidade: number
  descontoPercentual: number
}

export interface PromocaoBrinde {
  valorMinimo: number
  brindeDescricao: string
}

export interface PromocaoProgressiva {
  produtoId: number
  produtoNome: string
  faixas: FaixaProgressiva[]
}

export interface Promocao {
  id: string
  nome: string
  dataInicio: string
  dataFim: string
  tipo: TipoPromocao
  descontoDireto: ProdutoDescontoDireto[]
  brinde?: PromocaoBrinde
  progressivo?: PromocaoProgressiva
  criadoEm: string
}

const STORAGE_KEY = 'recanto-recursos-promocoes'
export const PROMOCOES_ALTERADAS_EVENT = 'recanto-promocoes-alteradas'

export const TIPOS_PROMOCAO: { id: TipoPromocao; label: string; desc: string }[] = [
  {
    id: 'desconto_direto',
    label: 'Desconto direto',
    desc: 'Aplique desconto em produtos selecionados do catálogo',
  },
  {
    id: 'brinde_valor',
    label: 'Brinde por valor',
    desc: 'Cliente ganha brinde ao atingir um valor mínimo de compra',
  },
  {
    id: 'desconto_progressivo',
    label: 'Desconto progressivo',
    desc: 'Quanto mais unidades do produto, maior o desconto',
  },
]

export function hojeIsoPromocao(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function carregarPromocoes(): Promocao[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as Promocao[]
  } catch {
    return []
  }
}

export function salvarPromocoes(promocoes: Promocao[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(promocoes))
  window.dispatchEvent(new CustomEvent(PROMOCOES_ALTERADAS_EVENT))
}

export function promocaoEstaAtiva(p: Promocao, hoje = hojeIsoPromocao()): boolean {
  return p.dataInicio <= hoje && p.dataFim >= hoje
}

export function promocaoAtivaNaData(p: Promocao, dataReferencia: string): boolean {
  const dia = dataReferencia.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia)) return promocaoEstaAtiva(p)
  return p.dataInicio <= dia && p.dataFim >= dia
}

export function listarPromocoesAtivasNaData(
  dataReferencia?: string,
  promocoes = carregarPromocoes()
): Promocao[] {
  const ref = dataReferencia?.slice(0, 10) ?? hojeIsoPromocao()
  return promocoes.filter((p) => promocaoAtivaNaData(p, ref))
}

export function promocaoStatus(
  p: Promocao,
  hoje = hojeIsoPromocao()
): 'ativa' | 'futura' | 'encerrada' {
  if (p.dataInicio > hoje) return 'futura'
  if (p.dataFim < hoje) return 'encerrada'
  return 'ativa'
}

export function labelTipoPromocao(tipo: TipoPromocao): string {
  return TIPOS_PROMOCAO.find((t) => t.id === tipo)?.label ?? tipo
}

export function formatarPeriodoPromocao(dataInicio: string, dataFim: string): string {
  if (dataInicio === dataFim) return formatarDataCurta(dataInicio)
  return `${formatarDataCurta(dataInicio)} a ${formatarDataCurta(dataFim)}`
}

export function resumoPromocao(p: Promocao): string {
  if (p.tipo === 'desconto_direto') {
    const qtd = p.descontoDireto.length
    return qtd === 0
      ? 'Nenhum produto com desconto'
      : `${qtd} produto${qtd === 1 ? '' : 's'} com desconto`
  }
  if (p.tipo === 'brinde_valor' && p.brinde) {
    return `Brinde a partir de R$ ${p.brinde.valorMinimo.toFixed(2).replace('.', ',')}`
  }
  if (p.tipo === 'desconto_progressivo' && p.progressivo) {
    const faixas = p.progressivo.faixas.length
    return `${p.progressivo.produtoNome} · ${faixas} faixa${faixas === 1 ? '' : 's'}`
  }
  return 'Configuração pendente'
}

export function criarFaixaProgressiva(quantidade: number, descontoPercentual: number): FaixaProgressiva {
  return {
    id: gerarId(),
    quantidade,
    descontoPercentual,
  }
}

export function criarPromocaoVazia(tipo: TipoPromocao): Omit<Promocao, 'id' | 'criadoEm'> {
  const base = {
    nome: '',
    dataInicio: hojeIsoPromocao(),
    dataFim: hojeIsoPromocao(),
    tipo,
    descontoDireto: [] as ProdutoDescontoDireto[],
  }
  if (tipo === 'brinde_valor') {
    return { ...base, brinde: { valorMinimo: 0, brindeDescricao: '' } }
  }
  if (tipo === 'desconto_progressivo') {
    return {
      ...base,
      progressivo: { produtoId: 0, produtoNome: '', faixas: [] },
    }
  }
  return base
}
