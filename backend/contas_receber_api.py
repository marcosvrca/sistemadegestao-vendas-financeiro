from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from contas_receber_utils import (
    gerar_cobranca_recorrente,
    referencia_mes_de,
    registrar_baixa_conta,
)
from database import get_db
from models import ContaReceber, ContaRecorrente, Venda
from schemas import (
    FORMA_PAGAMENTO_AV,
    FREQUENCIAS_RECORRENTE,
    ContaReceberBaixa,
    ContaReceberCreate,
    ContaReceberResponse,
    ContaReceberUpdate,
    ContaRecorrenteCreate,
    ContaRecorrenteResponse,
    ContaRecorrenteUpdate,
    ContasReceberResumo,
    GerarCobrancasResultado,
)

router = APIRouter(tags=["contas-receber"])


@router.get("/api/frequencias-recorrente")
def listar_frequencias_recorrente():
    return FREQUENCIAS_RECORRENTE


@router.get("/api/contas-receber/resumo", response_model=ContasReceberResumo)
def resumo_contas_receber(db: Session = Depends(get_db)):
    vendas_av = db.query(Venda).filter(Venda.forma_pagamento == FORMA_PAGAMENTO_AV).all()
    contas = db.query(ContaReceber).filter(ContaReceber.status == "pendente").all()

    total_av = sum(v.valor for v in vendas_av)
    total_contas = sum(c.valor for c in contas)

    return ContasReceberResumo(
        quantidade_av=len(vendas_av),
        total_av=round(total_av, 2),
        quantidade_contas=len(contas),
        total_contas=round(total_contas, 2),
        quantidade_total=len(vendas_av) + len(contas),
        total_geral=round(total_av + total_contas, 2),
    )


@router.get("/api/contas-receber", response_model=list[ContaReceberResponse])
def listar_contas_receber(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    status: str | None = Query(default=None),
    recorrente_id: int | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(ContaReceber)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (ContaReceber.cliente.ilike(termo))
            | (ContaReceber.descricao.ilike(termo))
            | (ContaReceber.observacao.ilike(termo))
        )

    if status:
        query = query.filter(ContaReceber.status == status)

    if recorrente_id is not None:
        query = query.filter(ContaReceber.recorrente_id == recorrente_id)

    return query.order_by(desc(ContaReceber.data_vencimento)).limit(limite).all()


