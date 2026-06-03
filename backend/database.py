from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DB_PATH = Path(__file__).resolve().parent / "recanto_da_fe.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrar_banco() -> None:
    from models import (  # noqa: F401
        CaixaDiario,
        ContaPagar,
        ContaPagarRecorrente,
        ContaReceber,
        ContaRecorrente,
        ItemVenda,
        MovimentacaoEstoque,
        Produto,
        Saida,
        Venda,
        Configuracao,
    )

    Base.metadata.create_all(bind=engine)

    with engine.connect() as conn:
        colunas = {row[1] for row in conn.execute(text("PRAGMA table_info(vendas)")).fetchall()}
        if colunas:
            if "troco" not in colunas:
                conn.execute(text("ALTER TABLE vendas ADD COLUMN troco FLOAT"))
            if "valor_recebido" not in colunas:
                conn.execute(text("ALTER TABLE vendas ADD COLUMN valor_recebido FLOAT"))
            if "parcelas" not in colunas:
                conn.execute(text("ALTER TABLE vendas ADD COLUMN parcelas INTEGER"))
            conn.execute(
                text(
                    "UPDATE vendas SET parcelas = 1 "
                    "WHERE forma_pagamento = 'Cartão Crédito' AND parcelas IS NULL"
                )
            )
            if "pago_em" not in colunas:
                conn.execute(text("ALTER TABLE vendas ADD COLUMN pago_em DATETIME"))
                conn.execute(
                    text(
                        "UPDATE vendas SET pago_em = data "
                        "WHERE forma_pagamento != 'AV' AND pago_em IS NULL"
                    )
                )
        conn.commit()

    db = SessionLocal()
    try:
        if db.query(ItemVenda).count() == 0 and db.query(Venda).count() > 0:
            for venda in db.query(Venda).all():
                db.add(
                    ItemVenda(
                        venda_id=venda.id,
                        produto=venda.produto,
                        quantidade=venda.quantidade,
                        valor_unitario=venda.valor_unitario,
                        desconto=venda.desconto,
                        valor=venda.valor,
                    )
                )
            db.commit()
    finally:
        db.close()

    db = SessionLocal()
    try:
        from estoque_utils import seed_produtos_de_vendas

        if db.query(Produto).count() == 0 and db.query(ItemVenda).count() > 0:
            seed_produtos_de_vendas(db)
    finally:
        db.close()
