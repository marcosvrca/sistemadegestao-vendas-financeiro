from datetime import datetime

from models import ItemVenda, Venda


def normalizar_data_venda(data: datetime | None) -> datetime:
    if data is None:
        return datetime.now()
    if data.tzinfo is not None:
        return data.astimezone().replace(tzinfo=None)
    return data


def calcular_valor_item(quantidade: int, valor_unitario: float, desconto: float) -> float:
    subtotal = quantidade * valor_unitario
    return max(round(subtotal - desconto, 2), 0.0)


def resumir_produtos(itens: list[ItemVenda]) -> str:
    if not itens:
        return ""
    if len(itens) == 1:
        return itens[0].produto
    nomes = [item.produto for item in itens[:2]]
    if len(itens) == 2:
        return f"{nomes[0]}, {nomes[1]}"
    return f"{nomes[0]}, {nomes[1]} (+{len(itens) - 2})"


def sincronizar_cabecalho(venda: Venda, itens: list[ItemVenda]) -> None:
    if not itens:
        return
    venda.produto = resumir_produtos(itens)
    venda.quantidade = sum(item.quantidade for item in itens)
    venda.desconto = round(sum(item.desconto for item in itens), 2)
    venda.valor = round(sum(item.valor for item in itens), 2)
    venda.valor_unitario = itens[0].valor_unitario
