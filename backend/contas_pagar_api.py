from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from contas_pagar_utils import (
    gerar_conta_pagar_recorrente,
    referencia_mes_de,
    registrar_baixa_conta_pagar,
)
from database import get_db
from models import ContaPagar, ContaPagarRecorrente
from schemas import (
    ContaPagarBaixa,
    ContaPagarCreate,
    ContaPagarRecorrenteCreate,
    ContaPagarRecorrenteResponse,
    ContaPagarRecorrenteUpdate,
    ContaPagarResponse,
    ContaPagarUpdate,
    ContasPagarResumo,
    GerarContasPagarResultado,
)

router = APIRouter(tags=["contas-pagar"])


@router.get("/api/contas-pagar/resumo", response_model=ContasPagarResumo)
def resumo_contas_pagar(db: Session = Depends(get_db)):
    hoje = date.today()
    pendentes = db.query(ContaPagar).filter(ContaPagar.status == "pendente").all()
    vencidas = [c for c in pendentes if c.data_vencimento < hoje]
    dda = [c for c in pendentes if c.is_dda]

    return ContasPagarResumo(
        quantidade_pendente=len(pendentes),
        total_pendente=round(sum(c.valor for c in pendentes), 2),
        quantidade_dda=len(dda),
        total_dda=round(sum(c.valor for c in dda), 2),
        quantidade_vencidas=len(vencidas),
        total_vencidas=round(sum(c.valor for c in vencidas), 2),
    )


@router.get("/api/contas-pagar", response_model=list[ContaPagarResponse])
def listar_contas_pagar(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    status: str | None = Query(default=None),
    is_dda: bool | None = Query(default=None),
    recorrente_id: int | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(ContaPagar)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (ContaPagar.fornecedor.ilike(termo))
            | (ContaPagar.descricao.ilike(termo))
            | (ContaPagar.observacao.ilike(termo))
            | (ContaPagar.linha_digitavel.ilike(termo))
        )

    if status:
        query = query.filter(ContaPagar.status == status)

    if is_dda is not None:
        query = query.filter(ContaPagar.is_dda == is_dda)

    if recorrente_id is not None:
        query = query.filter(ContaPagar.recorrente_id == recorrente_id)

    return query.order_by(desc(ContaPagar.data_vencimento)).limit(limite).all()


