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
    pago_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    promocao_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    promocao_nome: Mapped[str | None] = mapped_column(String(200), nullable=True)

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


class Configuracao(Base):
    __tablename__ = "configuracoes"

    chave: Mapped[str] = mapped_column(String(80), primary_key=True)
    valor: Mapped[str] = mapped_column(String(500))


class Fornecedor(Base):
    __tablename__ = "fornecedores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), index=True)
    documento: Mapped[str] = mapped_column(String(14), unique=True, index=True)
    tipo_documento: Mapped[str] = mapped_column(String(4), index=True)
    ativo: Mapped[bool] = mapped_column(default=True, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    contas: Mapped[list["ContaPagar"]] = relationship(back_populates="fornecedor_cadastro")
    contas_recorrentes: Mapped[list["ContaPagarRecorrente"]] = relationship(
        back_populates="fornecedor_cadastro",
    )


class Cliente(Base):
    __tablename__ = "clientes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(200), index=True)
    documento: Mapped[str | None] = mapped_column(String(14), nullable=True, index=True)
    tipo_documento: Mapped[str | None] = mapped_column(String(4), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class Categoria(Base):
    __tablename__ = "categorias"
    __table_args__ = (UniqueConstraint("nome", "tipo", name="uq_categoria_nome_tipo"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(50), index=True)
    tipo: Mapped[str] = mapped_column(String(10), index=True)
    ativo: Mapped[bool] = mapped_column(default=True, index=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)


class ContaRecorrente(Base):
    __tablename__ = "contas_recorrentes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cliente: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str] = mapped_column(String(200))
    valor: Mapped[float] = mapped_column(Float)
    dia_vencimento: Mapped[int] = mapped_column(Integer)
    frequencia: Mapped[str] = mapped_column(String(20), default="Mensal", index=True)
    ativo: Mapped[bool] = mapped_column(default=True, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    contas: Mapped[list["ContaReceber"]] = relationship(
        back_populates="recorrente",
        order_by="ContaReceber.id.desc()",
    )


class ContaReceber(Base):
    __tablename__ = "contas_receber"
    __table_args__ = (
        UniqueConstraint(
            "recorrente_id",
            "referencia_mes",
            name="uq_conta_receber_recorrente_mes",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cliente: Mapped[str] = mapped_column(String(200), index=True)
    descricao: Mapped[str] = mapped_column(String(200))
    valor: Mapped[float] = mapped_column(Float)
    data_vencimento: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente", index=True)
    forma_pagamento: Mapped[str | None] = mapped_column(String(50), nullable=True)
    data_recebimento: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recorrente_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("contas_recorrentes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    referencia_mes: Mapped[str | None] = mapped_column(String(7), nullable=True, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)

    recorrente: Mapped["ContaRecorrente | None"] = relationship(back_populates="contas")


class ContaPagarRecorrente(Base):
    __tablename__ = "contas_pagar_recorrentes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fornecedor: Mapped[str] = mapped_column(String(200))
    descricao: Mapped[str] = mapped_column(String(200))
    categoria: Mapped[str] = mapped_column(String(50), default="Fornecedor", index=True)
    valor: Mapped[float] = mapped_column(Float)
    dia_vencimento: Mapped[int] = mapped_column(Integer)
    frequencia: Mapped[str] = mapped_column(String(20), default="Mensal", index=True)
    ativo: Mapped[bool] = mapped_column(default=True, index=True)
    is_dda: Mapped[bool] = mapped_column(default=False, index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    fornecedor_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("fornecedores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)

    contas: Mapped[list["ContaPagar"]] = relationship(
        back_populates="recorrente",
        order_by="ContaPagar.id.desc()",
    )
    fornecedor_cadastro: Mapped["Fornecedor | None"] = relationship(
        back_populates="contas_recorrentes",
    )


class ContaPagar(Base):
    __tablename__ = "contas_pagar"
    __table_args__ = (
        UniqueConstraint(
            "recorrente_id",
            "referencia_mes",
            name="uq_conta_pagar_recorrente_mes",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    fornecedor: Mapped[str] = mapped_column(String(200), index=True)
    descricao: Mapped[str] = mapped_column(String(200))
    categoria: Mapped[str] = mapped_column(String(50), index=True)
    valor: Mapped[float] = mapped_column(Float)
    data_vencimento: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente", index=True)
    is_dda: Mapped[bool] = mapped_column(default=False, index=True)
    linha_digitavel: Mapped[str | None] = mapped_column(String(100), nullable=True)
    documento_beneficiario: Mapped[str | None] = mapped_column(String(14), nullable=True, index=True)
    fornecedor_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("fornecedores.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    forma_pagamento: Mapped[str | None] = mapped_column(String(50), nullable=True)
    data_pagamento: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recorrente_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("contas_pagar_recorrentes.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    referencia_mes: Mapped[str | None] = mapped_column(String(7), nullable=True, index=True)
    saida_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("saidas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)

    recorrente: Mapped["ContaPagarRecorrente | None"] = relationship(back_populates="contas")
    fornecedor_cadastro: Mapped["Fornecedor | None"] = relationship(back_populates="contas")


class Pedido(Base):
    __tablename__ = "pedidos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    dados: Mapped[str] = mapped_column(String(500))
    tipo: Mapped[str] = mapped_column(String(100), index=True)
    valor: Mapped[float] = mapped_column(Float)
    data_prevista: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente", index=True)
    observacao: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, index=True)
    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.now, onupdate=datetime.now
    )
    finalizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
