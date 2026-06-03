from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal

from fastapi import Query
from sqlalchemy.orm import Query as SqlQuery

from av_utils import aplicar_filtro_vendas_financeiras, data_efetiva_venda
from models import ItemVenda, Saida, Venda

FiltroPeriodo = Literal["hoje", "mes", "periodo", "data", "total"]


@dataclass
class PeriodoFiltro:
    dt_inicio: datetime | None
    dt_fim: datetime | None
    descricao: str


@dataclass
class FiltrosDashboard:
    periodo: PeriodoFiltro
    forma_pagamento: str | None
    produto: str | None
    categoria_saida: str | None


def resolver_periodo(
    filtro: FiltroPeriodo,
    data_inicio: datetime | None = None,
    data_fim: datetime | None = None,
    data: datetime | None = None,
) -> PeriodoFiltro:
    agora = datetime.now()
    inicio_hoje = agora.replace(hour=0, minute=0, second=0, microsecond=0)
    fim_hoje = inicio_hoje + timedelta(days=1) - timedelta(seconds=1)
    inicio_mes = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    if filtro == "hoje":
        return PeriodoFiltro(inicio_hoje, fim_hoje, f"Hoje ({agora.strftime('%d/%m/%Y')})")
    if filtro == "mes":
        return PeriodoFiltro(inicio_mes, agora, f"Mês {agora.strftime('%m/%Y')}")
    if filtro == "data":
        if not data:
            return PeriodoFiltro(None, None, "Selecione a data")
        dt_inicio = data.replace(hour=0, minute=0, second=0, microsecond=0)
        dt_fim = dt_inicio + timedelta(days=1) - timedelta(seconds=1)
        return PeriodoFiltro(dt_inicio, dt_fim, data.strftime("%d/%m/%Y"))
    if filtro == "periodo":
        if not data_inicio or not data_fim:
            return PeriodoFiltro(None, None, "Selecione o período")
        dt_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
        dt_fim = data_fim.replace(hour=23, minute=59, second=59, microsecond=0)
        return PeriodoFiltro(
            dt_inicio,
            dt_fim,
            f"{dt_inicio.strftime('%d/%m/%Y')} a {dt_fim.strftime('%d/%m/%Y')}",
        )
    return PeriodoFiltro(None, None, "Todo o período")


def criar_filtros_por_intervalo(
    data_inicio: datetime,
    data_fim: datetime,
    descricao: str | None = None,
) -> FiltrosDashboard:
    dt_inicio = data_inicio.replace(hour=0, minute=0, second=0, microsecond=0)
    dt_fim = data_fim.replace(hour=23, minute=59, second=59, microsecond=0)
    if not descricao:
        descricao = f"{dt_inicio.strftime('%d/%m/%Y')} a {dt_fim.strftime('%d/%m/%Y')}"
    return FiltrosDashboard(
        periodo=PeriodoFiltro(dt_inicio, dt_fim, descricao),
        forma_pagamento=None,
        produto=None,
        categoria_saida=None,
    )


def montar_filtros_dashboard(
    filtro: FiltroPeriodo = Query(default="mes"),
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    data: datetime | None = Query(default=None),
    forma_pagamento: str | None = Query(default=None),
    produto: str | None = Query(default=None),
    categoria_saida: str | None = Query(default=None),
) -> FiltrosDashboard:
    periodo = resolver_periodo(filtro, data_inicio, data_fim, data)
    partes = [periodo.descricao]
    if forma_pagamento:
        partes.append(forma_pagamento)
    if produto:
        partes.append(produto)
    if categoria_saida:
        partes.append(categoria_saida)
    periodo.descricao = " · ".join(partes)
    return FiltrosDashboard(
        periodo=periodo,
        forma_pagamento=forma_pagamento,
        produto=produto,
        categoria_saida=categoria_saida,
    )


def filtrar_vendas(query: SqlQuery, filtros: FiltrosDashboard) -> SqlQuery:
    query = aplicar_filtro_vendas_financeiras(query, filtros.forma_pagamento)
    if filtros.periodo.dt_inicio and filtros.periodo.dt_fim:
        ref = data_efetiva_venda()
        query = query.filter(
            ref >= filtros.periodo.dt_inicio,
            ref <= filtros.periodo.dt_fim,
        )
    if filtros.produto:
        termo = f"%{filtros.produto}%"
        query = query.filter(
            (Venda.produto.ilike(termo))
            | Venda.itens.any(ItemVenda.produto.ilike(termo))
        )
    return query


def filtrar_saidas(query: SqlQuery, filtros: FiltrosDashboard) -> SqlQuery:
    if filtros.periodo.dt_inicio and filtros.periodo.dt_fim:
        query = query.filter(
            Saida.data >= filtros.periodo.dt_inicio,
            Saida.data <= filtros.periodo.dt_fim,
        )
    if filtros.forma_pagamento:
        query = query.filter(Saida.forma_pagamento == filtros.forma_pagamento)
    if filtros.categoria_saida:
        query = query.filter(Saida.categoria == filtros.categoria_saida)
    return query


def ids_vendas_filtradas(db, filtros: FiltrosDashboard) -> list[int]:
    query = filtrar_vendas(db.query(Venda.id), filtros)
    return [row[0] for row in query.all()]


def agrupar_registros_por_periodo(registros, granularidade: str, campo_valor: str = "valor") -> dict:
    agrupado: dict[str, dict[str, float | int]] = {}
    for registro in registros:
        if granularidade == "mes":
            chave = registro.data.strftime("%Y-%m")
        elif granularidade == "semana":
            chave = registro.data.strftime("%Y-W%W")
        else:
            chave = registro.data.strftime("%Y-%m-%d")

        if chave not in agrupado:
            agrupado[chave] = {"total": 0.0, "quantidade": 0}

        agrupado[chave]["total"] += getattr(registro, campo_valor)
        agrupado[chave]["quantidade"] += 1
    return agrupado
