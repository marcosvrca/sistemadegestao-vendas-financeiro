"""Regras de negócio para contas a pagar e recorrentes."""

from calendar import monthrange
from datetime import date, datetime

from sqlalchemy.orm import Session

from models import ContaPagar, ContaPagarRecorrente, Fornecedor, Saida


def referencia_mes_de(data: date) -> str:
    return f"{data.year:04d}-{data.month:02d}"


def data_vencimento_no_mes(ano: int, mes: int, dia: int) -> date:
    ultimo_dia = monthrange(ano, mes)[1]
    return date(ano, mes, min(dia, ultimo_dia))


def mes_inicio_recorrente(recorrente: ContaPagarRecorrente) -> int:
    return recorrente.criado_em.month


def deve_gerar_no_mes(recorrente: ContaPagarRecorrente, ano: int, mes: int) -> bool:
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


def gerar_conta_pagar_recorrente(
    db: Session,
    recorrente: ContaPagarRecorrente,
    referencia: date | None = None,
) -> ContaPagar | None:
    if not recorrente.ativo:
        return None

    hoje = referencia or date.today()
    if not deve_gerar_no_mes(recorrente, hoje.year, hoje.month):
        return None

    ref = referencia_mes_de(hoje)
    existente = (
        db.query(ContaPagar)
        .filter(
            ContaPagar.recorrente_id == recorrente.id,
            ContaPagar.referencia_mes == ref,
        )
        .first()
    )
    if existente:
        return None

    vencimento = data_vencimento_no_mes(hoje.year, hoje.month, recorrente.dia_vencimento)
    documento_benef = None
    if recorrente.fornecedor_id:
        fornecedor = db.query(Fornecedor).filter(Fornecedor.id == recorrente.fornecedor_id).first()
        if fornecedor:
            documento_benef = fornecedor.documento
    conta = ContaPagar(
        fornecedor=recorrente.fornecedor,
        descricao=recorrente.descricao,
        categoria=recorrente.categoria,
        valor=round(recorrente.valor, 2),
        data_vencimento=vencimento,
        status="pendente",
        is_dda=recorrente.is_dda,
        recorrente_id=recorrente.id,
        referencia_mes=ref,
        fornecedor_id=recorrente.fornecedor_id,
        documento_beneficiario=documento_benef,
        observacao=recorrente.observacao,
    )
    db.add(conta)
    db.flush()
    return conta


def registrar_baixa_conta_pagar(
    db: Session,
    conta: ContaPagar,
    forma_pagamento: str,
) -> Saida:
    agora = datetime.now()
    saida = Saida(
        data=agora,
        descricao=conta.descricao,
        categoria=conta.categoria,
        valor=round(conta.valor, 2),
        forma_pagamento=forma_pagamento,
        observacao=conta.observacao,
    )
    db.add(saida)
    db.flush()

    conta.status = "pago"
    conta.forma_pagamento = forma_pagamento
    conta.data_pagamento = agora
    conta.saida_id = saida.id
    return saida
