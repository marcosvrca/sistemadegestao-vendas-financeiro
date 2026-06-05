from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import get_db
from models import Pedido
from schemas import PedidoCreate, PedidoResponse, PedidoUpdate, PedidosResumo, STATUS_PEDIDO

router = APIRouter(tags=["pedidos"])


def _pedidos_ativos(query):
    return query.filter(Pedido.status.in_(("pendente", "em_andamento")))


@router.get("/api/pedidos/resumo", response_model=PedidosResumo)
def resumo_pedidos(db: Session = Depends(get_db)):
    hoje = date.today()
    pedidos = db.query(Pedido).all()

    pendentes = [p for p in pedidos if p.status == "pendente"]
    em_andamento = [p for p in pedidos if p.status == "em_andamento"]
    finalizados = [p for p in pedidos if p.status == "finalizado"]
    atrasados = [
        p for p in pedidos
        if p.status in ("pendente", "em_andamento") and p.data_prevista < hoje
    ]

    return PedidosResumo(
        quantidade_pendente=len(pendentes),
        total_pendente=round(sum(p.valor for p in pendentes), 2),
        quantidade_em_andamento=len(em_andamento),
        total_em_andamento=round(sum(p.valor for p in em_andamento), 2),
        quantidade_finalizado=len(finalizados),
        total_finalizado=round(sum(p.valor for p in finalizados), 2),
        quantidade_atrasados=len(atrasados),
        total_atrasados=round(sum(p.valor for p in atrasados), 2),
    )


@router.get("/api/pedidos", response_model=list[PedidoResponse])
def listar_pedidos(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    status: str | None = Query(default=None),
    tipo: str | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(Pedido)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (Pedido.dados.ilike(termo))
            | (Pedido.tipo.ilike(termo))
            | (Pedido.observacao.ilike(termo))
        )

    if status:
        if status == "ativo":
            query = _pedidos_ativos(query)
        elif status in STATUS_PEDIDO:
            query = query.filter(Pedido.status == status)
        else:
            raise HTTPException(status_code=400, detail="Status inválido")

    if tipo:
        query = query.filter(Pedido.tipo.ilike(f"%{tipo}%"))

    pedidos = query.order_by(desc(Pedido.data_prevista), desc(Pedido.id)).limit(limite).all()
    return pedidos


@router.get("/api/pedidos/{pedido_id}", response_model=PedidoResponse)
def obter_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    return pedido


@router.post("/api/pedidos", response_model=PedidoResponse, status_code=201)
def criar_pedido(dados: PedidoCreate, db: Session = Depends(get_db)):
    pedido = Pedido(
        dados=dados.dados.strip(),
        tipo=dados.tipo.strip(),
        valor=round(dados.valor, 2),
        data_prevista=dados.data_prevista,
        observacao=dados.observacao.strip() if dados.observacao else None,
        status="pendente",
    )
    db.add(pedido)
    db.commit()
    db.refresh(pedido)
    return pedido


@router.put("/api/pedidos/{pedido_id}", response_model=PedidoResponse)
def atualizar_pedido(pedido_id: int, dados: PedidoUpdate, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if dados.dados is not None:
        pedido.dados = dados.dados.strip()
    if dados.tipo is not None:
        pedido.tipo = dados.tipo.strip()
    if dados.valor is not None:
        pedido.valor = round(dados.valor, 2)
    if dados.data_prevista is not None:
        pedido.data_prevista = dados.data_prevista
    if dados.observacao is not None:
        pedido.observacao = dados.observacao.strip() or None
    if dados.status is not None:
        pedido.status = dados.status
        if dados.status == "finalizado" and pedido.finalizado_em is None:
            pedido.finalizado_em = datetime.now()
        elif dados.status != "finalizado":
            pedido.finalizado_em = None

    db.commit()
    db.refresh(pedido)
    return pedido


@router.post("/api/pedidos/{pedido_id}/finalizar", response_model=PedidoResponse)
def finalizar_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")

    if pedido.status == "finalizado":
        raise HTTPException(status_code=400, detail="Pedido já está finalizado")
    if pedido.status == "cancelado":
        raise HTTPException(status_code=400, detail="Pedido cancelado não pode ser finalizado")

    pedido.status = "finalizado"
    pedido.finalizado_em = datetime.now()
    db.commit()
    db.refresh(pedido)
    return pedido


@router.delete("/api/pedidos/{pedido_id}", status_code=204)
def excluir_pedido(pedido_id: int, db: Session = Depends(get_db)):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido:
        raise HTTPException(status_code=404, detail="Pedido não encontrado")
    db.delete(pedido)
    db.commit()
