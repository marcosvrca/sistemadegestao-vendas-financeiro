from models import PagamentoVenda, Venda
from schemas import (
    FORMA_CARTAO_CREDITO,
    FORMA_PAGAMENTO_AV,
    PagamentoVendaCreate,
    VendaCreate,
    VendaUpdate,
)

FORMA_PAGAMENTO_MISTO = "Misto"


def validar_pagamentos(pagamentos: list[PagamentoVendaCreate], valor_total: float) -> None:
    if not pagamentos:
        raise ValueError("Informe pelo menos uma forma de pagamento")

    if len(pagamentos) > 1 and any(p.forma_pagamento == FORMA_PAGAMENTO_AV for p in pagamentos):
        raise ValueError("AV não pode ser combinado com outras formas de pagamento")

    total_pagamentos = round(sum(p.valor for p in pagamentos), 2)
    if abs(total_pagamentos - round(valor_total, 2)) > 0.01:
        raise ValueError(
            f"A soma dos pagamentos ({total_pagamentos:.2f}) deve ser igual ao total da venda "
            f"({round(valor_total, 2):.2f})"
        )

    for pagamento in pagamentos:
        if pagamento.forma_pagamento == FORMA_CARTAO_CREDITO:
            if pagamento.parcelas is None or pagamento.parcelas < 1:
                raise ValueError("Informe o número de parcelas para cartão de crédito")
        elif pagamento.parcelas is not None:
            raise ValueError("Parcelas só se aplicam a cartão de crédito")

        if pagamento.forma_pagamento == "Dinheiro" and pagamento.valor_recebido is not None:
            if pagamento.valor_recebido < pagamento.valor:
                raise ValueError("Valor recebido em dinheiro deve ser maior ou igual ao valor pago")


def resolver_forma_resumo(pagamentos: list[PagamentoVenda]) -> str:
    if len(pagamentos) <= 1:
        return pagamentos[0].forma_pagamento if pagamentos else ""
    return FORMA_PAGAMENTO_MISTO


def sincronizar_cabecalho_pagamento(venda: Venda, pagamentos: list[PagamentoVenda]) -> None:
    venda.forma_pagamento = resolver_forma_resumo(pagamentos)

    dinheiro = next((p for p in pagamentos if p.forma_pagamento == "Dinheiro"), None)
    credito = next((p for p in pagamentos if p.forma_pagamento == FORMA_CARTAO_CREDITO), None)

    venda.troco = dinheiro.troco if dinheiro else None
    venda.valor_recebido = dinheiro.valor_recebido if dinheiro else None
    venda.parcelas = credito.parcelas if credito and len(pagamentos) == 1 else None


def resolver_pagamentos_create(venda: VendaCreate, valor_total: float) -> list[PagamentoVendaCreate]:
    if venda.pagamentos:
        return venda.pagamentos
    return [
        PagamentoVendaCreate(
            forma_pagamento=venda.forma_pagamento,
            valor=valor_total,
            troco=venda.troco,
            valor_recebido=venda.valor_recebido,
            parcelas=venda.parcelas,
        )
    ]


def resolver_pagamentos_update(
    dados: VendaUpdate,
    venda: Venda,
    valor_total: float,
) -> list[PagamentoVendaCreate] | None:
    if dados.pagamentos is not None:
        return dados.pagamentos

    campos_pagamento = {
        "forma_pagamento",
        "troco",
        "valor_recebido",
        "parcelas",
    }
    if not any(getattr(dados, campo) is not None for campo in campos_pagamento):
        return None

    forma = dados.forma_pagamento if dados.forma_pagamento is not None else venda.forma_pagamento
    return [
        PagamentoVendaCreate(
            forma_pagamento=forma,
            valor=valor_total,
            troco=dados.troco if dados.troco is not None else venda.troco,
            valor_recebido=(
                dados.valor_recebido if dados.valor_recebido is not None else venda.valor_recebido
            ),
            parcelas=dados.parcelas if dados.parcelas is not None else venda.parcelas,
        )
    ]


def aplicar_pagamentos_venda(
    db,
    venda: Venda,
    pagamentos_data: list[PagamentoVendaCreate],
    valor_total: float,
) -> list[PagamentoVenda]:
    validar_pagamentos(pagamentos_data, valor_total)
    db.query(PagamentoVenda).filter(PagamentoVenda.venda_id == venda.id).delete()

    pagamentos: list[PagamentoVenda] = []
    for item in pagamentos_data:
        pagamentos.append(
            PagamentoVenda(
                venda_id=venda.id,
                forma_pagamento=item.forma_pagamento,
                valor=round(item.valor, 2),
                troco=item.troco,
                valor_recebido=item.valor_recebido,
                parcelas=(
                    item.parcelas if item.forma_pagamento == FORMA_CARTAO_CREDITO else None
                ),
            )
        )

    db.add_all(pagamentos)
    db.flush()
    sincronizar_cabecalho_pagamento(venda, pagamentos)
    return pagamentos


def iter_valores_por_forma(venda: Venda) -> list[tuple[str, float]]:
    if venda.pagamentos:
        return [(p.forma_pagamento, p.valor) for p in venda.pagamentos]
    return [(venda.forma_pagamento, venda.valor)]


def venda_possui_forma(venda: Venda, forma: str) -> bool:
    if forma == FORMA_PAGAMENTO_MISTO:
        return venda.forma_pagamento == FORMA_PAGAMENTO_MISTO
    if venda.pagamentos:
        return any(p.forma_pagamento == forma for p in venda.pagamentos)
    return venda.forma_pagamento == forma
