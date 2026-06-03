"""Configurações globais do módulo de estoque."""

from sqlalchemy.orm import Session

from models import Configuracao

CHAVE_PERMITIR_ESTOQUE_INSUFICIENTE = "estoque.permitir_insuficiente"


def obter_permitir_estoque_insuficiente(db: Session) -> bool:
    row = (
        db.query(Configuracao)
        .filter(Configuracao.chave == CHAVE_PERMITIR_ESTOQUE_INSUFICIENTE)
        .first()
    )
    if not row:
        return False
    return row.valor.strip().lower() in ("1", "true", "sim", "yes", "on")


def definir_permitir_estoque_insuficiente(db: Session, valor: bool) -> bool:
    row = (
        db.query(Configuracao)
        .filter(Configuracao.chave == CHAVE_PERMITIR_ESTOQUE_INSUFICIENTE)
        .first()
    )
    texto = "true" if valor else "false"
    if row:
        row.valor = texto
    else:
        db.add(Configuracao(chave=CHAVE_PERMITIR_ESTOQUE_INSUFICIENTE, valor=texto))
    db.commit()
    return valor
