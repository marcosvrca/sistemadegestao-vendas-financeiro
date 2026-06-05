from datetime import date, datetime
from io import BytesIO
from typing import Literal

from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from sqlalchemy import desc, extract, func, text
from sqlalchemy.orm import Session, joinedload

from database import engine, get_db, migrar_banco
from excel_import import CAMPOS_OBRIGATORIOS, CAMPOS_OPCIONAIS, parsear_planilha
from models import CaixaDiario, ItemVenda, Saida, Venda
from schemas import (
    DashboardKPIs,
    FORMAS_PAGAMENTO,
    FORMAS_PAGAMENTO_VENDA,
    FORMA_PAGAMENTO_AV,
    ImportacaoErro,
    ImportacaoIgnorada,
    ImportacaoResultado,
    ItemVendaCreate,
    SaidaCreate,
    SaidaPorCategoria,
    SaidaPorPeriodo,
    SaidaResponse,
    SaidaUpdate,
    MediaVendaResponse,
    ConfrontarPeriodosResponse,
    TopItem,
    VendaCreate,
    VendaPorFormaPagamento,
    VendaPorPeriodo,
    VendaResponse,
    VendaUpdate,
    VendaAVResumo,
    VendasAVPendentes,
    CaixaAberturaCreate,
    CaixaDiarioListItem,
    CaixaDiarioResponse,
    CaixaFechamentoCreate,
    CaixaResumoSistema,
)
from caixa_utils import calcular_resumo_sistema, calcular_saldo_esperado
from categorias_utils import TIPO_CATEGORIA_SAIDA, assert_categoria_valida
from dashboard_filtros import (
    FiltrosDashboard,
    agrupar_registros_por_periodo,
    filtrar_saidas,
    filtrar_vendas,
    ids_vendas_filtradas,
    montar_filtros_dashboard,
)
from dashboard_confrontar import confrontar_periodos, obter_melhor_dia
from av_utils import registrar_quitacao_av
from venda_utils import calcular_valor_item, normalizar_data_venda, sincronizar_cabecalho
from estoque_api import router as estoque_router
from contas_receber_api import router as contas_receber_router
from contas_pagar_api import router as contas_pagar_router
from fornecedores_api import router as fornecedores_router
from clientes_api import router as clientes_router
from categorias_api import router as categorias_router
from pedidos_api import router as pedidos_router
from estoque_utils import (
    aplicar_itens_venda_estoque,
    estornar_itens_venda_estoque,
    sincronizar_estoque_venda,
)
from estoque_config import obter_permitir_estoque_insuficiente

migrar_banco()

app = FastAPI(title="Recanto da Fé - Sistema de Vendas")
app.include_router(estoque_router)
app.include_router(contas_receber_router)
app.include_router(contas_pagar_router)
app.include_router(fornecedores_router)
app.include_router(clientes_router)
app.include_router(categorias_router)
app.include_router(pedidos_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def criar_itens_venda(venda_id: int, itens: list[ItemVendaCreate]) -> list[ItemVenda]:
    itens_criados = []
    for item in itens:
        valor = calcular_valor_item(item.quantidade, item.valor_unitario, item.desconto)
        itens_criados.append(
            ItemVenda(
                venda_id=venda_id,
                produto=item.produto,
                quantidade=item.quantidade,
                valor_unitario=item.valor_unitario,
                desconto=item.desconto,
                valor=valor,
            )
        )
    return itens_criados


@app.get("/api/formas-pagamento")
def listar_formas_pagamento():
    return FORMAS_PAGAMENTO


@app.get("/api/formas-pagamento-venda")
def listar_formas_pagamento_venda():
    return FORMAS_PAGAMENTO_VENDA


@app.get("/api/vendas", response_model=list[VendaResponse])
def listar_vendas(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    forma_pagamento: str | None = Query(default=None),
    data_inicio: datetime | None = Query(default=None),
    data_fim: datetime | None = Query(default=None),
    limite: int = Query(default=100, ge=1, le=500),
):
    query = db.query(Venda).options(joinedload(Venda.itens))

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (Venda.produto.ilike(termo))
            | (Venda.cliente.ilike(termo))
            | Venda.itens.any(ItemVenda.produto.ilike(termo))
        )

    if forma_pagamento:
        query = query.filter(Venda.forma_pagamento == forma_pagamento)

    if data_inicio:
        query = query.filter(Venda.data >= data_inicio)

    if data_fim:
        query = query.filter(Venda.data <= data_fim)

    return query.order_by(desc(Venda.data)).limit(limite).all()


