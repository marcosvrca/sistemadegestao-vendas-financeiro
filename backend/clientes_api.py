from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from documento_utils import formatar_documento, limpar_documento, tipo_documento, validar_documento
from models import Cliente
from schemas import ClienteCreate, ClienteResponse, ClienteUpdate

router = APIRouter(tags=["clientes"])


def resolver_documento(documento: str | None) -> tuple[str | None, str | None]:
    bruto = (documento or "").strip()
    if not bruto:
        return None, None
    try:
        doc = validar_documento(bruto)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return doc, tipo_documento(doc)


def serializar_cliente(cliente: Cliente) -> ClienteResponse:
    doc_fmt = formatar_documento(cliente.documento) if cliente.documento else None
    return ClienteResponse(
        id=cliente.id,
        nome=cliente.nome,
        documento=cliente.documento,
        tipo_documento=cliente.tipo_documento,
        documento_formatado=doc_fmt,
        telefone=cliente.telefone,
        email=cliente.email,
        ativo=cliente.ativo,
        observacao=cliente.observacao,
        criado_em=cliente.criado_em,
    )


@router.get("/api/clientes", response_model=list[ClienteResponse])
def listar_clientes(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    documento: str | None = Query(default=None),
    ativo: bool | None = Query(default=None),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(Cliente)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (Cliente.nome.ilike(termo))
            | (Cliente.email.ilike(termo))
            | (Cliente.telefone.ilike(termo))
        )

    if documento:
        doc = limpar_documento(documento)
        if doc:
            query = query.filter(Cliente.documento.like(f"%{doc}%"))

    if ativo is not None:
        query = query.filter(Cliente.ativo == ativo)

    clientes = query.order_by(Cliente.nome).limit(limite).all()
    return [serializar_cliente(c) for c in clientes]


@router.post("/api/clientes", response_model=ClienteResponse, status_code=201)
def criar_cliente(dados: ClienteCreate, db: Session = Depends(get_db)):
    documento, tipo_doc = resolver_documento(dados.documento)
    if documento:
        existente = db.query(Cliente).filter(Cliente.documento == documento).first()
        if existente:
            raise HTTPException(status_code=409, detail="Já existe cliente com este CPF/CNPJ")

    cliente = Cliente(
        nome=dados.nome.strip(),
        documento=documento,
        tipo_documento=tipo_doc,
        telefone=dados.telefone.strip() if dados.telefone and dados.telefone.strip() else None,
        email=dados.email.strip() if dados.email and dados.email.strip() else None,
        ativo=dados.ativo,
        observacao=dados.observacao,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return serializar_cliente(cliente)


@router.put("/api/clientes/{cliente_id}", response_model=ClienteResponse)
def atualizar_cliente(cliente_id: int, dados: ClienteUpdate, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    campos = dados.model_dump(exclude_unset=True)
    if "documento" in campos:
        bruto = campos.pop("documento")
        if bruto is None or not str(bruto).strip():
            cliente.documento = None
            cliente.tipo_documento = None
        else:
            documento, tipo_doc = resolver_documento(str(bruto))
            if documento:
                outro = (
                    db.query(Cliente)
                    .filter(Cliente.documento == documento, Cliente.id != cliente_id)
                    .first()
                )
                if outro:
                    raise HTTPException(status_code=409, detail="Já existe cliente com este CPF/CNPJ")
            cliente.documento = documento
            cliente.tipo_documento = tipo_doc

    for campo, valor in campos.items():
        if campo in ("telefone", "email") and isinstance(valor, str):
            setattr(cliente, campo, valor.strip() or None)
        elif campo == "nome" and isinstance(valor, str):
            setattr(cliente, campo, valor.strip())
        else:
            setattr(cliente, campo, valor)

    db.commit()
    db.refresh(cliente)
    return serializar_cliente(cliente)


@router.delete("/api/clientes/{cliente_id}", status_code=204)
def excluir_cliente(cliente_id: int, db: Session = Depends(get_db)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    db.delete(cliente)
    db.commit()
