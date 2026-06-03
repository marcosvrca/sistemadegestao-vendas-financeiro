import type { ProdutoOpcao } from './types'

export const PRODUTO_OUTRO_VALUE = '__outro__'

export function buscarProdutoOpcao(
  nome: string,
  opcoes: ProdutoOpcao[],
): ProdutoOpcao | undefined {
  const chave = nome.trim().toLowerCase()
  if (!chave) return undefined
  return opcoes.find((o) => o.nome.trim().toLowerCase() === chave)
}

export function buscarProdutoOpcaoPorId(
  id: string,
  opcoes: ProdutoOpcao[],
): ProdutoOpcao | undefined {
  if (!id || id === PRODUTO_OUTRO_VALUE) return undefined
  return opcoes.find((o) => String(o.id) === id)
}

export interface ItemProdutoSelecao {
  produto: string
  produtoSelecionado: string
  produtoOutro: string
}

export function resolverNomeProduto(
  item: ItemProdutoSelecao,
  opcoes: ProdutoOpcao[],
): string {
  if (item.produtoSelecionado === PRODUTO_OUTRO_VALUE) {
    return item.produtoOutro.trim()
  }
  const catalogo = buscarProdutoOpcaoPorId(item.produtoSelecionado, opcoes)
  return catalogo?.nome ?? item.produto.trim()
}

export function produtoCatalogoDoItem(
  item: ItemProdutoSelecao,
  opcoes: ProdutoOpcao[],
): ProdutoOpcao | undefined {
  if (item.produtoSelecionado === PRODUTO_OUTRO_VALUE) return undefined
  return buscarProdutoOpcaoPorId(item.produtoSelecionado, opcoes)
}

export function inferirSelecaoProduto(
  nome: string,
  opcoes: ProdutoOpcao[],
): Pick<ItemProdutoSelecao, 'produtoSelecionado' | 'produtoOutro' | 'produto'> {
  const match = buscarProdutoOpcao(nome, opcoes)
  if (match) {
    return {
      produtoSelecionado: String(match.id),
      produtoOutro: '',
      produto: match.nome,
    }
  }
  if (!nome.trim()) {
    return { produtoSelecionado: '', produtoOutro: '', produto: '' }
  }
  return {
    produtoSelecionado: PRODUTO_OUTRO_VALUE,
    produtoOutro: nome.trim(),
    produto: nome.trim(),
  }
}
