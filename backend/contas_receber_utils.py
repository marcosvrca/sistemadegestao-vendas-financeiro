"""Regras de negócio para contas recorrentes e cobranças."""

from calendar import monthrange
from datetime import date, datetime

from sqlalchemy.orm import Session

from models import ContaReceber, ContaRecorrente


def referencia_mes_de(data: date) -> str:
    return f"{data.year:04d}-{data.month:02d}"


def data_vencimento_no_mes(ano: int, mes: int, dia: int) -> date:
    ultimo_dia = monthrange(ano, mes)[1]
    return date(ano, mes, min(dia, ultimo_dia))


def mes_inicio_recorrente(recorrente: ContaRecorrente) -> int:
    return recorrente.criado_em.month


def deve_gerar_no_mes(recorrente: ContaRecorrente, ano: int, mes: int) -> bool:
    mes_inicio = mes_inicio_recorrente(recorrente)
    if recorrente.frequencia == "Mensal":
        return True
    if recorrente.frequencia == "Trimestral":
        return (mes - mes_inicio) % 3 == 0
    if recorrente.frequencia == "Semestral":
        return (mes - mes_inicio) % 6 == 0
    if recorrente.frequencia == "Anual":
        return mes == mes_inicio
    return False


def gerar_cobranca_recorrente(
    db: Session,
    recorrente: ContaRecorrente,
    referencia: date | None = None,
) -> ContaReceber | None:
    if not recorrente.ativo:
        return None

    hoje = referencia or date.today()
    if not deve_gerar_no_mes(recorrente, hoje.year, hoje.month):
        return None

    ref = referencia_mes_de(hoje)
    existente = (
        db.query(ContaReceber)
        .filter(
            ContaReceber.recorrente_id == recorrente.id,
            ContaReceber.referencia_mes == ref,
        )
        .first()
    )
    if existente:
        return None

    vencimento = data_vencimento_no_mes(hoje.year, hoje.month, recorrente.dia_vencimento)
    conta = ContaReceber(
        cliente=recorrente.cliente,
        descricao=recorrente.descricao,
        valor=round(recorrente.valor, 2),
        data_vencimento=vencimento,
        status="pendente",
        recorrente_id=recorrente.id,
        referencia_mes=ref,
        observacao=recorrente.observacao,
    )
    db.add(conta)
    db.flush()
    return conta


def registrar_baixa_conta(conta: ContaReceber, forma_pagamento: str) -> None:
    conta.status = "recebido"
    conta.forma_pagamento = forma_pagamento
    conta.data_recebimento = datetime.now()
