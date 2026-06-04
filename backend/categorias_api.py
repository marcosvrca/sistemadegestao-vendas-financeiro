from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from categorias_utils import (
    TIPO_CATEGORIA_PRODUTO,
    TIPO_CATEGORIA_SAIDA,
    listar_nomes_categorias,
)
from database import get_db
from models import Categoria
from schemas import CategoriaCreate, CategoriaResponse, CategoriaUpdate

router = APIRouter(tags=["categorias"])


@router.get("/api/categorias", response_model=list[CategoriaResponse])
def listar_categorias(
    db: Session = Depends(get_db),
    tipo: str | None = Query(default=None),
    busca: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(Categoria)

    if tipo:
        if tipo not in (TIPO_CATEGORIA_PRODUTO, TIPO_CATEGORIA_SAIDA):
            raise HTTPException(status_code=400, detail="Tipo deve ser produto ou saida")
        query = query.filter(Categoria.tipo == tipo)

    if busca:
        query = query.filter(Categoria.nome.ilike(f"%{busca}%"))

    if ativo is not None:
        query = query.filter(Categoria.ativo == ativo)

    return query.order_by(Categoria.tipo, Categoria.nome).limit(limite).all()


@router.get("/api/categorias-saida")
def listar_categorias_saida(db: Session = Depends(get_db)):
    return listar_nomes_categorias(db, TIPO_CATEGORIA_SAIDA)


@router.get("/api/categorias-produto")
def listar_categorias_produto(db: Session = Depends(get_db)):
    return listar_nomes_categorias(db, TIPO_CATEGORIA_PRODUTO)


@router.post("/api/categorias", response_model=CategoriaResponse, status_code=201)
def criar_categoria(dados: CategoriaCreate, db: Session = Depends(get_db)):
    nome = dados.nome.strip()
    existente = (
        db.query(Categoria)
        .filter(Categoria.nome == nome, Categoria.tipo == dados.tipo)
        .first()
    )
    if existente:
        raise HTTPException(status_code=409, detail="Categoria já cadastrada para este tipo")

    categoria = Categoria(nome=nome, tipo=dados.tipo, ativo=dados.ativo)
    db.add(categoria)
    db.commit()
    db.refresh(categoria)
    return categoria


@router.put("/api/categorias/{categoria_id}", response_model=CategoriaResponse)
def atualizar_categoria(
    categoria_id: int,
    dados: CategoriaUpdate,
    db: Session = Depends(get_db),
):
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")

    campos = dados.model_dump(exclude_unset=True)
    novo_nome = campos.get("nome", categoria.nome)
    novo_tipo = campos.get("tipo", categoria.tipo)
    if isinstance(novo_nome, str):
        novo_nome = novo_nome.strip()

    if "nome" in campos or "tipo" in campos:
        outra = (
            db.query(Categoria)
            .filter(
                Categoria.nome == novo_nome,
                Categoria.tipo == novo_tipo,
                Categoria.id != categoria_id,
            )
            .first()
        )
        if outra:
            raise HTTPException(status_code=409, detail="Categoria já cadastrada para este tipo")

    for campo, valor in campos.items():
        if campo == "nome" and isinstance(valor, str):
            setattr(categoria, campo, valor.strip())
        else:
            setattr(categoria, campo, valor)

    db.commit()
    db.refresh(categoria)
    return categoria


@router.delete("/api/categorias/{categoria_id}", status_code=204)
def excluir_categoria(categoria_id: int, db: Session = Depends(get_db)):
    categoria = db.query(Categoria).filter(Categoria.id == categoria_id).first()
    if not categoria:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    db.delete(categoria)
    db.commit()
