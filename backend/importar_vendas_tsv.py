"""Importa vendas de arquivo TSV tabulado (export planilha)."""
from __future__ import annotations

import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

from sqlalchemy import func, text

from database import SessionLocal, migrar_banco
from excel_import import (
    normalizar_forma_pagamento,
    parse_data,
    parse_inteiro,
    parse_numero,
)
from models import ItemVenda, Venda
from venda_utils import calcular_valor_item, sincronizar_cabecalho

CAMPOS = [
    "id",
    "data",
    "valor",
    "forma_pag",
    "quantidade",
    "desconto",
    "produto",
    "valor_recebido",
    "troco",
    "cliente",
    "observacao",
]


def parse_linha(partes: list[str]) -> dict:
    while len(partes) < len(CAMPOS):
        partes.append("")

    raw = dict(zip(CAMPOS, partes))
    valor = parse_numero(raw["valor"])
    quantidade = parse_inteiro(raw["quantidade"]) or 1
    desconto = parse_numero(raw["desconto"]) or 0.0
    data = parse_data(raw["data"])
    forma = normalizar_forma_pagamento(raw["forma_pag"])

    if valor is None:
        raise ValueError(f"Valor inválido na linha: {partes}")
    if data is None:
        raise ValueError(f"Data inválida na linha: {partes}")
    if forma is None:
        raise ValueError(f"Forma de pagamento inválida: {raw['forma_pag']!r}")

    valor_unitario = round((valor + desconto) / quantidade, 2)
    cliente = raw["cliente"].strip() or "Cliente avulso"
    observacao = raw["observacao"].strip() or None
    troco = parse_numero(raw["troco"])
    valor_recebido = parse_numero(raw["valor_recebido"])

    if "3x" in raw["forma_pag"].lower() and observacao:
        observacao = f"Crédito 3x | {observacao}"
    elif "3x" in raw["forma_pag"].lower():
        observacao = "Crédito 3x"

    return {
        "venda_id": parse_inteiro(raw["id"]),
        "data": data,
        "produto": raw["produto"].strip()[:200],
        "cliente": cliente[:200],
        "quantidade": quantidade,
        "valor_unitario": valor_unitario,
        "desconto": desconto,
        "valor": round(valor, 2),
        "forma_pagamento": forma,
        "troco": troco,
        "valor_recebido": valor_recebido,
        "observacao": observacao,
    }


def ler_arquivo(caminho: Path) -> list[dict]:
    linhas = caminho.read_text(encoding="utf-8").strip().splitlines()
    if not linhas:
        return []

    registros: list[dict] = []
    for i, linha in enumerate(linhas[1:], start=2):
        if not linha.strip():
            continue
        partes = linha.split("\t")
        try:
            registros.append(parse_linha(partes))
        except ValueError as exc:
            raise ValueError(f"Linha {i}: {exc}") from exc
    return registros


def agrupar_por_venda(registros: list[dict]) -> dict[int, list[dict]]:
    grupos: dict[int, list[dict]] = defaultdict(list)
    for reg in registros:
        vid = reg["venda_id"]
        if vid is None:
            raise ValueError("Todas as linhas precisam ter id de venda")
        grupos[vid].append(reg)
    return dict(sorted(grupos.items()))


def montar_observacao_venda(itens: list[dict]) -> str | None:
    partes: list[str] = []
    obs = [i["observacao"] for i in itens if i["observacao"]]
    if obs:
        partes.extend(dict.fromkeys(obs))

    formas = {i["forma_pagamento"] for i in itens}
    if len(formas) > 1:
        detalhes = ", ".join(
            f"{i['forma_pagamento']} R${i['valor']:.2f} ({i['produto']})"
            for i in itens
        )
        partes.append(f"Pagamento misto: {detalhes}")

    return " | ".join(partes) if partes else None


def importar(caminho: Path) -> None:
    migrar_banco()
    registros = ler_arquivo(caminho)
    grupos = agrupar_por_venda(registros)

    db = SessionLocal()
    try:
        existentes = db.query(Venda.id).filter(Venda.id.in_(grupos.keys())).count()
        if existentes:
            print(f"Aviso: {existentes} venda(s) com ID já existente serão ignoradas.")

        importadas = 0
        for venda_id, linhas in grupos.items():
            if db.query(Venda).filter(Venda.id == venda_id).first():
                print(f"  Ignorada venda #{venda_id} (já existe)")
                continue

            primeira = linhas[0]
            troco = next((i["troco"] for i in linhas if i["troco"] is not None), None)
            valor_recebido = next(
                (i["valor_recebido"] for i in linhas if i["valor_recebido"] is not None),
                None,
            )
            cliente = next(
                (i["cliente"] for i in linhas if i["cliente"] != "Cliente avulso"),
                primeira["cliente"],
            )

            venda = Venda(
                id=venda_id,
                data=primeira["data"].replace(hour=12, minute=0, second=0),
                produto=primeira["produto"],
                cliente=cliente,
                quantidade=primeira["quantidade"],
                valor_unitario=primeira["valor_unitario"],
                desconto=primeira["desconto"],
                valor=primeira["valor"],
                forma_pagamento=primeira["forma_pagamento"],
                troco=troco,
                valor_recebido=valor_recebido,
                observacao=montar_observacao_venda(linhas),
            )
            db.add(venda)
            db.flush()

            itens_db: list[ItemVenda] = []
            for linha in linhas:
                item = ItemVenda(
                    venda_id=venda.id,
                    produto=linha["produto"],
                    quantidade=linha["quantidade"],
                    valor_unitario=linha["valor_unitario"],
                    desconto=linha["desconto"],
                    valor=linha["valor"],
                )
                db.add(item)
                itens_db.append(item)

            db.flush()
            sincronizar_cabecalho(venda, itens_db)

            if len(linhas) == 1 and linhas[0]["forma_pagamento"] != primeira["forma_pagamento"]:
                venda.forma_pagamento = linhas[0]["forma_pagamento"]

            importadas += 1
            total = sum(i.valor for i in itens_db)
            print(f"  Venda #{venda_id}: {len(itens_db)} item(ns) — R$ {total:.2f}")

        max_id = db.query(func.max(Venda.id)).scalar() or 0
        if max_id:
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
        total_vendas = db.query(Venda).count()
        total_itens = db.query(ItemVenda).count()
        faturamento = db.query(func.sum(Venda.valor)).scalar() or 0
        print(f"\nImportadas {importadas} vendas.")
        print(f"Banco: {total_vendas} vendas, {total_itens} itens, faturamento R$ {faturamento:.2f}")
    finally:
        db.close()


if __name__ == "__main__":
    caminho = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "vendas_31-05-2026.txt"
    if not caminho.exists():
        raise SystemExit(f"Arquivo não encontrado: {caminho}")
    importar(caminho)
