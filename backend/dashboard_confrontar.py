from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from dashboard_filtros import FiltrosDashboard, criar_filtros_por_intervalo, filtrar_saidas, filtrar_vendas
from models import ItemVenda, Saida, Venda


def agrupar_vendas_por_dia(vendas: list[Venda]) -> dict[str, dict[str, float | int]]:
    agrupado: dict[str, dict[str, float | int]] = {}
    for venda in vendas:
        chave = venda.data.strftime("%Y-%m-%d")
        if chave not in agrupado:
            agrupado[chave] = {"total": 0.0, "quantidade": 0}
        agrupado[chave]["total"] += venda.valor
        agrupado[chave]["quantidade"] += 1
    return agrupado


def obter_melhor_dia(vendas: list[Venda]) -> dict:
    agrupado = agrupar_vendas_por_dia(vendas)
    if not agrupado:
        return {"data": None, "total": 0.0, "quantidade": 0}

    melhor_data, dados = max(agrupado.items(), key=lambda x: x[1]["total"])
    return {
        "data": melhor_data,
        "total": round(float(dados["total"]), 2),
        "quantidade": int(dados["quantidade"]),
    }


def top_dias_vendas(vendas: list[Venda], limite: int = 5) -> list[dict]:
    agrupado = agrupar_vendas_por_dia(vendas)
    ordenado = sorted(agrupado.items(), key=lambda x: x[1]["total"], reverse=True)[:limite]
    return [
        {
            "data": data,
            "total": round(float(dados["total"]), 2),
            "quantidade": int(dados["quantidade"]),
        }
        for data, dados in ordenado
    ]


def calcular_resumo_periodo(db: Session, filtros: FiltrosDashboard) -> dict:
    vendas = filtrar_vendas(db.query(Venda), filtros).all()
    total_vendas = sum(v.valor for v in vendas)
    quantidade_vendas = len(vendas)
    ticket_medio = total_vendas / quantidade_vendas if quantidade_vendas else 0.0

    venda_ids = [v.id for v in vendas]
    if venda_ids:
        total_itens = (
            db.query(func.coalesce(func.sum(ItemVenda.quantidade), 0))
            .filter(ItemVenda.venda_id.in_(venda_ids))
            .scalar()
            or 0
        )
    else:
        total_itens = 0

    saidas = filtrar_saidas(db.query(Saida), filtros).all()
    total_saidas = sum(s.valor for s in saidas)
    quantidade_saidas = len(saidas)
    saldo = total_vendas - total_saidas

    melhor = obter_melhor_dia(vendas)
    dias_com_venda = len(agrupar_vendas_por_dia(vendas))

    return {
        "descricao": filtros.periodo.descricao,
        "data_inicio": filtros.periodo.dt_inicio,
        "data_fim": filtros.periodo.dt_fim,
        "faturamento": round(total_vendas, 2),
        "quantidade_vendas": quantidade_vendas,
        "total_saidas": round(total_saidas, 2),
        "quantidade_saidas": quantidade_saidas,
        "saldo": round(saldo, 2),
        "ticket_medio": round(ticket_medio, 2),
        "total_itens": total_itens,
        "dias_com_venda": dias_com_venda,
        "melhor_dia": melhor,
        "top_dias_vendas": top_dias_vendas(vendas),
    }


def variacao_pct(valor_a: float, valor_b: float) -> float | None:
    if valor_a == 0:
        return None if valor_b == 0 else 100.0
    return round(((valor_b - valor_a) / valor_a) * 100, 1)


def confrontar_periodos(
    db: Session,
    a_inicio: datetime,
    a_fim: datetime,
    b_inicio: datetime,
    b_fim: datetime,
) -> dict:
    filtros_a = criar_filtros_por_intervalo(a_inicio, a_fim, "Período A")
    filtros_b = criar_filtros_por_intervalo(b_inicio, b_fim, "Período B")

    resumo_a = calcular_resumo_periodo(db, filtros_a)
    resumo_b = calcular_resumo_periodo(db, filtros_b)

    metricas = [
        ("faturamento", "Faturamento"),
        ("quantidade_vendas", "Entradas (vendas)"),
        ("total_saidas", "Saídas"),
        ("quantidade_saidas", "Qtd. de saídas"),
        ("saldo", "Saldo"),
        ("ticket_medio", "Média de venda"),
        ("total_itens", "Itens vendidos"),
        ("dias_com_venda", "Dias com venda"),
    ]

    comparacoes = []
    for chave, label in metricas:
        va = float(resumo_a[chave])
        vb = float(resumo_b[chave])
        comparacoes.append({
            "chave": chave,
            "label": label,
            "periodo_a": va,
            "periodo_b": vb,
            "variacao_pct": variacao_pct(va, vb),
        })

    return {
        "periodo_a": resumo_a,
        "periodo_b": resumo_b,
        "comparacoes": comparacoes,
    }
