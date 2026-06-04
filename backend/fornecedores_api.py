from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from documento_utils import formatar_documento, limpar_documento, validar_documento
from models import Configuracao, Fornecedor
from schemas import (
    DdaConfigResponse,
    DdaConfigUpdate,
    FornecedorCreate,
    FornecedorResponse,
    FornecedorUpdate,
)

router = APIRouter(tags=["fornecedores"])

CHAVE_DDA_CNPJ = "dda_pagador_cnpj"
CHAVE_DDA_CPF = "dda_pagador_cpf"


def serializar_fornecedor(fornecedor: Fornecedor) -> FornecedorResponse:
    return FornecedorResponse(
        id=fornecedor.id,
        nome=fornecedor.nome,
        documento=fornecedor.documento,
        tipo_documento=fornecedor.tipo_documento,
        documento_formatado=formatar_documento(fornecedor.documento),
        ativo=fornecedor.ativo,
        observacao=fornecedor.observacao,
        criado_em=fornecedor.criado_em,
    )


def obter_config(db: Session, chave: str) -> str | None:
    registro = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    return registro.valor if registro else None


def salvar_config(db: Session, chave: str, valor: str | None) -> None:
    registro = db.query(Configuracao).filter(Configuracao.chave == chave).first()
    if valor:
        if registro:
            registro.valor = valor
        else:
            db.add(Configuracao(chave=chave, valor=valor))
    elif registro:
        db.delete(registro)


@router.get("/api/fornecedores", response_model=list[FornecedorResponse])
def listar_fornecedores(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    documento: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(Fornecedor)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (Fornecedor.nome.ilike(termo)) | (Fornecedor.documento.ilike(termo))
        )

    if documento:
        doc = limpar_documento(documento)
        if doc:
            query = query.filter(Fornecedor.documento.like(f"%{doc}%"))

    if ativo is not None:
        query = query.filter(Fornecedor.ativo == ativo)

    fornecedores = query.order_by(Fornecedor.nome).limit(limite).all()
    return [serializar_fornecedor(f) for f in fornecedores]


@router.get("/api/fornecedores/{fornecedor_id}", response_model=FornecedorResponse)
def obter_fornecedor(fornecedor_id: int, db: Session = Depends(get_db)):
    fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    return serializar_fornecedor(fornecedor)


@router.post("/api/fornecedores", response_model=FornecedorResponse, status_code=201)
def criar_fornecedor(dados: FornecedorCreate, db: Session = Depends(get_db)):
    try:
        documento = validar_documento(dados.documento)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    existente = db.query(Fornecedor).filter(Fornecedor.documento == documento).first()
    if existente:
        raise HTTPException(status_code=409, detail="Já existe fornecedor com este CPF/CNPJ")

    from documento_utils import tipo_documento

    fornecedor = Fornecedor(
        nome=dados.nome.strip(),
        documento=documento,
        tipo_documento=tipo_documento(documento),
        ativo=dados.ativo,
        observacao=dados.observacao,
    )
    db.add(fornecedor)
    db.commit()
    db.refresh(fornecedor)
    return serializar_fornecedor(fornecedor)


@router.put("/api/fornecedores/{fornecedor_id}", response_model=FornecedorResponse)
def atualizar_fornecedor(
    fornecedor_id: int,
    dados: FornecedorUpdate,
    db: Session = Depends(get_db),
):
    fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")

    campos = dados.model_dump(exclude_unset=True)
    if "documento" in campos and campos["documento"] is not None:
        try:
            documento = validar_documento(campos["documento"])
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        outro = (
            db.query(Fornecedor)
            .filter(Fornecedor.documento == documento, Fornecedor.id != fornecedor_id)
            .first()
        )
        if outro:
            raise HTTPException(status_code=409, detail="Já existe fornecedor com este CPF/CNPJ")
        from documento_utils import tipo_documento

        fornecedor.documento = documento
        fornecedor.tipo_documento = tipo_documento(documento)
        del campos["documento"]

    for campo, valor in campos.items():
        if campo == "nome" and isinstance(valor, str):
            setattr(fornecedor, campo, valor.strip())
        else:
            setattr(fornecedor, campo, valor)

    db.commit()
    db.refresh(fornecedor)
    return serializar_fornecedor(fornecedor)


@router.delete("/api/fornecedores/{fornecedor_id}", status_code=204)
def excluir_fornecedor(fornecedor_id: int, db: Session = Depends(get_db)):
    fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
    if not fornecedor:
        raise HTTPException(status_code=404, detail="Fornecedor não encontrado")
    db.delete(fornecedor)
    db.commit()


@router.get("/api/dda/config", response_model=DdaConfigResponse)
def obter_dda_config(db: Session = Depends(get_db)):
    cnpj = obter_config(db, CHAVE_DDA_CNPJ)
    cpf = obter_config(db, CHAVE_DDA_CPF)
    return DdaConfigResponse(
        cnpj_pagador=cnpj,
        cpf_pagador=cpf,
        cnpj_pagador_formatado=formatar_documento(cnpj) if cnpj else None,
        cpf_pagador_formatado=formatar_documento(cpf) if cpf else None,
    )


@router.put("/api/dda/config", response_model=DdaConfigResponse)
def atualizar_dda_config(dados: DdaConfigUpdate, db: Session = Depends(get_db)):
    cnpj = None
    cpf = None

    if dados.cnpj_pagador is not None:
        bruto = dados.cnpj_pagador.strip()
        if bruto:
            try:
                cnpj = validar_documento(bruto)
                if len(cnpj) != 14:
                    raise ValueError("CNPJ deve ter 14 dígitos")
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
        salvar_config(db, CHAVE_DDA_CNPJ, cnpj)

    if dados.cpf_pagador is not None:
        bruto = dados.cpf_pagador.strip()
        if bruto:
            try:
                cpf = validar_documento(bruto)
                if len(cpf) != 11:
                    raise ValueError("CPF deve ter 11 dígitos")
            except ValueError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
        salvar_config(db, CHAVE_DDA_CPF, cpf)

    db.commit()
    return obter_dda_config(db)
