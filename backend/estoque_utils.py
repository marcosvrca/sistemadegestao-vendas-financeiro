from datetime import datetime

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from models import ItemVenda, MovimentacaoEstoque, Produto

TIPOS_ENTRADA = {"entrada", "estorno_venda", "ajuste"}
TIPOS_SAIDA = {"saida", "venda", "ajuste"}


def normalizar_nome_produto(nome: str) -> str:
    return " ".join(nome.strip().split()).lower()


def buscar_produto_por_nome(db: Session, nome: str) -> Produto | None:
    chave = normalizar_nome_produto(nome)
    if not chave:
        return None
    return db.query(Produto).filter(Produto.nome_normalizado == chave).first()


def registrar_movimentacao(
    db: Session,
    produto: Produto,
    tipo: str,
    quantidade: int,
    *,
    venda_id: int | None = None,
    observacao: str | None = None,
    permitir_negativo: bool = False,
) -> MovimentacaoEstoque:
    if quantidade <= 0:
        raise HTTPException(status_code=400, detail="Quantidade deve ser maior que zero")

    estoque_anterior = produto.estoque_atual

    if tipo in TIPOS_ENTRADA and tipo != "ajuste":
        estoque_posterior = estoque_anterior + quantidade
    elif tipo in TIPOS_SAIDA and tipo != "ajuste":
        estoque_posterior = estoque_anterior - quantidade
    elif tipo == "ajuste":
        estoque_posterior = quantidade
        quantidade = abs(estoque_posterior - estoque_anterior)
    else:
        raise HTTPException(status_code=400, detail=f"Tipo de movimentação inválido: {tipo}")

    if estoque_posterior < 0 and not permitir_negativo:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Estoque insuficiente para '{produto.nome}'. "
                f"Disponível: {estoque_anterior}, solicitado: {quantidade}"
            ),
        )

    produto.estoque_atual = estoque_posterior
    produto.atualizado_em = datetime.now()

    mov = MovimentacaoEstoque(
        produto_id=produto.id,
        tipo=tipo,
        quantidade=quantidade,
        estoque_anterior=estoque_anterior,
        estoque_posterior=estoque_posterior,
        venda_id=venda_id,
        observacao=observacao,
    )
    db.add(mov)
    return mov


def obter_ou_criar_produto(
    db: Session,
    nome: str,
    valor_unitario: float | None = None,
) -> Produto:
    existente = buscar_produto_por_nome(db, nome)
    if existente:
        return existente

    nome_limpo = " ".join(nome.strip().split())
    produto = Produto(
        nome=nome_limpo,
        nome_normalizado=normalizar_nome_produto(nome_limpo),
        preco_venda=valor_unitario or 0.0,
        estoque_atual=0,
    )
    db.add(produto)
    db.flush()
    return produto


def aplicar_itens_venda_estoque(
    db: Session,
    itens: list[ItemVenda],
    venda_id: int,
    *,
    permitir_negativo: bool = False,
) -> None:
    for item in itens:
        produto = buscar_produto_por_nome(db, item.produto)
        if not produto:
            produto = obter_ou_criar_produto(db, item.produto, item.valor_unitario)
        registrar_movimentacao(
            db,
            produto,
            "venda",
            item.quantidade,
            venda_id=venda_id,
            observacao=f"Venda #{venda_id}",
            permitir_negativo=permitir_negativo,
        )


def estornar_itens_venda_estoque(
    db: Session,
    itens: list[ItemVenda],
    venda_id: int,
) -> None:
    for item in itens:
        produto = buscar_produto_por_nome(db, item.produto)
        if not produto:
            continue
        registrar_movimentacao(
            db,
            produto,
            "estorno_venda",
            item.quantidade,
            venda_id=venda_id,
            observacao=f"Estorno venda #{venda_id}",
            permitir_negativo=True,
        )


def sincronizar_estoque_venda(
    db: Session,
    itens_antigos: list[ItemVenda],
    itens_novos: list[ItemVenda],
    venda_id: int,
    *,
    permitir_negativo: bool = False,
) -> None:
    if itens_antigos:
        estornar_itens_venda_estoque(db, itens_antigos, venda_id)
    if itens_novos:
        aplicar_itens_venda_estoque(
            db,
            itens_novos,
            venda_id,
            permitir_negativo=permitir_negativo,
        )


def seed_produtos_de_vendas(db: Session) -> int:
    """Cria produtos a partir dos nomes já vendidos (estoque inicial zero)."""
    nomes = (
        db.query(ItemVenda.produto, func.avg(ItemVenda.valor_unitario))
        .group_by(ItemVenda.produto)
        .all()
    )
    vistos: set[str] = set()
    criados = 0
    for nome, preco_medio in nomes:
        if not nome:
            continue
        nome_limpo = " ".join(nome.strip().split())
        chave = normalizar_nome_produto(nome_limpo)
        if not chave or chave in vistos or buscar_produto_por_nome(db, nome_limpo):
            continue
        vistos.add(chave)
        db.add(
            Produto(
                nome=nome_limpo,
                nome_normalizado=chave,
                preco_venda=round(float(preco_medio or 0), 2),
                estoque_atual=0,
            )
        )
        criados += 1
    if criados:
        db.commit()
    return criados
