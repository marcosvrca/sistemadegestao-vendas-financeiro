import {
  FORMA_CARTAO_CREDITO,
  FORMA_PAGAMENTO_AV,
  FORMA_PAGAMENTO_MISTO,
  formatarMoeda,
} from './utils'
import type { PagamentoVendaCreate, Venda, VendaCreate } from './types'

export interface PagamentoForm {
  key: string
  forma_pagamento: string
  valor: number | ''
  parcelas: number
  houveTroco: boolean
  valor_recebido: number | ''
}

export function criarPagamentoVazio(forma = 'Dinheiro', valor: number | '' = ''): PagamentoForm {
  return {
    key: crypto.randomUUID(),
    forma_pagamento: forma,
    valor,
    parcelas: 1,
    houveTroco: false,
    valor_recebido: '',
  }
}

export function vendaParaPagamentosForm(venda: Venda): {
  dividirPagamento: boolean
  pagamentos: PagamentoForm[]
} {
  const fonte =
    venda.pagamentos && venda.pagamentos.length > 0
      ? venda.pagamentos
      : [
          {
            forma_pagamento: venda.forma_pagamento,
            valor: venda.valor,
            troco: venda.troco,
            valor_recebido: venda.valor_recebido,
            parcelas: venda.parcelas,
          },
        ]

  const dividirPagamento =
    venda.forma_pagamento === FORMA_PAGAMENTO_MISTO || fonte.length > 1

  return {
    dividirPagamento,
    pagamentos: fonte.map((p) => ({
      key: crypto.randomUUID(),
      forma_pagamento: p.forma_pagamento,
      valor: p.valor,
      parcelas: p.parcelas ?? 1,
      houveTroco: Boolean(p.troco || p.valor_recebido),
      valor_recebido: p.valor_recebido ?? '',
    })),
  }
}

export function somaPagamentos(pagamentos: PagamentoForm[]): number {
  return pagamentos.reduce((acc, p) => acc + (typeof p.valor === 'number' ? p.valor : 0), 0)
}

export function validarPagamentos(
  pagamentos: PagamentoForm[],
  valorTotal: number,
  dividirPagamento: boolean,
): string | null {
  if (!dividirPagamento) {
    const pagamento = pagamentos[0]
    if (!pagamento) return 'Informe a forma de pagamento'
    if (pagamento.forma_pagamento === FORMA_CARTAO_CREDITO && pagamento.parcelas < 1) {
      return 'Informe o número de parcelas'
    }
    if (pagamento.houveTroco && pagamento.forma_pagamento === 'Dinheiro') {
      const recebido = typeof pagamento.valor_recebido === 'number' ? pagamento.valor_recebido : 0
      if (!recebido || recebido < valorTotal) {
        return 'Valor recebido deve ser maior ou igual ao total da venda'
      }
    }
    return null
  }

  if (pagamentos.length < 2) {
    return 'Adicione pelo menos duas formas de pagamento'
  }

  if (pagamentos.some((p) => p.forma_pagamento === FORMA_PAGAMENTO_AV)) {
    return 'AV não pode ser combinado com outras formas de pagamento'
  }

  const invalidos = pagamentos.some((p) => typeof p.valor !== 'number' || p.valor <= 0)
  if (invalidos) return 'Informe o valor de cada forma de pagamento'

  const total = somaPagamentos(pagamentos)
  if (Math.abs(total - valorTotal) > 0.01) {
    return `A soma dos pagamentos (${formatarMoeda(total)}) deve ser igual ao total (${formatarMoeda(valorTotal)})`
  }

  for (const pagamento of pagamentos) {
    if (pagamento.forma_pagamento === FORMA_CARTAO_CREDITO && pagamento.parcelas < 1) {
      return 'Informe o número de parcelas para cartão de crédito'
    }
    if (pagamento.houveTroco && pagamento.forma_pagamento === 'Dinheiro') {
      const recebido =
        typeof pagamento.valor_recebido === 'number' ? pagamento.valor_recebido : 0
      const valor = typeof pagamento.valor === 'number' ? pagamento.valor : 0
      if (!recebido || recebido < valor) {
        return 'Valor recebido em dinheiro deve ser maior ou igual ao valor pago em dinheiro'
      }
    }
  }

  return null
}

function pagamentoFormParaCreate(pagamento: PagamentoForm, valorFallback: number): PagamentoVendaCreate {
  const valor = typeof pagamento.valor === 'number' ? pagamento.valor : valorFallback
  const isDinheiro = pagamento.forma_pagamento === 'Dinheiro'
  const isCredito = pagamento.forma_pagamento === FORMA_CARTAO_CREDITO
  const recebido = typeof pagamento.valor_recebido === 'number' ? pagamento.valor_recebido : 0
  const troco =
    pagamento.houveTroco && isDinheiro && recebido > 0
      ? Math.max(recebido - valor, 0)
      : undefined

  return {
    forma_pagamento: pagamento.forma_pagamento,
    valor,
    troco,
    valor_recebido:
      pagamento.houveTroco && isDinheiro && recebido > 0 ? recebido : undefined,
    parcelas: isCredito ? pagamento.parcelas : undefined,
  }
}

export function montarDadosPagamentoVenda(
  pagamentos: PagamentoForm[],
  valorTotal: number,
  dividirPagamento: boolean,
): Pick<VendaCreate, 'forma_pagamento' | 'pagamentos' | 'troco' | 'valor_recebido' | 'parcelas'> {
  const principal = pagamentos[0] ?? criarPagamentoVazio()

  if (!dividirPagamento) {
    const pagamento = pagamentoFormParaCreate(principal, valorTotal)
    return {
      forma_pagamento: pagamento.forma_pagamento,
      troco: pagamento.troco,
      valor_recebido: pagamento.valor_recebido,
      parcelas: pagamento.parcelas,
    }
  }

  return {
    forma_pagamento: principal.forma_pagamento,
    pagamentos: pagamentos.map((p) => pagamentoFormParaCreate(p, 0)),
  }
}

export function formatarPagamentosVenda(venda: Venda): string {
  if (venda.forma_pagamento === FORMA_PAGAMENTO_MISTO && venda.pagamentos?.length) {
    return venda.pagamentos.map((p) => `${p.forma_pagamento} ${formatarMoeda(p.valor)}`).join(' + ')
  }
  if (venda.forma_pagamento === FORMA_CARTAO_CREDITO && venda.parcelas && venda.parcelas > 1) {
    return `${venda.forma_pagamento} · ${venda.parcelas}x`
  }
  return venda.forma_pagamento
}
