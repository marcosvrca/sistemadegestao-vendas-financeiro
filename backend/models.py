from datetime import date, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class Venda(Base):
    __tablename__ = "vendas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    data: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    produto: Mapped[str] = mapped_column(String(200))
    cliente: Mapped[str] = mapped_column(String(200), default="Cliente avulso")
    quantidade: Mapped[int] = mapped_column(Integer, default=1)
    valor_unitario: Mapped[float] = mapped_column(Float)
    desconto: Mapped[float] = mapped_column(Float, default=0.0)
    valor: Mapped[float] = mapped_column(Float)
    forma_pagamento: Mapped[str] = mapped_column(String(50), index=True)
    troco: Mapped[float | None] = mapped_column(Float, nullable=True)
    valor_recebido: Mapped[float | None] = mapped_column(Float, nullable=True)
    parcelas: Mapped[int | None] = mapped_column(Integer, nullable=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)

    itens: Mapped[list["ItemVenda"]] = relationship(
        back_populates="venda",
        cascade="all, delete-orphan",
        order_by="ItemVenda.id",
    )


class ItemVenda(Base):
    __tablename__ = "itens_venda"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    venda_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("vendas.id", ondelete="CASCADE"),
        index=True,
    )
    produto: Mapped[str] = mapped_column(String(200))
    quantidade: Mapped[int] = mapped_column(Integer, default=1)
    valor_unitario: Mapped[float] = mapped_column(Float)
    desconto: Mapped[float] = mapped_column(Float, default=0.0)
    valor: Mapped[float] = mapped_column(Float)

    venda: Mapped["Venda"] = relationship(back_populates="itens")


class Saida(Base):
    __tablename__ = "saidas"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    data: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    descricao: Mapped[str] = mapped_column(String(200))
    categoria: Mapped[str] = mapped_column(String(50), index=True)
    valor: Mapped[float] = mapped_column(Float)
    forma_pagamento: Mapped[str] = mapped_column(String(50), index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)


class CaixaDiario(Base):
    __tablename__ = "caixa_diario"
    __table_args__ = (UniqueConstraint("data", name="uq_caixa_data"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    data: Mapped[date] = mapped_column(Date, index=True, unique=True)
    valor_inicial: Mapped[float] = mapped_column(Float)
    valor_fechamento: Mapped[float | None] = mapped_column(Float, nullable=True)
    fechado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    observacao_abertura: Mapped[str | None] = mapped_column(String(500), nullable=True)
    observacao_fechamento: Mapped[str | None] = mapped_column(String(500), nullable=True)


class Produto(Base):
    __tablename__ = "produtos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200))
    nome_normalizado: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    categoria: Mapped[str] = mapped_column(String(50), default="Geral", index=True)
    preco_venda: Mapped[float] = mapped_column(Float, default=0.0)
    estoque_atual: Mapped[int] = mapped_column(Integer, default=0)
    estoque_minimo: Mapped[int] = mapped_column(Integer, default=0)
    unidade: Mapped[str] = mapped_column(String(20), default="un")
    ativo: Mapped[bool] = mapped_column(default=True, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )

    movimentacoes: Mapped[list["MovimentacaoEstoque"]] = relationship(
        back_populates="produto",
        order_by="MovimentacaoEstoque.id.desc()",
    )


class MovimentacaoEstoque(Base):
    __tablename__ = "movimentacoes_estoque"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    produto_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("produtos.id", ondelete="CASCADE"),
        index=True,
    )
    tipo: Mapped[str] = mapped_column(String(30), index=True)
    quantidade: Mapped[int] = mapped_column(Integer)
    estoque_anterior: Mapped[int] = mapped_column(Integer)
    estoque_posterior: Mapped[int] = mapped_column(Integer)
    venda_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("vendas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    data: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)

    produto: Mapped["Produto"] = relationship(back_populates="movimentacoes")
