import type { ProdutoOpcao } from './types'

export function buscarProdutoOpcao(nome: string, opcoes: ProdutoOpcao[]): ProdutoOpcao | undefined {
  const chave = nome.trim().toLowerCase()
  if (!chave) return undefined
  return opcoes.find((o) => o.nome.trim().toLowerCase() === chave)
}