@app.get("/api/vendas/importar/modelo")
def baixar_modelo_excel():
    wb = Workbook()
    ws = wb.active
    ws.title = "Vendas"
    ws.append(
        [
            "id",
            "data",
            "produto",
            "quantidade",
            "valor",
            "desconto",
            "forma_pag",
            "valor_recebido",
            "troco",
            "cliente",
            "observacao",
        ]
    )
    ws.append([1, "31/05/2026", "Terço de madeira", 2, 112.80, 0, "Dinheiro", 150.00, 37.20, "Maria Silva", ""])
    ws.append([2, "30/05/2026", "Vela aromática", 1, 25.50, 2.50, "Pix", "", "", "João Santos", "Cliente fiel"])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=modelo_vendas_recanto_da_fe.xlsx"},
    )


@app.get("/api/vendas/importar/colunas")
def colunas_importacao():
    return {
        "obrigatorias": CAMPOS_OBRIGATORIOS,
        "opcionais": CAMPOS_OPCIONAIS,
        "formas_pagamento": FORMAS_PAGAMENTO_VENDA,
    }


@app.post("/api/vendas/importar-excel", response_model=ImportacaoResultado)
async def importar_excel(
    file: UploadFile = File(...),
    substituir_duplicados: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    if not file.filename or not file.filename.lower().endswith((".xlsx", ".xlsm", ".xltx")):
        raise HTTPException(
            status_code=400,
            detail="Envie um arquivo Excel (.xlsx). Arquivos .xls antigos não são suportados.",
        )

    conteudo = await file.read()
    if not conteudo:
        raise HTTPException(status_code=400, detail="Arquivo vazio")

    try:
        vendas_planilha, erros_parse, mapeamento = parsear_planilha(conteudo)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    importadas = 0
    ignoradas = 0
    detalhes_ignoradas: list[ImportacaoIgnorada] = []

    for item in vendas_planilha:
        venda_id = item.pop("id", None)
        linha = item.pop("linha")

        existente = None
        if venda_id is not None:
            existente = db.query(Venda).filter(Venda.id == venda_id).first()

        if existente:
            if substituir_duplicados:
                campos_cabecalho = (
                    "data",
                    "cliente",
                    "forma_pagamento",
                    "troco",
                    "valor_recebido",
                    "observacao",
                )
                for campo in campos_cabecalho:
                    if campo in item:
                        setattr(existente, campo, item[campo])
                db.query(ItemVenda).filter(ItemVenda.venda_id == existente.id).delete()
                novo_item = ItemVenda(
                    venda_id=existente.id,
                    produto=item["produto"],
                    quantidade=item["quantidade"],
                    valor_unitario=item["valor_unitario"],
                    desconto=item["desconto"],
                    valor=item["valor"],
                )
                db.add(novo_item)
                db.flush()
                sincronizar_cabecalho(existente, [novo_item])
                importadas += 1
            else:
                ignoradas += 1
                detalhes_ignoradas.append(
                    ImportacaoIgnorada(
                        linha=linha,
                        id=venda_id,
                        produto=item.get("produto"),
                        motivo=f"ID #{venda_id} já existe no sistema",
                    )
                )
            continue

        nova = Venda(
            data=item["data"],
            produto=item["produto"],
            cliente=item["cliente"],
            quantidade=item["quantidade"],
            valor_unitario=item["valor_unitario"],
            desconto=item["desconto"],
            valor=item["valor"],
            forma_pagamento=item["forma_pagamento"],
            troco=item.get("troco"),
            valor_recebido=item.get("valor_recebido"),
            observacao=item.get("observacao"),
        )
        if venda_id is not None:
            nova.id = venda_id
        db.add(nova)
        db.flush()
        db.add(
            ItemVenda(
                venda_id=nova.id,
                produto=item["produto"],
                quantidade=item["quantidade"],
                valor_unitario=item["valor_unitario"],
                desconto=item["desconto"],
                valor=item["valor"],
            )
        )
        importadas += 1

    if importadas:
        db.flush()
        max_id = db.query(func.max(Venda.id)).scalar() or 0
        try:
            existe = db.execute(
                text("SELECT 1 FROM sqlite_sequence WHERE name = 'vendas'")
            ).fetchone()
            if existe:
                db.execute(
                    text("UPDATE sqlite_sequence SET seq = :seq WHERE name = 'vendas'"),
                    {"seq": max_id},
                )
            else:
                db.execute(
                    text("INSERT INTO sqlite_sequence (name, seq) VALUES ('vendas', :seq)"),
                    {"seq": max_id},
                )
        except Exception:
            pass

    db.commit()

    return ImportacaoResultado(
        importadas=importadas,
        ignoradas=ignoradas,
        erros=[ImportacaoErro(**e) for e in erros_parse],
        detalhes_ignoradas=detalhes_ignoradas,
        colunas_detectadas=sorted(mapeamento.keys()),
    )


@app.get("/api/vendas/{venda_id}", response_model=VendaResponse)
def obter_venda(venda_id: int, db: Session = Depends(get_db)):
    venda = (
        db.query(Venda)
        .options(joinedload(Venda.itens))
        .filter(Venda.id == venda_id)
        .first()
    )
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return venda


@app.post("/api/vendas", response_model=VendaResponse, status_code=201)
def criar_venda(venda: VendaCreate, db: Session = Depends(get_db)):
    nova_venda = Venda(
        data=normalizar_data_venda(venda.data),
        produto="",
        cliente=venda.cliente,
        quantidade=0,
        valor_unitario=0,
        desconto=0,
        valor=0,
        forma_pagamento=venda.forma_pagamento,
        troco=venda.troco,
        valor_recebido=venda.valor_recebido,
        parcelas=venda.parcelas,
        observacao=venda.observacao,
        promocao_id=venda.promocao_id,
        promocao_nome=venda.promocao_nome,
    )
    db.add(nova_venda)
    db.flush()

    itens = criar_itens_venda(nova_venda.id, venda.itens)
    db.add_all(itens)
    db.flush()
    sincronizar_cabecalho(nova_venda, itens)

    aplicar_itens_venda_estoque(
        db,
        itens,
        nova_venda.id,
        permitir_negativo=obter_permitir_estoque_insuficiente(db),
    )

    db.commit()
    db.refresh(nova_venda)
    return nova_venda


@app.put("/api/vendas/{venda_id}", response_model=VendaResponse)
def atualizar_venda(venda_id: int, dados: VendaUpdate, db: Session = Depends(get_db)):
    venda = (
        db.query(Venda)
        .options(joinedload(Venda.itens))
        .filter(Venda.id == venda_id)
        .first()
    )
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")

    forma_anterior = venda.forma_pagamento
    itens_antigos = list(venda.itens) if venda.itens else []

    campos = dados.model_dump(exclude_unset=True, exclude={"itens", "produto", "quantidade", "valor_unitario", "desconto"})
    if "data" in campos:
        campos["data"] = normalizar_data_venda(campos["data"])
    for campo, valor in campos.items():
        setattr(venda, campo, valor)

    if "forma_pagamento" in campos:
        registrar_quitacao_av(venda, forma_anterior)

    if dados.itens is not None:
        db.query(ItemVenda).filter(ItemVenda.venda_id == venda_id).delete()
        itens = criar_itens_venda(venda_id, dados.itens)
        db.add_all(itens)
        db.flush()
        sincronizar_cabecalho(venda, itens)
        sincronizar_estoque_venda(
            db,
            itens_antigos,
            itens,
            venda_id,
            permitir_negativo=obter_permitir_estoque_insuficiente(db),
        )
    elif any(
        getattr(dados, campo) is not None
        for campo in ("produto", "quantidade", "valor_unitario", "desconto")
    ):
        if venda.itens:
            item = venda.itens[0]
            if dados.produto is not None:
                item.produto = dados.produto
            if dados.quantidade is not None:
                item.quantidade = dados.quantidade
            if dados.valor_unitario is not None:
                item.valor_unitario = dados.valor_unitario
            if dados.desconto is not None:
                item.desconto = dados.desconto
            item.valor = calcular_valor_item(item.quantidade, item.valor_unitario, item.desconto)
            sincronizar_cabecalho(venda, venda.itens)

    db.commit()
    db.refresh(venda)
    return venda


@app.delete("/api/vendas/{venda_id}", status_code=204)
def excluir_venda(venda_id: int, db: Session = Depends(get_db)):
    venda = (
        db.query(Venda)
        .options(joinedload(Venda.itens))
        .filter(Venda.id == venda_id)
        .first()
    )
    if not venda:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    if venda.itens:
        estornar_itens_venda_estoque(db, list(venda.itens), venda_id)
    db.delete(venda)
    db.commit()


@app.get("/api/dashboard/kpis", response_model=DashboardKPIs)
def obter_kpis(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
):
    vendas = filtrar_vendas(db.query(Venda), filtros).all()
    total_vendas = sum(v.valor for v in vendas)
    quantidade_vendas = len(vendas)
    total_descontos = sum(v.desconto for v in vendas)
    ticket_medio = total_vendas / quantidade_vendas if quantidade_vendas else 0.0

    venda_ids = [v.id for v in vendas]
    if venda_ids:
        total_itens = (
            db.query(func.coalesce(func.sum(ItemVenda.quantidade), 0))
            .filter(ItemVenda.venda_id.in_(venda_ids))
            .scalar()
            or 0
        )
    else:
        total_itens = 0

    saidas = filtrar_saidas(db.query(Saida), filtros).all()
    total_saidas = sum(s.valor for s in saidas)
    quantidade_saidas = len(saidas)
    saldo = total_vendas - total_saidas

    melhor = obter_melhor_dia(vendas)

    return DashboardKPIs(
        total_vendas=round(total_vendas, 2),
        quantidade_vendas=quantidade_vendas,
        ticket_medio=round(ticket_medio, 2),
        total_descontos=round(total_descontos, 2),
        total_itens=total_itens,
        total_saidas=round(total_saidas, 2),
        quantidade_saidas=quantidade_saidas,
        saldo=round(saldo, 2),
        descricao_periodo=filtros.periodo.descricao,
        melhor_dia=melhor["data"],
        melhor_dia_total=melhor["total"],
        melhor_dia_quantidade=melhor["quantidade"],
        vendas_hoje=round(total_vendas, 2),
        vendas_mes=round(total_vendas, 2),
        crescimento_mes=0,
        saidas_hoje=round(total_saidas, 2),
        saidas_mes=round(total_saidas, 2),
        saldo_mes=round(saldo, 2),
    )


@app.get("/api/dashboard/media-venda", response_model=MediaVendaResponse)
def media_venda(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
):
    vendas = filtrar_vendas(db.query(Venda), filtros).all()
    quantidade = len(vendas)
    total = sum(v.valor for v in vendas)
    media = total / quantidade if quantidade else 0.0

    return MediaVendaResponse(
        media=round(media, 2),
        total=round(total, 2),
        quantidade=quantidade,
        descricao_periodo=filtros.periodo.descricao,
    )


@app.get("/api/dashboard/produtos-vendidos")
def listar_produtos_vendidos(db: Session = Depends(get_db)):
    resultados = (
        db.query(ItemVenda.produto)
        .distinct()
        .order_by(ItemVenda.produto)
        .all()
    )
    return [r[0] for r in resultados]


@app.get("/api/dashboard/vendas-periodo", response_model=list[VendaPorPeriodo])
def vendas_por_periodo(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
    granularidade: Literal["dia", "semana", "mes"] = Query(default="dia", alias="periodo"),
):
    vendas = filtrar_vendas(db.query(Venda), filtros).order_by(Venda.data).all()
    agrupado = agrupar_registros_por_periodo(vendas, granularidade)

    return [
        VendaPorPeriodo(
            periodo=chave,
            total=round(dados["total"], 2),
            quantidade=dados["quantidade"],
        )
        for chave, dados in sorted(agrupado.items())
    ]


@app.get("/api/dashboard/formas-pagamento", response_model=list[VendaPorFormaPagamento])
def vendas_por_forma_pagamento(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
):
    vendas = filtrar_vendas(db.query(Venda), filtros).all()
    agrupado: dict[str, dict[str, float | int]] = {}
    for venda in vendas:
        if venda.forma_pagamento not in agrupado:
            agrupado[venda.forma_pagamento] = {"total": 0.0, "quantidade": 0}
        agrupado[venda.forma_pagamento]["total"] += venda.valor
        agrupado[venda.forma_pagamento]["quantidade"] += 1

    return [
        VendaPorFormaPagamento(
            forma_pagamento=forma,
            total=round(dados["total"], 2),
            quantidade=dados["quantidade"],
        )
        for forma, dados in sorted(agrupado.items(), key=lambda x: x[1]["total"], reverse=True)
    ]


@app.get("/api/dashboard/top-produtos", response_model=list[TopItem])
def top_produtos(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
    limite: int = Query(default=5, ge=1, le=20),
):
    venda_ids = ids_vendas_filtradas(db, filtros)
    if not venda_ids:
        return []

    resultados = (
        db.query(
            ItemVenda.produto,
            func.sum(ItemVenda.valor),
            func.sum(ItemVenda.quantidade),
        )
        .filter(ItemVenda.venda_id.in_(venda_ids))
        .group_by(ItemVenda.produto)
        .order_by(desc(func.sum(ItemVenda.valor)))
        .limit(limite)
        .all()
    )

    return [
        TopItem(nome=produto, total=round(total or 0.0, 2), quantidade=quantidade or 0)
        for produto, total, quantidade in resultados
    ]


@app.get("/api/dashboard/top-clientes", response_model=list[TopItem])
def top_clientes(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
    limite: int = Query(default=5, ge=1, le=20),
):
    vendas = filtrar_vendas(db.query(Venda), filtros).all()
    agrupado: dict[str, dict[str, float | int]] = {}
    for venda in vendas:
        if venda.cliente not in agrupado:
            agrupado[venda.cliente] = {"total": 0.0, "quantidade": 0}
        agrupado[venda.cliente]["total"] += venda.valor
        agrupado[venda.cliente]["quantidade"] += 1

    top = sorted(agrupado.items(), key=lambda x: x[1]["total"], reverse=True)[:limite]
    return [
        TopItem(nome=cliente, total=round(dados["total"], 2), quantidade=dados["quantidade"])
        for cliente, dados in top
    ]


@app.get("/api/dashboard/vendas-mes-atual")
def vendas_mes_atual(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
):
    vendas = filtrar_vendas(db.query(Venda), filtros).all()
    agrupado: dict[int, float] = {}
    for venda in vendas:
        dia = venda.data.day
        agrupado[dia] = agrupado.get(dia, 0.0) + venda.valor

    return [{"dia": dia, "total": round(total, 2)} for dia, total in sorted(agrupado.items())]


@app.get("/api/dashboard/vendas-av-pendentes", response_model=VendasAVPendentes)
def vendas_av_pendentes(db: Session = Depends(get_db)):
    vendas = (
        db.query(Venda)
        .filter(Venda.forma_pagamento == FORMA_PAGAMENTO_AV)
        .order_by(desc(Venda.data))
        .all()
    )
    total = sum(v.valor for v in vendas)
    return VendasAVPendentes(
        quantidade=len(vendas),
        total=round(total, 2),
        vendas=[
            VendaAVResumo(
                id=v.id,
                data=v.data,
                cliente=v.cliente,
                produto=v.produto,
                valor=round(v.valor, 2),
            )
            for v in vendas
        ],
    )


@app.get("/api/dashboard/confrontar", response_model=ConfrontarPeriodosResponse)
def confrontar_dados(
    db: Session = Depends(get_db),
    data_a_inicio: datetime = Query(...),
    data_a_fim: datetime = Query(...),
    data_b_inicio: datetime = Query(...),
    data_b_fim: datetime = Query(...),
):
    if data_a_inicio > data_a_fim:
        raise HTTPException(status_code=400, detail="Período A: data inicial deve ser anterior à final")
    if data_b_inicio > data_b_fim:
        raise HTTPException(status_code=400, detail="Período B: data inicial deve ser anterior à final")

    return confrontar_periodos(db, data_a_inicio, data_a_fim, data_b_inicio, data_b_fim)


@app.get("/api/saidas", response_model=list[SaidaResponse])
def listar_saidas(
    db: Session = Depends(get_db),
    busca: str | None = Query(default=None),
    categoria: str | None = Query(default=None),
    limite: int = Query(default=100, ge=1, le=500),
):
    query = db.query(Saida)

    if busca:
        termo = f"%{busca}%"
        query = query.filter(
            (Saida.descricao.ilike(termo)) | (Saida.observacao.ilike(termo))
        )

    if categoria:
        query = query.filter(Saida.categoria == categoria)

    return query.order_by(desc(Saida.data)).limit(limite).all()


@app.get("/api/saidas/{saida_id}", response_model=SaidaResponse)
def obter_saida(saida_id: int, db: Session = Depends(get_db)):
    saida = db.query(Saida).filter(Saida.id == saida_id).first()
    if not saida:
        raise HTTPException(status_code=404, detail="Saída não encontrada")
    return saida


@app.post("/api/saidas", response_model=SaidaResponse, status_code=201)
def criar_saida(saida: SaidaCreate, db: Session = Depends(get_db)):
    categoria = assert_categoria_valida(db, TIPO_CATEGORIA_SAIDA, saida.categoria)
    nova = Saida(
        data=normalizar_data_venda(saida.data),
        descricao=saida.descricao,
        categoria=categoria,
        valor=round(saida.valor, 2),
        forma_pagamento=saida.forma_pagamento,
        observacao=saida.observacao,
    )
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@app.put("/api/saidas/{saida_id}", response_model=SaidaResponse)
def atualizar_saida(saida_id: int, dados: SaidaUpdate, db: Session = Depends(get_db)):
    saida = db.query(Saida).filter(Saida.id == saida_id).first()
    if not saida:
        raise HTTPException(status_code=404, detail="Saída não encontrada")

    campos = dados.model_dump(exclude_unset=True)
    if "data" in campos:
        campos["data"] = normalizar_data_venda(campos["data"])
    if "categoria" in campos and campos["categoria"] is not None:
        campos["categoria"] = assert_categoria_valida(db, TIPO_CATEGORIA_SAIDA, campos["categoria"])
    for campo, valor in campos.items():
        setattr(saida, campo, valor)

    db.commit()
    db.refresh(saida)
    return saida


@app.delete("/api/saidas/{saida_id}", status_code=204)
def excluir_saida(saida_id: int, db: Session = Depends(get_db)):
    saida = db.query(Saida).filter(Saida.id == saida_id).first()
    if not saida:
        raise HTTPException(status_code=404, detail="Saída não encontrada")
    db.delete(saida)
    db.commit()


@app.get("/api/dashboard/saidas-periodo", response_model=list[SaidaPorPeriodo])
def saidas_por_periodo(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
    granularidade: Literal["dia", "semana", "mes"] = Query(default="dia", alias="periodo"),
):
    saidas = filtrar_saidas(db.query(Saida), filtros).order_by(Saida.data).all()
    agrupado = agrupar_registros_por_periodo(saidas, granularidade)

    return [
        SaidaPorPeriodo(
            periodo=chave,
            total=round(dados["total"], 2),
            quantidade=dados["quantidade"],
        )
        for chave, dados in sorted(agrupado.items())
    ]


@app.get("/api/dashboard/saidas-categoria", response_model=list[SaidaPorCategoria])
def saidas_por_categoria(
    db: Session = Depends(get_db),
    filtros: FiltrosDashboard = Depends(montar_filtros_dashboard),
):
    saidas = filtrar_saidas(db.query(Saida), filtros).all()
    agrupado: dict[str, dict[str, float | int]] = {}
    for saida in saidas:
        if saida.categoria not in agrupado:
            agrupado[saida.categoria] = {"total": 0.0, "quantidade": 0}
        agrupado[saida.categoria]["total"] += saida.valor
        agrupado[saida.categoria]["quantidade"] += 1

    top = sorted(agrupado.items(), key=lambda x: x[1]["total"], reverse=True)
    return [
        SaidaPorCategoria(
            categoria=cat,
            total=round(dados["total"], 2),
            quantidade=dados["quantidade"],
        )
        for cat, dados in top
    ]


@app.get("/api/dashboard/saidas-mes-atual")
def saidas_mes_atual(db: Session = Depends(get_db)):
    agora = datetime.now()
    resultados = (
        db.query(extract("day", Saida.data).label("dia"), func.sum(Saida.valor))
        .filter(
            extract("month", Saida.data) == agora.month,
            extract("year", Saida.data) == agora.year,
        )
        .group_by("dia")
        .order_by("dia")
        .all()
    )

    return [{"dia": int(dia), "total": round(total or 0.0, 2)} for dia, total in resultados]


def montar_resposta_caixa(db: Session, dia: date, registro: CaixaDiario | None) -> CaixaDiarioResponse:
    resumo_raw = calcular_resumo_sistema(db, dia)
    resumo = CaixaResumoSistema(**resumo_raw)

    valor_inicial = registro.valor_inicial if registro else None
    saldo_esperado = None
    diferenca = None

    if valor_inicial is not None:
        saldo_esperado = calcular_saldo_esperado(valor_inicial, resumo_raw)
        if registro and registro.valor_fechamento is not None:
            diferenca = round(registro.valor_fechamento - saldo_esperado, 2)

    return CaixaDiarioResponse(
        id=registro.id if registro else None,
        data=dia,
        valor_inicial=valor_inicial,
        valor_fechamento=registro.valor_fechamento if registro else None,
        fechado_em=registro.fechado_em if registro else None,
        observacao_abertura=registro.observacao_abertura if registro else None,
        observacao_fechamento=registro.observacao_fechamento if registro else None,
        aberto=registro is not None,
        fechado=bool(registro and registro.fechado_em),
        resumo_sistema=resumo,
        saldo_esperado=saldo_esperado,
        diferenca=diferenca,
    )


@app.get("/api/caixa", response_model=list[CaixaDiarioListItem])
def listar_caixa(
    db: Session = Depends(get_db),
    limite: int = Query(default=60, ge=1, le=365),
):
    registros = (
        db.query(CaixaDiario)
        .order_by(desc(CaixaDiario.data))
        .limit(limite)
        .all()
    )

    itens = []
    for registro in registros:
        resumo = calcular_resumo_sistema(db, registro.data)
        saldo_esperado = calcular_saldo_esperado(registro.valor_inicial, resumo)
        diferenca = None
        if registro.valor_fechamento is not None:
            diferenca = round(registro.valor_fechamento - saldo_esperado, 2)

        itens.append(
            CaixaDiarioListItem(
                id=registro.id,
                data=registro.data,
                valor_inicial=registro.valor_inicial,
                valor_fechamento=registro.valor_fechamento,
                fechado_em=registro.fechado_em,
                saldo_esperado=saldo_esperado,
                diferenca=diferenca,
                faturamento=resumo["faturamento"],
            )
        )
    return itens


@app.get("/api/caixa/dia", response_model=CaixaDiarioResponse)
def obter_caixa_dia(
    db: Session = Depends(get_db),
    data: date = Query(..., description="Data no formato YYYY-MM-DD"),
):
    registro = db.query(CaixaDiario).filter(CaixaDiario.data == data).first()
    return montar_resposta_caixa(db, data, registro)


@app.post("/api/caixa/abertura", response_model=CaixaDiarioResponse)
def registrar_abertura_caixa(dados: CaixaAberturaCreate, db: Session = Depends(get_db)):
    registro = db.query(CaixaDiario).filter(CaixaDiario.data == dados.data).first()

    if registro and registro.fechado_em:
        raise HTTPException(
            status_code=400,
            detail="O caixa deste dia já foi fechado. Não é possível alterar a abertura.",
        )

    if registro:
        registro.valor_inicial = round(dados.valor_inicial, 2)
        registro.observacao_abertura = dados.observacao
    else:
        registro = CaixaDiario(
            data=dados.data,
            valor_inicial=round(dados.valor_inicial, 2),
            observacao_abertura=dados.observacao,
        )
        db.add(registro)

    db.commit()
    db.refresh(registro)
    return montar_resposta_caixa(db, dados.data, registro)


@app.post("/api/caixa/fechamento", response_model=CaixaDiarioResponse)
def registrar_fechamento_caixa(dados: CaixaFechamentoCreate, db: Session = Depends(get_db)):
    registro = db.query(CaixaDiario).filter(CaixaDiario.data == dados.data).first()

    if not registro:
        raise HTTPException(
            status_code=400,
            detail="Registre a abertura do caixa antes de fechar.",
        )

    if registro.fechado_em:
        raise HTTPException(status_code=400, detail="O caixa deste dia já foi fechado.")

    registro.valor_fechamento = round(dados.valor_fechamento, 2)
    registro.observacao_fechamento = dados.observacao
    registro.fechado_em = datetime.now()

    db.commit()
    db.refresh(registro)
    return montar_resposta_caixa(db, dados.data, registro)


@app.delete("/api/caixa/{caixa_id}", status_code=204)
def excluir_registro_caixa(caixa_id: int, db: Session = Depends(get_db)):
    registro = db.query(CaixaDiario).filter(CaixaDiario.id == caixa_id).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro de caixa não encontrado")
    db.delete(registro)
    db.commit()