@router.get("/api/contas-pagar/{conta_id}", response_model=ContaPagarResponse)
def obter_conta_pagar(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(ContaPagar).filter(ContaPagar.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    return conta


@router.post("/api/contas-pagar", response_model=ContaPagarResponse, status_code=201)
def criar_conta_pagar(dados: ContaPagarCreate, db: Session = Depends(get_db)):
    conta = ContaPagar(
        fornecedor=dados.fornecedor.strip(),
        descricao=dados.descricao.strip(),
        categoria=dados.categoria,
        valor=round(dados.valor, 2),
        data_vencimento=dados.data_vencimento,
        status="pendente",
        is_dda=dados.is_dda,
        linha_digitavel=dados.linha_digitavel,
        observacao=dados.observacao,
    )
    db.add(conta)
    db.commit()
    db.refresh(conta)
    return conta


@router.put("/api/contas-pagar/{conta_id}", response_model=ContaPagarResponse)
def atualizar_conta_pagar(
    conta_id: int,
    dados: ContaPagarUpdate,
    db: Session = Depends(get_db),
):
    conta = db.query(ContaPagar).filter(ContaPagar.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    if conta.status == "pago":
        raise HTTPException(status_code=400, detail="Conta já paga não pode ser editada")

    campos = dados.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        setattr(conta, campo, valor)

    db.commit()
    db.refresh(conta)
    return conta


@router.post("/api/contas-pagar/{conta_id}/baixa", response_model=ContaPagarResponse)
def baixar_conta_pagar(
    conta_id: int,
    dados: ContaPagarBaixa,
    db: Session = Depends(get_db),
):
    conta = db.query(ContaPagar).filter(ContaPagar.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    if conta.status == "pago":
        raise HTTPException(status_code=400, detail="Conta já foi paga")

    registrar_baixa_conta_pagar(db, conta, dados.forma_pagamento)
    db.commit()
    db.refresh(conta)
    return conta


@router.delete("/api/contas-pagar/{conta_id}", status_code=204)
def excluir_conta_pagar(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(ContaPagar).filter(ContaPagar.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a pagar não encontrada")
    if conta.status == "pago":
        raise HTTPException(status_code=400, detail="Conta paga não pode ser excluída")
    db.delete(conta)
    db.commit()


@router.get("/api/contas-pagar-recorrentes", response_model=list[ContaPagarRecorrenteResponse])
def listar_contas_pagar_recorrentes(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    limite: int = Query(default=100, ge=1, le=500),
):
    query = db.query(ContaPagarRecorrente)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (ContaPagarRecorrente.fornecedor.ilike(termo))
            | (ContaPagarRecorrente.descricao.ilike(termo))
        )

    if ativo is not None:
        query = query.filter(ContaPagarRecorrente.ativo == ativo)

    return query.order_by(desc(ContaPagarRecorrente.ativo), ContaPagarRecorrente.fornecedor).limit(limite).all()


@router.post(
    "/api/contas-pagar-recorrentes",
    response_model=ContaPagarRecorrenteResponse,
    status_code=201,
)
def criar_conta_pagar_recorrente(dados: ContaPagarRecorrenteCreate, db: Session = Depends(get_db)):
    recorrente = ContaPagarRecorrente(
        fornecedor=dados.fornecedor.strip(),
        descricao=dados.descricao.strip(),
        categoria=dados.categoria,
        valor=round(dados.valor, 2),
        dia_vencimento=dados.dia_vencimento,
        frequencia=dados.frequencia,
        ativo=dados.ativo,
        is_dda=dados.is_dda,
        observacao=dados.observacao,
    )
    db.add(recorrente)
    db.commit()
    db.refresh(recorrente)
    return recorrente


@router.put(
    "/api/contas-pagar-recorrentes/{recorrente_id}",
    response_model=ContaPagarRecorrenteResponse,
)
def atualizar_conta_pagar_recorrente(
    recorrente_id: int,
    dados: ContaPagarRecorrenteUpdate,
    db: Session = Depends(get_db),
):
    recorrente = (
        db.query(ContaPagarRecorrente).filter(ContaPagarRecorrente.id == recorrente_id).first()
    )
    if not recorrente:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")

    campos = dados.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        setattr(recorrente, campo, valor)

    db.commit()
    db.refresh(recorrente)
    return recorrente


@router.delete("/api/contas-pagar-recorrentes/{recorrente_id}", status_code=204)
def excluir_conta_pagar_recorrente(recorrente_id: int, db: Session = Depends(get_db)):
    recorrente = (
        db.query(ContaPagarRecorrente).filter(ContaPagarRecorrente.id == recorrente_id).first()
    )
    if not recorrente:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")
    db.delete(recorrente)
    db.commit()


@router.post(
    "/api/contas-pagar-recorrentes/{recorrente_id}/gerar-conta",
    response_model=ContaPagarResponse,
    status_code=201,
)
def gerar_conta_de_recorrente(recorrente_id: int, db: Session = Depends(get_db)):
    recorrente = (
        db.query(ContaPagarRecorrente).filter(ContaPagarRecorrente.id == recorrente_id).first()
    )
    if not recorrente:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")
    if not recorrente.ativo:
        raise HTTPException(status_code=400, detail="Conta recorrente está inativa")

    conta = gerar_conta_pagar_recorrente(db, recorrente)
    if not conta:
        ref = referencia_mes_de(date.today())
        existente = (
            db.query(ContaPagar)
            .filter(
                ContaPagar.recorrente_id == recorrente_id,
                ContaPagar.referencia_mes == ref,
            )
            .first()
        )
        if existente:
            raise HTTPException(
                status_code=409,
                detail="Conta deste mês já foi gerada para esta recorrente",
            )
        raise HTTPException(
            status_code=400,
            detail="Esta conta recorrente não gera título neste mês (verifique a frequência)",
        )

    db.commit()
    db.refresh(conta)
    return conta


@router.post("/api/contas-pagar-recorrentes/gerar-contas-mes", response_model=GerarContasPagarResultado)
def gerar_contas_do_mes(db: Session = Depends(get_db)):
    recorrentes = db.query(ContaPagarRecorrente).filter(ContaPagarRecorrente.ativo.is_(True)).all()
    geradas: list[ContaPagar] = []
    ignoradas = 0

    for recorrente in recorrentes:
        conta = gerar_conta_pagar_recorrente(db, recorrente)
        if conta:
            geradas.append(conta)
        else:
            ignoradas += 1

    db.commit()
    for conta in geradas:
        db.refresh(conta)

    return GerarContasPagarResultado(
        geradas=len(geradas),
        ignoradas=ignoradas,
        contas=geradas,
    )
