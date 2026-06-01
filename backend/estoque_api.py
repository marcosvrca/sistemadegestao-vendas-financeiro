from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import desc, or_
from sqlalchemy.orm import Session

from database import get_db
from estoque_utils import normalizar_nome_produto, registrar_movimentacao
from models import MovimentacaoEstoque, Produto
from nfe_xml_import import (
    extrair_xml_de_arquivo,
    importar_itens_nfe_para_estoque,
    parsear_xml_nfe,
)
from schemas import (
    CATEGORIAS_PRODUTO,
    EstoqueResumo,
    ImportacaoNFeItemResultado,
    ImportacaoNFeResultado,
    MovimentacaoEstoqueCreate,
    MovimentacaoEstoqueResponse,
    ProdutoCreate,
    ProdutoOpcao,
    ProdutoResponse,
    ProdutoUpdate,
)

router = APIRouter(prefix="/api/estoque", tags=["estoque"])


def status_estoque(produto: Produto) -> str:
    if produto.estoque_atual <= 0:
        return "zerado"
    if produto.estoque_minimo > 0 and produto.estoque_atual <= produto.estoque_minimo:
        return "baixo"
    return "ok"


def produto_para_response(produto: Produto) -> ProdutoResponse:
    return ProdutoResponse(
        id=produto.id,
        nome=produto.nome,
        nome_normalizado=produto.nome_normalizado,
        categoria=produto.categoria,
        preco_venda=produto.preco_venda,
        estoque_atual=produto.estoque_atual,
        estoque_minimo=produto.estoque_minimo,
        unidade=produto.unidade,
        ativo=produto.ativo,
        observacao=produto.observacao,
        criado_em=produto.criado_em,
        atualizado_em=produto.atualizado_em,
        status_estoque=status_estoque(produto),
    )


@router.get("/categorias")
def listar_categorias_produto():
    return CATEGORIAS_PRODUTO


@router.get("/resumo", response_model=EstoqueResumo)
def resumo_estoque(db: Session = Depends(get_db)):
    produtos = db.query(Produto).all()
    ativos = [p for p in produtos if p.ativo]
    baixo = [p for p in ativos if status_estoque(p) == "baixo"]
    zerado = [p for p in ativos if status_estoque(p) == "zerado"]
    valor_total = sum(p.preco_venda * p.estoque_atual for p in ativos)
    unidades = sum(p.estoque_atual for p in ativos)

    return EstoqueResumo(
        total_produtos=len(produtos),
        produtos_ativos=len(ativos),
        produtos_estoque_baixo=len(baixo),
        produtos_sem_estoque=len(zerado),
        valor_total_estoque=round(valor_total, 2),
        total_unidades=unidades,
    )


@router.get("/opcoes", response_model=list[ProdutoOpcao])
def listar_opcoes_produto(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    apenas_ativos: bool = Query(default=True),
    limite: int = Query(default=100, ge=1, le=500),
):
    query = db.query(Produto)
    if apenas_ativos:
        query = query.filter(Produto.ativo.is_(True))
    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            or_(Produto.nome.ilike(termo), Produto.categoria.ilike(termo))
        )
    produtos = query.order_by(Produto.nome).limit(limite).all()
    return [
        ProdutoOpcao(
            id=p.id,
            nome=p.nome,
            preco_venda=p.preco_venda,
            estoque_atual=p.estoque_atual,
            categoria=p.categoria,
        )
        for p in produtos
    ]


@router.get("/produtos", response_model=list[ProdutoResponse])
def listar_produtos(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    categoria: str | None = Query(default=None),
    estoque_baixo: bool = Query(default=False),
    sem_estoque: bool = Query(default=False),
    apenas_ativos: bool = Query(default=True),
    limite: int = Query(default=200, ge=1, le=500),
):
    query = db.query(Produto)

    if apenas_ativos:
        query = query.filter(Produto.ativo.is_(True))
    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            or_(Produto.nome.ilike(termo), Produto.categoria.ilike(termo))
        )
    if categoria:
        query = query.filter(Produto.categoria == categoria)

    produtos = query.order_by(Produto.nome).limit(limite).all()

    if estoque_baixo:
        produtos = [p for p in produtos if status_estoque(p) == "baixo"]
    if sem_estoque:
        produtos = [p for p in produtos if status_estoque(p) == "zerado"]

    return [produto_para_response(p) for p in produtos]


@router.get("/produtos/{produto_id}", response_model=ProdutoResponse)
def obter_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return produto_para_response(produto)


@router.post("/produtos", response_model=ProdutoResponse, status_code=201)
def criar_produto(dados: ProdutoCreate, db: Session = Depends(get_db)):
    chave = normalizar_nome_produto(dados.nome)
    if db.query(Produto).filter(Produto.nome_normalizado == chave).first():
        raise HTTPException(status_code=400, detail="Já existe um produto com este nome")

    nome_limpo = " ".join(dados.nome.strip().split())
    estoque_inicial = dados.estoque_atual
    produto = Produto(
        nome=nome_limpo,
        nome_normalizado=chave,
        categoria=dados.categoria,
        preco_venda=round(dados.preco_venda, 2),
        estoque_atual=0,
        estoque_minimo=dados.estoque_minimo,
        unidade=dados.unidade,
        ativo=dados.ativo,
        observacao=dados.observacao,
    )
    db.add(produto)
    db.flush()

    if estoque_inicial > 0:
        registrar_movimentacao(
            db,
            produto,
            "entrada",
            estoque_inicial,
            observacao="Estoque inicial",
        )

    db.commit()
    db.refresh(produto)
    return produto_para_response(produto)