@router.get("/api/contas-receber/{conta_id}", response_model=ContaReceberResponse)
def obter_conta_receber(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(ContaReceber).filter(ContaReceber.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a receber não encontrada")
    return conta


@router.post("/api/contas-receber", response_model=ContaReceberResponse, status_code=201)
def criar_conta_receber(dados: ContaReceberCreate, db: Session = Depends(get_db)):
    conta = ContaReceber(
        cliente=dados.cliente.strip(),
        descricao=dados.descricao.strip(),
        valor=round(dados.valor, 2),
        data_vencimento=dados.data_vencimento,
        status="pendente",
        observacao=dados.observacao,
    )
    db.add(conta)
    db.commit()
    db.refresh(conta)
    return conta


@router.put("/api/contas-receber/{conta_id}", response_model=ContaReceberResponse)
def atualizar_conta_receber(
    conta_id: int,
    dados: ContaReceberUpdate,
    db: Session = Depends(get_db),
):
    conta = db.query(ContaReceber).filter(ContaReceber.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a receber não encontrada")
    if conta.status == "recebido":
        raise HTTPException(status_code=400, detail="Conta já recebida não pode ser editada")

    campos = dados.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        setattr(conta, campo, valor)

    db.commit()
    db.refresh(conta)
    return conta


@router.post("/api/contas-receber/{conta_id}/baixa", response_model=ContaReceberResponse)
def baixar_conta_receber(
    conta_id: int,
    dados: ContaReceberBaixa,
    db: Session = Depends(get_db),
):
    conta = db.query(ContaReceber).filter(ContaReceber.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a receber não encontrada")
    if conta.status == "recebido":
        raise HTTPException(status_code=400, detail="Conta já foi recebida")

    registrar_baixa_conta(conta, dados.forma_pagamento)
    db.commit()
    db.refresh(conta)
    return conta


@router.delete("/api/contas-receber/{conta_id}", status_code=204)
def excluir_conta_receber(conta_id: int, db: Session = Depends(get_db)):
    conta = db.query(ContaReceber).filter(ContaReceber.id == conta_id).first()
    if not conta:
        raise HTTPException(status_code=404, detail="Conta a receber não encontrada")
    if conta.status == "recebido":
        raise HTTPException(status_code=400, detail="Conta recebida não pode ser excluída")
    db.delete(conta)
    db.commit()


@router.get("/api/contas-recorrentes", response_model=list[ContaRecorrenteResponse])
def listar_contas_recorrentes(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    limite: int = Query(default=100, ge=1, le=500),
):
    query = db.query(ContaRecorrente)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (ContaRecorrente.cliente.ilike(termo))
            | (ContaRecorrente.descricao.ilike(termo))
        )

    if ativo is not None:
        query = query.filter(ContaRecorrente.ativo == ativo)

    return query.order_by(desc(ContaRecorrente.ativo), ContaRecorrente.cliente).limit(limite).all()


@router.post("/api/contas-recorrentes", response_model=ContaRecorrenteResponse, status_code=201)
def criar_conta_recorrente(dados: ContaRecorrenteCreate, db: Session = Depends(get_db)):
    recorrente = ContaRecorrente(
        cliente=dados.cliente.strip(),
        descricao=dados.descricao.strip(),
        valor=round(dados.valor, 2),
        dia_vencimento=dados.dia_vencimento,
        frequencia=dados.frequencia,
        ativo=dados.ativo,
        observacao=dados.observacao,
    )
    db.add(recorrente)
    db.commit()
    db.refresh(recorrente)
    return recorrente


@router.put("/api/contas-recorrentes/{recorrente_id}", response_model=ContaRecorrenteResponse)
def atualizar_conta_recorrente(
    recorrente_id: int,
    dados: ContaRecorrenteUpdate,
    db: Session = Depends(get_db),
):
    recorrente = db.query(ContaRecorrente).filter(ContaRecorrente.id == recorrente_id).first()
    if not recorrente:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")

    campos = dados.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        setattr(recorrente, campo, valor)

    db.commit()
    db.refresh(recorrente)
    return recorrente


@router.delete("/api/contas-recorrentes/{recorrente_id}", status_code=204)
def excluir_conta_recorrente(recorrente_id: int, db: Session = Depends(get_db)):
    recorrente = db.query(ContaRecorrente).filter(ContaRecorrente.id == recorrente_id).first()
    if not recorrente:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")
    db.delete(recorrente)
    db.commit()


@router.post(
    "/api/contas-recorrentes/{recorrente_id}/gerar-cobranca",
    response_model=ContaReceberResponse,
    status_code=201,
)
def gerar_cobranca_de_recorrente(recorrente_id: int, db: Session = Depends(get_db)):
    recorrente = db.query(ContaRecorrente).filter(ContaRecorrente.id == recorrente_id).first()
    if not recorrente:
        raise HTTPException(status_code=404, detail="Conta recorrente não encontrada")
    if not recorrente.ativo:
        raise HTTPException(status_code=400, detail="Conta recorrente está inativa")

    conta = gerar_cobranca_recorrente(db, recorrente)
    if not conta:
        ref = referencia_mes_de(date.today())
        existente = (
            db.query(ContaReceber)
            .filter(
                ContaReceber.recorrente_id == recorrente_id,
                ContaReceber.referencia_mes == ref,
            )
            .first()
        )
        if existente:
            raise HTTPException(
                status_code=409,
                detail="Cobrança deste mês já foi gerada para esta conta recorrente",
            )
        raise HTTPException(
            status_code=400,
            detail="Esta conta recorrente não gera cobrança neste mês (verifique a frequência)",
        )

    db.commit()
    db.refresh(conta)
    return conta


@router.post("/api/contas-recorrentes/gerar-cobrancas-mes", response_model=GerarCobrancasResultado)
def gerar_cobrancas_do_mes(db: Session = Depends(get_db)):
    recorrentes = db.query(ContaRecorrente).filter(ContaRecorrente.ativo.is_(True)).all()
    geradas: list[ContaReceber] = []
    ignoradas = 0

    for recorrente in recorrentes:
        conta = gerar_cobranca_recorrente(db, recorrente)
        if conta:
            geradas.append(conta)
        else:
            ignoradas += 1

    db.commit()
    for conta in geradas:
        db.refresh(conta)

    return GerarCobrancasResultado(
        geradas=len(geradas),
        ignoradas=ignoradas,
        contas=geradas,
    )
