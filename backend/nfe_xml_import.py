"""Parser e importação de XML de NF-e / NFC-e para estoque."""

from __future__ import annotations

import zipfile
from dataclasses import dataclass
from io import BytesIO
from xml.etree import ElementTree as ET

from fastapi import HTTPException
from sqlalchemy.orm import Session

from estoque_utils import (
    buscar_produto_por_nome,
    obter_ou_criar_produto,
    registrar_movimentacao,
)


@dataclass
class ItemNFe:
    numero_item: int
    nome: str
    quantidade: int
    valor_unitario: float
    unidade: str
    codigo: str | None = None


@dataclass
class NFeMetadados:
    numero: str | None = None
    serie: str | None = None
    emitente: str | None = None
    chave: str | None = None


@dataclass
class ImportacaoNFeItemResultado:
    numero_item: int
    produto: str
    quantidade: int
    acao: str
    produto_id: int | None = None
    estoque_posterior: int | None = None


def _tag_local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if tag else ""


def _texto(elem: ET.Element | None) -> str | None:
    if elem is None or elem.text is None:
        return None
    texto = elem.text.strip()
    return texto or None


def _float(valor: str | None, padrao: float = 0.0) -> float:
    if not valor:
        return padrao
    try:
        return float(valor.replace(",", "."))
    except ValueError:
        return padrao


def _quantidade_int(valor: str | None) -> int:
    if not valor:
        return 0
    try:
        return max(0, int(round(float(valor.replace(",", ".")))))
    except ValueError:
        return 0


def extrair_xml_de_arquivo(conteudo: bytes, nome_arquivo: str) -> bytes:
    nome = (nome_arquivo or "").lower()
    if nome.endswith(".zip"):
        try:
            with zipfile.ZipFile(BytesIO(conteudo)) as arquivo_zip:
                nomes_xml = [n for n in arquivo_zip.namelist() if n.lower().endswith(".xml")]
                if not nomes_xml:
                    raise HTTPException(
                        status_code=400,
                        detail="O arquivo ZIP não contém XML da nota fiscal.",
                    )
                return arquivo_zip.read(nomes_xml[0])
        except zipfile.BadZipFile as exc:
            raise HTTPException(status_code=400, detail="Arquivo ZIP inválido.") from exc

    if not (nome.endswith(".xml") or conteudo.lstrip()[:1] in (b"<", b"\xef")):
        raise HTTPException(
            status_code=400,
            detail="Envie um arquivo XML ou ZIP com o XML da NF-e.",
        )
    return conteudo


def parsear_xml_nfe(conteudo_xml: bytes) -> tuple[NFeMetadados, list[ItemNFe]]:
    try:
        raiz = ET.fromstring(conteudo_xml)
    except ET.ParseError as exc:
        raise HTTPException(status_code=400, detail="XML inválido ou corrompido.") from exc

    inf_nfe = None
    for elem in raiz.iter():
        if _tag_local(elem.tag) == "infNFe":
            inf_nfe = elem
            break

    if inf_nfe is None:
        raise HTTPException(
            status_code=400,
            detail="XML não reconhecido como NF-e/NFC-e (elemento infNFe não encontrado).",
        )

    meta = NFeMetadados()
    meta.chave = inf_nfe.attrib.get("Id", "").replace("NFe", "") or None

    for elem in inf_nfe.iter():
        local = _tag_local(elem.tag)
        if local == "nNF" and not meta.numero:
            meta.numero = _texto(elem)
        elif local == "serie" and not meta.serie:
            meta.serie = _texto(elem)

    for elem in inf_nfe.iter():
        if _tag_local(elem.tag) != "emit":
            continue
        for filho in elem:
            if _tag_local(filho.tag) == "xNome":
                meta.emitente = _texto(filho)
                break
        if meta.emitente:
            break

    itens: list[ItemNFe] = []
    numero = 0

    for det in inf_nfe.iter():
        if _tag_local(det.tag) != "det":
            continue

        prod = None
        for filho in det:
            if _tag_local(filho.tag) == "prod":
                prod = filho
                break
        if prod is None:
            continue

        dados: dict[str, str | None] = {}
        for campo in prod:
            dados[_tag_local(campo.tag)] = _texto(campo)

        nome = (dados.get("xProd") or "").strip()
        if not nome:
            continue

        numero += 1
        n_item_attr = det.attrib.get("nItem")
        try:
            numero_item = int(n_item_attr) if n_item_attr else numero
        except ValueError:
            numero_item = numero

        qtd = _quantidade_int(dados.get("qCom"))
        if qtd <= 0:
            qtd = _quantidade_int(dados.get("qTrib"))
        if qtd <= 0:
            continue

        itens.append(
            ItemNFe(
                numero_item=numero_item,
                nome=nome,
                quantidade=qtd,
                valor_unitario=round(_float(dados.get("vUnCom")), 2),
                unidade=(dados.get("uCom") or "un")[:20],
                codigo=dados.get("cProd"),
            )
        )

    if not itens:
        raise HTTPException(
            status_code=400,
            detail="Nenhum item de produto encontrado no XML da nota.",
        )

    return meta, itens


def importar_itens_nfe_para_estoque(
    db: Session,
    meta: NFeMetadados,
    itens: list[ItemNFe],
    *,
    atualizar_preco: bool = False,
    criar_inexistentes: bool = True,
) -> tuple[list[ImportacaoNFeItemResultado], list[str]]:
    ref_nota = ""
    if meta.numero:
        ref_nota = f"NF-e nº {meta.numero}"
        if meta.serie:
            ref_nota += f" série {meta.serie}"
    elif meta.chave:
        ref_nota = f"NF-e chave …{meta.chave[-8:]}"
    else:
        ref_nota = "Importação XML NF-e"

    if meta.emitente:
        ref_nota += f" — {meta.emitente}"

    processados: list[ImportacaoNFeItemResultado] = []
    erros: list[str] = []

    for item in itens:
        try:
            produto = buscar_produto_por_nome(db, item.nome)
            acao = "entrada"

            if produto:
                if atualizar_preco and item.valor_unitario > 0:
                    produto.preco_venda = item.valor_unitario
                if item.unidade and produto.unidade == "un":
                    produto.unidade = item.unidade
            else:
                if not criar_inexistentes:
                    erros.append(
                        f"Item {item.numero_item}: produto '{item.nome}' não cadastrado."
                    )
                    continue
                produto = obter_ou_criar_produto(
                    db,
                    item.nome,
                    item.valor_unitario if atualizar_preco else None,
                )
                produto.unidade = item.unidade
                acao = "criado_entrada"

            obs = ref_nota
            if item.codigo:
                obs += f" | cProd {item.codigo}"

            mov = registrar_movimentacao(
                db,
                produto,
                "entrada",
                item.quantidade,
                observacao=obs,
            )

            processados.append(
                ImportacaoNFeItemResultado(
                    numero_item=item.numero_item,
                    produto=produto.nome,
                    quantidade=item.quantidade,
                    acao=acao,
                    produto_id=produto.id,
                    estoque_posterior=mov.estoque_posterior,
                )
            )
        except HTTPException as exc:
            erros.append(f"Item {item.numero_item} ({item.nome}): {exc.detail}")
        except Exception as exc:
            erros.append(f"Item {item.numero_item} ({item.nome}): {exc}")

    return processados, erros