@router.put("/produtos/{produto_id}", response_model=ProdutoResponse)
def atualizar_produto(
    produto_id: int,
    dados: ProdutoUpdate,
    db: Session = Depends(get_db),
):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")

    campos = dados.model_dump(exclude_unset=True)
    if "nome" in campos:
        chave = normalizar_nome_produto(campos["nome"])
        existente = (
            db.query(Produto)
            .filter(Produto.nome_normalizado == chave, Produto.id != produto_id)
            .first()
        )
        if existente:
            raise HTTPException(status_code=400, detail="Já existe um produto com este nome")
        produto.nome = " ".join(campos["nome"].strip().split())
        produto.nome_normalizado = chave
        del campos["nome"]

    for campo, valor in campos.items():
        if campo == "preco_venda" and valor is not None:
            valor = round(valor, 2)
        setattr(produto, campo, valor)

    produto.atualizado_em = datetime.now()
    db.commit()
    db.refresh(produto)
    return produto_para_response(produto)


@router.delete("/produtos/{produto_id}", status_code=204)
def excluir_produto(produto_id: int, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    tem_mov = (
        db.query(MovimentacaoEstoque)
        .filter(MovimentacaoEstoque.produto_id == produto_id)
        .first()
    )
    if tem_mov:
        produto.ativo = False
        produto.atualizado_em = datetime.now()
        db.commit()
    else:
        db.delete(produto)
        db.commit()


@router.get("/movimentacoes", response_model=list[MovimentacaoEstoqueResponse])
def listar_movimentacoes(
    db: Session = Depends(get_db),
    produto_id: int | None = Query(default=None),
    tipo: str | None = Query(default=None),
    limite: int = Query(default=100, ge=1, le=500),
):
    query = db.query(MovimentacaoEstoque).join(Produto)

    if produto_id:
        query = query.filter(MovimentacaoEstoque.produto_id == produto_id)
    if tipo:
        query = query.filter(MovimentacaoEstoque.tipo == tipo)

    movs = (
        query.order_by(desc(MovimentacaoEstoque.data))
        .limit(limite)
        .all()
    )

    return [
        MovimentacaoEstoqueResponse(
            id=m.id,
            produto_id=m.produto_id,
            produto_nome=m.produto.nome,
            tipo=m.tipo,
            quantidade=m.quantidade,
            estoque_anterior=m.estoque_anterior,
            estoque_posterior=m.estoque_posterior,
            venda_id=m.venda_id,
            observacao=m.observacao,
            data=m.data,
        )
        for m in movs
    ]


@router.post("/importar-xml", response_model=ImportacaoNFeResultado)
async def importar_xml_nfe(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    atualizar_preco: bool = Query(default=False),
    criar_inexistentes: bool = Query(default=True),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="Nenhum arquivo enviado.")

    conteudo = await file.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")

    xml_bytes = extrair_xml_de_arquivo(conteudo, file.filename)
    meta, itens = parsear_xml_nfe(xml_bytes)

    processados, erros = importar_itens_nfe_para_estoque(
        db,
        meta,
        itens,
        atualizar_preco=atualizar_preco,
        criar_inexistentes=criar_inexistentes,
    )

    if processados:
        db.commit()
    else:
        db.rollback()
        if not erros:
            raise HTTPException(status_code=400, detail="Nenhum item foi importado.")

    criados = sum(1 for p in processados if p.acao == "criado_entrada")
    total_unidades = sum(p.quantidade for p in processados)

    return ImportacaoNFeResultado(
        nota_numero=meta.numero,
        nota_serie=meta.serie,
        emitente=meta.emitente,
        itens_processados=len(processados),
        produtos_criados=criados,
        total_unidades=total_unidades,
        itens=[
            ImportacaoNFeItemResultado(
                numero_item=p.numero_item,
                produto=p.produto,
                quantidade=p.quantidade,
                acao=p.acao,
                produto_id=p.produto_id,
                estoque_posterior=p.estoque_posterior,
            )
            for p in processados
        ],
        erros=erros,
    )


@router.post("/movimentacoes", response_model=MovimentacaoEstoqueResponse, status_code=201)
def registrar_movimentacao_manual(
    dados: MovimentacaoEstoqueCreate,
    db: Session = Depends(get_db),
):
    produto = db.query(Produto).filter(Produto.id == dados.produto_id).first()
    if not produto:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    if not produto.ativo:
        raise HTTPException(status_code=400, detail="Produto inativo")

    if dados.tipo == "ajuste":
        mov = registrar_movimentacao(
            db,
            produto,
            "ajuste",
            dados.quantidade,
            observacao=dados.observacao or "Ajuste manual",
        )
    else:
        mov = registrar_movimentacao(
            db,
            produto,
            dados.tipo,
            dados.quantidade,
            observacao=dados.observacao,
        )

    db.commit()
    db.refresh(mov)
    db.refresh(produto)

    return MovimentacaoEstoqueResponse(
        id=mov.id,
        produto_id=mov.produto_id,
        produto_nome=produto.nome,
        tipo=mov.tipo,
        quantidade=mov.quantidade,
        estoque_anterior=mov.estoque_anterior,
        estoque_posterior=mov.estoque_posterior,
        venda_id=mov.venda_id,
        observacao=mov.observacao,
        data=mov.data,
    )
