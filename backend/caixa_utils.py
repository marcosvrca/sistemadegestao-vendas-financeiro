from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session, joinedload

from av_utils import aplicar_filtro_vendas_financeiras, data_efetiva_venda
from models import Saida, Venda
from venda_pagamentos_utils import iter_valores_por_forma

FORMA_DINHEIRO = "Dinheiro"


def intervalo_do_dia(dia: date) -> tuple[datetime, datetime]:
    dt_inicio = datetime.combine(dia, datetime.min.time())
    dt_fim = dt_inicio + timedelta(days=1) - timedelta(microseconds=1)
    return dt_inicio, dt_fim


def calcular_resumo_sistema(db: Session, dia: date) -> dict:
    dt_inicio, dt_fim = intervalo_do_dia(dia)

    ref = data_efetiva_venda()
    vendas = (
        aplicar_filtro_vendas_financeiras(
            db.query(Venda).options(joinedload(Venda.pagamentos)),
            None,
        )
        .filter(ref >= dt_inicio, ref <= dt_fim)
        .all()
    )
    saidas = (
        db.query(Saida)
        .filter(Saida.data >= dt_inicio, Saida.data <= dt_fim)
        .all()
    )

    faturamento = sum(v.valor for v in vendas)
    vendas_dinheiro = 0.0
    total_saidas = sum(s.valor for s in saidas)
    saidas_dinheiro = sum(s.valor for s in saidas if s.forma_pagamento == FORMA_DINHEIRO)

    por_forma: dict[str, float] = {}
    for venda in vendas:
        for forma, valor in iter_valores_por_forma(venda):
            por_forma[forma] = por_forma.get(forma, 0.0) + valor
            if forma == FORMA_DINHEIRO:
                vendas_dinheiro += valor

    return {
        "faturamento": round(faturamento, 2),
        "quantidade_vendas": len(vendas),
        "vendas_dinheiro": round(vendas_dinheiro, 2),
        "total_saidas": round(total_saidas, 2),
        "quantidade_saidas": len(saidas),
        "saidas_dinheiro": round(saidas_dinheiro, 2),
        "vendas_por_forma": [
            {"forma_pagamento": forma, "total": round(total, 2)}
            for forma, total in sorted(por_forma.items(), key=lambda x: -x[1])
        ],
    }


def calcular_saldo_esperado(valor_inicial: float, resumo: dict) -> float:
    return round(valor_inicial + resumo["vendas_dinheiro"] - resumo["saidas_dinheiro"], 2)
