from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import Categoria
from schemas import CATEGORIAS_PRODUTO, CATEGORIAS_SAIDA

TIPO_CATEGORIA_PRODUTO = "produto"
TIPO_CATEGORIA_SAIDA = "saida"


def garantir_categorias_padrao(db: Session) -> None:
    if db.query(Categoria).count() > 0:
        return

    for nome in CATEGORIAS_SAIDA:
        db.add(Categoria(nome=nome, tipo=TIPO_CATEGORIA_SAIDA, ativo=True))
    for nome in CATEGORIAS_PRODUTO:
        db.add(Categoria(nome=nome, tipo=TIPO_CATEGORIA_PRODUTO, ativo=True))
    db.commit()


def listar_nomes_categorias(db: Session, tipo: str, incluir_inativas: bool = False) -> list[str]:
    query = db.query(Categoria).filter(Categoria.tipo == tipo)
    if not incluir_inativas:
        query = query.filter(Categoria.ativo.is_(True))
    return sorted({c.nome for c in query.all()})


def assert_categoria_valida(db: Session, tipo: str, nome: str) -> str:
    nome = nome.strip()
    if not nome:
        raise HTTPException(status_code=400, detail="Informe a categoria")
    validas = listar_nomes_categorias(db, tipo)
    if nome not in validas:
        raise HTTPException(
            status_code=400,
            detail=f"Categoria inválida. Opções: {', '.join(validas)}",
        )
    return nome
