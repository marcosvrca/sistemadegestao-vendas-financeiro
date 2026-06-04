from datetime import date, datetime

from pydantic import BaseModel, Field, field_validator, model_validator


FORMAS_PAGAMENTO = ["Dinheiro", "Pix", "Cartão Débito", "Cartão Crédito", "Outro"]
FORMA_PAGAMENTO_AV = "AV"
FORMA_CARTAO_CREDITO = "Cartão Crédito"
FORMAS_PAGAMENTO_VENDA = ["Dinheiro", "Pix", "Cartão Débito", FORMA_CARTAO_CREDITO, FORMA_PAGAMENTO_AV, "Outro"]

CATEGORIAS_SAIDA = [
    "Fornecedor",
    "Aluguel",
    "Salários",
    "Alimentação",
    "Energia/Água",
    "Transporte",
    "Manutenção",
    "Impostos",
    "Marketing",
    "Outro",
]


class ItemVendaBase(BaseModel):
    produto: str = Field(..., min_length=1, max_length=200)
    quantidade: int = Field(default=1, ge=1)
    valor_unitario: float = Field(..., ge=0)
    desconto: float = Field(default=0.0, ge=0)


class ItemVendaCreate(ItemVendaBase):
    pass


class ItemVendaUpdate(ItemVendaBase):
    id: int | None = None


class ItemVendaResponse(ItemVendaBase):
    id: int
    valor: float

    model_config = {"from_attributes": True}


class VendaBase(BaseModel):
    data: datetime | None = None
    cliente: str = Field(default="Cliente avulso", max_length=200)
    forma_pagamento: str
    troco: float | None = Field(default=None, ge=0)
    valor_recebido: float | None = Field(default=None, ge=0)
    parcelas: int | None = Field(default=None, ge=1, le=24)
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("forma_pagamento")
    @classmethod
    def validar_forma_pagamento(cls, value: str) -> str:
        if value not in FORMAS_PAGAMENTO_VENDA:
            raise ValueError(f"Forma de pagamento inválida. Opções: {', '.join(FORMAS_PAGAMENTO_VENDA)}")
        return value


class VendaCreate(VendaBase):
    itens: list[ItemVendaCreate] = Field(default_factory=list, min_length=0)
    produto: str | None = Field(default=None, max_length=200)
    quantidade: int | None = Field(default=None, ge=1)
    valor_unitario: float | None = Field(default=None, ge=0)
    desconto: float | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def montar_itens(self) -> "VendaCreate":
        if self.forma_pagamento == FORMA_CARTAO_CREDITO:
            if self.parcelas is None or self.parcelas < 1:
                raise ValueError("Informe o número de parcelas para cartão de crédito")
        elif self.parcelas is not None:
            object.__setattr__(self, "parcelas", None)

        if self.itens:
            return self
        if self.produto:
            self.itens = [
                ItemVendaCreate(
                    produto=self.produto,
                    quantidade=self.quantidade or 1,
                    valor_unitario=self.valor_unitario or 0,
                    desconto=self.desconto or 0,
                )
            ]
            return self
        raise ValueError("Informe pelo menos um item na venda")


class VendaUpdate(BaseModel):
    data: datetime | None = None
    cliente: str | None = Field(default=None, max_length=200)
    forma_pagamento: str | None = None
    troco: float | None = Field(default=None, ge=0)
    valor_recebido: float | None = Field(default=None, ge=0)
    parcelas: int | None = Field(default=None, ge=1, le=24)
    observacao: str | None = Field(default=None, max_length=500)
    itens: list[ItemVendaUpdate] | None = None
    produto: str | None = Field(default=None, min_length=1, max_length=200)
    quantidade: int | None = Field(default=None, ge=1)
    valor_unitario: float | None = Field(default=None, ge=0)
    desconto: float | None = Field(default=None, ge=0)

    @field_validator("forma_pagamento")
    @classmethod
    def validar_forma_pagamento(cls, value: str | None) -> str | None:
        if value is not None and value not in FORMAS_PAGAMENTO_VENDA:
            raise ValueError(f"Forma de pagamento inválida. Opções: {', '.join(FORMAS_PAGAMENTO_VENDA)}")
        return value

    @model_validator(mode="after")
    def validar_parcelas_credito(self):
        forma = self.forma_pagamento
        if forma is None:
            return self
        if forma == FORMA_CARTAO_CREDITO:
            if self.parcelas is None or self.parcelas < 1:
                raise ValueError("Informe o número de parcelas para cartão de crédito")
        elif self.parcelas is not None:
            object.__setattr__(self, "parcelas", None)
        return self


class ImportacaoErro(BaseModel):
    linha: int
    mensagem: str
    produto: str | None = None


class ImportacaoIgnorada(BaseModel):
    linha: int
    id: int | None = None
    produto: str | None = None
    motivo: str


class ImportacaoResultado(BaseModel):
    importadas: int
    ignoradas: int
    erros: list[ImportacaoErro]
    detalhes_ignoradas: list[ImportacaoIgnorada]
    colunas_detectadas: list[str]


class VendaResponse(VendaBase):
    id: int
    data: datetime
    pago_em: datetime | None = None
    valor: float
    produto: str
    quantidade: int
    valor_unitario: float
    desconto: float
    itens: list[ItemVendaResponse] = Field(default_factory=list)

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def normalizar_parcelas_legado(self):
        """Vendas antigas em crédito podem não ter parcelas gravadas."""
        if self.forma_pagamento == FORMA_CARTAO_CREDITO and self.parcelas is None:
            object.__setattr__(self, "parcelas", 1)
        return self


class MediaVendaResponse(BaseModel):
    media: float
    total: float
    quantidade: int
    descricao_periodo: str


class DashboardKPIs(BaseModel):
    total_vendas: float
    quantidade_vendas: int
    ticket_medio: float
    total_descontos: float
    total_itens: int
    total_saidas: float
    quantidade_saidas: int
    saldo: float
    descricao_periodo: str
    melhor_dia: str | None = None
    melhor_dia_total: float = 0
    melhor_dia_quantidade: int = 0
    vendas_hoje: float = 0
    vendas_mes: float = 0
    crescimento_mes: float = 0
    saidas_hoje: float = 0
    saidas_mes: float = 0
    saldo_mes: float = 0


class DiaVendasResumo(BaseModel):
    data: str | None = None
    total: float
    quantidade: int


class ResumoPeriodo(BaseModel):
    descricao: str
    data_inicio: datetime
    data_fim: datetime
    faturamento: float
    quantidade_vendas: int
    total_saidas: float
    quantidade_saidas: int
    saldo: float
    ticket_medio: float
    total_itens: int
    dias_com_venda: int
    melhor_dia: DiaVendasResumo
    top_dias_vendas: list[DiaVendasResumo]


class ComparacaoMetrica(BaseModel):
    chave: str
    label: str
    periodo_a: float
    periodo_b: float
    variacao_pct: float | None = None


class ConfrontarPeriodosResponse(BaseModel):
    periodo_a: ResumoPeriodo
    periodo_b: ResumoPeriodo
    comparacoes: list[ComparacaoMetrica]


class SaidaBase(BaseModel):
    data: datetime | None = None
    descricao: str = Field(..., min_length=1, max_length=200)
    categoria: str
    valor: float = Field(..., gt=0)
    forma_pagamento: str
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("forma_pagamento")
    @classmethod
    def validar_forma_pagamento(cls, value: str) -> str:
        if value not in FORMAS_PAGAMENTO:
            raise ValueError(f"Forma de pagamento inválida. Opções: {', '.join(FORMAS_PAGAMENTO)}")
        return value


class SaidaCreate(SaidaBase):
    pass


class SaidaUpdate(BaseModel):
    data: datetime | None = None
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    categoria: str | None = None
    valor: float | None = Field(default=None, gt=0)
    forma_pagamento: str | None = None
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("forma_pagamento")
    @classmethod
    def validar_forma_pagamento(cls, value: str | None) -> str | None:
        if value is not None and value not in FORMAS_PAGAMENTO:
            raise ValueError(f"Forma de pagamento inválida. Opções: {', '.join(FORMAS_PAGAMENTO)}")
        return value


class SaidaResponse(SaidaBase):
    id: int
    data: datetime

    model_config = {"from_attributes": True}


class SaidaPorPeriodo(BaseModel):
    periodo: str
    total: float
    quantidade: int


class SaidaPorCategoria(BaseModel):
    categoria: str
    total: float
    quantidade: int


class VendaPorPeriodo(BaseModel):
    periodo: str
    total: float
    quantidade: int


class VendaPorFormaPagamento(BaseModel):
    forma_pagamento: str
    total: float
    quantidade: int


class TopItem(BaseModel):
    nome: str
    total: float
    quantidade: int


class VendaAVResumo(BaseModel):
    id: int
    data: datetime
    cliente: str
    produto: str
    valor: float


class VendasAVPendentes(BaseModel):
    quantidade: int
    total: float
    vendas: list[VendaAVResumo]


class CaixaVendaPorForma(BaseModel):
    forma_pagamento: str
    total: float


class CaixaResumoSistema(BaseModel):
    faturamento: float
    quantidade_vendas: int
    vendas_dinheiro: float
    total_saidas: float
    quantidade_saidas: int
    saidas_dinheiro: float
    vendas_por_forma: list[CaixaVendaPorForma]


class CaixaAberturaCreate(BaseModel):
    data: date
    valor_inicial: float = Field(..., ge=0)
    observacao: str | None = Field(default=None, max_length=500)


class CaixaFechamentoCreate(BaseModel):
    data: date
    valor_fechamento: float = Field(..., ge=0)
    observacao: str | None = Field(default=None, max_length=500)


class CaixaDiarioResponse(BaseModel):
    id: int | None = None
    data: date
    valor_inicial: float | None = None
    valor_fechamento: float | None = None
    fechado_em: datetime | None = None
    observacao_abertura: str | None = None
    observacao_fechamento: str | None = None
    aberto: bool = False
    fechado: bool = False
    resumo_sistema: CaixaResumoSistema
    saldo_esperado: float | None = None
    diferenca: float | None = None

    model_config = {"from_attributes": True}


class CaixaDiarioListItem(BaseModel):
    id: int
    data: date
    valor_inicial: float
    valor_fechamento: float | None
    fechado_em: datetime | None
    saldo_esperado: float | None
    diferenca: float | None
    faturamento: float


CATEGORIAS_PRODUTO = [
    "Geral",
    "Velas",
    "Terços",
    "Imagens",
    "Livros",
    "Decoração",
    "Acessórios",
    "Outro",
]

TIPOS_MOVIMENTACAO_MANUAL = ["entrada", "saida", "ajuste"]


class ProdutoBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    categoria: str = Field(default="Geral", max_length=50)
    preco_venda: float = Field(default=0.0, ge=0)
    estoque_atual: int = Field(default=0, ge=0)
    estoque_minimo: int = Field(default=0, ge=0)
    unidade: str = Field(default="un", max_length=20)
    ativo: bool = True
    observacao: str | None = Field(default=None, max_length=500)


class ProdutoCreate(ProdutoBase):
    pass


class ProdutoUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    categoria: str | None = None
    preco_venda: float | None = Field(default=None, ge=0)
    estoque_minimo: int | None = Field(default=None, ge=0)
    unidade: str | None = Field(default=None, max_length=20)
    ativo: bool | None = None
    observacao: str | None = Field(default=None, max_length=500)


class ProdutoResponse(ProdutoBase):
    id: int
    nome_normalizado: str
    criado_em: datetime
    atualizado_em: datetime
    status_estoque: str = "ok"
    # Saldo real no banco; pode ficar negativo quando vendas excedem o estoque.
    estoque_atual: int

    model_config = {"from_attributes": True}


class ProdutoOpcao(BaseModel):
    id: int
    nome: str
    preco_venda: float
    estoque_atual: int
    categoria: str


class MovimentacaoEstoqueCreate(BaseModel):
    produto_id: int
    tipo: str
    quantidade: int = Field(..., ge=0)
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("tipo")
    @classmethod
    def validar_tipo(cls, value: str) -> str:
        if value not in TIPOS_MOVIMENTACAO_MANUAL:
            raise ValueError(
                f"Tipo inválido. Opções: {', '.join(TIPOS_MOVIMENTACAO_MANUAL)}"
            )
        return value

    @model_validator(mode="after")
    def validar_quantidade_por_tipo(self):
        if self.tipo == "ajuste":
            if self.quantidade < 0:
                raise ValueError("Estoque ajustado não pode ser negativo")
        elif self.quantidade < 1:
            raise ValueError("Quantidade deve ser pelo menos 1")
        return self


class MovimentacaoEstoqueResponse(BaseModel):
    id: int
    produto_id: int
    produto_nome: str
    tipo: str
    quantidade: int
    estoque_anterior: int
    estoque_posterior: int
    venda_id: int | None
    observacao: str | None
    data: datetime

    model_config = {"from_attributes": True}


class EstoqueResumo(BaseModel):
    total_produtos: int
    produtos_ativos: int
    produtos_estoque_baixo: int
    produtos_sem_estoque: int
    valor_total_estoque: float
    total_unidades: int
    permitir_estoque_insuficiente: bool = False


class EstoqueConfiguracao(BaseModel):
    permitir_estoque_insuficiente: bool


class EstoqueConfiguracaoUpdate(BaseModel):
    permitir_estoque_insuficiente: bool


class ImportacaoNFeItemResultado(BaseModel):
    numero_item: int
    produto: str
    quantidade: int
    acao: str
    produto_id: int | None = None
    estoque_posterior: int | None = None


class ImportacaoNFeResultado(BaseModel):
    nota_numero: str | None = None
    nota_serie: str | None = None
    emitente: str | None = None
    itens_processados: int
    produtos_criados: int
    total_unidades: int
    itens: list[ImportacaoNFeItemResultado]
    erros: list[str]


FREQUENCIAS_RECORRENTE = ["Mensal", "Trimestral", "Semestral", "Anual"]
STATUS_CONTA_RECEBER = ["pendente", "recebido"]


class ContaRecorrenteBase(BaseModel):
    cliente: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1, max_length=200)
    valor: float = Field(..., gt=0)
    dia_vencimento: int = Field(..., ge=1, le=28)
    frequencia: str = Field(default="Mensal")
    ativo: bool = True
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("frequencia")
    @classmethod
    def validar_frequencia(cls, value: str) -> str:
        if value not in FREQUENCIAS_RECORRENTE:
            raise ValueError(f"Frequência inválida. Opções: {', '.join(FREQUENCIAS_RECORRENTE)}")
        return value


class ContaRecorrenteCreate(ContaRecorrenteBase):
    pass


class ContaRecorrenteUpdate(BaseModel):
    cliente: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    valor: float | None = Field(default=None, gt=0)
    dia_vencimento: int | None = Field(default=None, ge=1, le=28)
    frequencia: str | None = None
    ativo: bool | None = None
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("frequencia")
    @classmethod
    def validar_frequencia(cls, value: str | None) -> str | None:
        if value is not None and value not in FREQUENCIAS_RECORRENTE:
            raise ValueError(f"Frequência inválida. Opções: {', '.join(FREQUENCIAS_RECORRENTE)}")
        return value


class ContaRecorrenteResponse(ContaRecorrenteBase):
    id: int
    criado_em: datetime

    model_config = {"from_attributes": True}


class ContaReceberBase(BaseModel):
    cliente: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1, max_length=200)
    valor: float = Field(..., gt=0)
    data_vencimento: date
    observacao: str | None = Field(default=None, max_length=500)


class ContaReceberCreate(ContaReceberBase):
    pass


class ContaReceberUpdate(BaseModel):
    cliente: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    valor: float | None = Field(default=None, gt=0)
    data_vencimento: date | None = None
    observacao: str | None = Field(default=None, max_length=500)


class ContaReceberBaixa(BaseModel):
    forma_pagamento: str

    @field_validator("forma_pagamento")
    @classmethod
    def validar_forma_pagamento(cls, value: str) -> str:
        if value not in FORMAS_PAGAMENTO:
            raise ValueError(f"Forma de pagamento inválida. Opções: {', '.join(FORMAS_PAGAMENTO)}")
        return value


class ContaReceberResponse(ContaReceberBase):
    id: int
    status: str
    forma_pagamento: str | None = None
    data_recebimento: datetime | None = None
    recorrente_id: int | None = None
    referencia_mes: str | None = None
    criado_em: datetime

    model_config = {"from_attributes": True}


class ContasReceberResumo(BaseModel):
    quantidade_av: int
    total_av: float
    quantidade_contas: int
    total_contas: float
    quantidade_total: int
    total_geral: float


class GerarCobrancasResultado(BaseModel):
    geradas: int
    ignoradas: int
    contas: list[ContaReceberResponse]


STATUS_CONTA_PAGAR = ["pendente", "pago"]


class FornecedorBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    documento: str = Field(..., min_length=11, max_length=18)
    ativo: bool = True
    observacao: str | None = Field(default=None, max_length=500)


class FornecedorCreate(FornecedorBase):
    pass


class FornecedorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    documento: str | None = Field(default=None, min_length=11, max_length=18)
    ativo: bool | None = None
    observacao: str | None = Field(default=None, max_length=500)


class FornecedorResponse(BaseModel):
    id: int
    nome: str
    documento: str
    tipo_documento: str
    documento_formatado: str
    ativo: bool
    observacao: str | None = None
    criado_em: datetime

    model_config = {"from_attributes": True}


class ClienteBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=200)
    documento: str | None = Field(default=None, max_length=18)
    telefone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=200)
    ativo: bool = True
    observacao: str | None = Field(default=None, max_length=500)


class ClienteCreate(ClienteBase):
    pass


class ClienteUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=200)
    documento: str | None = Field(default=None, max_length=18)
    telefone: str | None = Field(default=None, max_length=30)
    email: str | None = Field(default=None, max_length=200)
    ativo: bool | None = None
    observacao: str | None = Field(default=None, max_length=500)


class ClienteResponse(BaseModel):
    id: int
    nome: str
    documento: str | None = None
    tipo_documento: str | None = None
    documento_formatado: str | None = None
    telefone: str | None = None
    email: str | None = None
    ativo: bool
    observacao: str | None = None
    criado_em: datetime

    model_config = {"from_attributes": True}


class CategoriaBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=50)
    tipo: str = Field(..., pattern="^(produto|saida)$")
    ativo: bool = True


class CategoriaCreate(CategoriaBase):
    pass


class CategoriaUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1, max_length=50)
    tipo: str | None = Field(default=None, pattern="^(produto|saida)$")
    ativo: bool | None = None


class CategoriaResponse(CategoriaBase):
    id: int
    criado_em: datetime

    model_config = {"from_attributes": True}


class DdaConfigResponse(BaseModel):
    cnpj_pagador: str | None = None
    cpf_pagador: str | None = None
    cnpj_pagador_formatado: str | None = None
    cpf_pagador_formatado: str | None = None


class DdaConfigUpdate(BaseModel):
    cnpj_pagador: str | None = Field(default=None, max_length=18)
    cpf_pagador: str | None = Field(default=None, max_length=14)


class ContaPagarRecorrenteBase(BaseModel):
    fornecedor: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1, max_length=200)
    categoria: str
    valor: float = Field(..., gt=0)
    dia_vencimento: int = Field(..., ge=1, le=28)
    frequencia: str = Field(default="Mensal")
    ativo: bool = True
    is_dda: bool = False
    fornecedor_id: int | None = None
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("frequencia")
    @classmethod
    def validar_frequencia(cls, value: str) -> str:
        if value not in FREQUENCIAS_RECORRENTE:
            raise ValueError(f"Frequência inválida. Opções: {', '.join(FREQUENCIAS_RECORRENTE)}")
        return value


class ContaPagarRecorrenteCreate(ContaPagarRecorrenteBase):
    pass


class ContaPagarRecorrenteUpdate(BaseModel):
    fornecedor: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    categoria: str | None = None
    valor: float | None = Field(default=None, gt=0)
    dia_vencimento: int | None = Field(default=None, ge=1, le=28)
    frequencia: str | None = None
    ativo: bool | None = None
    is_dda: bool | None = None
    fornecedor_id: int | None = None
    observacao: str | None = Field(default=None, max_length=500)

    @field_validator("frequencia")
    @classmethod
    def validar_frequencia(cls, value: str | None) -> str | None:
        if value is not None and value not in FREQUENCIAS_RECORRENTE:
            raise ValueError(f"Frequência inválida. Opções: {', '.join(FREQUENCIAS_RECORRENTE)}")
        return value


class ContaPagarRecorrenteResponse(ContaPagarRecorrenteBase):
    id: int
    criado_em: datetime

    model_config = {"from_attributes": True}


class ContaPagarBase(BaseModel):
    fornecedor: str = Field(..., min_length=1, max_length=200)
    descricao: str = Field(..., min_length=1, max_length=200)
    categoria: str
    valor: float = Field(..., gt=0)
    data_vencimento: date
    is_dda: bool = False
    linha_digitavel: str | None = Field(default=None, max_length=100)
    fornecedor_id: int | None = None
    documento_beneficiario: str | None = Field(default=None, max_length=18)
    observacao: str | None = Field(default=None, max_length=500)


class ContaPagarCreate(ContaPagarBase):
    pass


class ContaPagarUpdate(BaseModel):
    fornecedor: str | None = Field(default=None, min_length=1, max_length=200)
    descricao: str | None = Field(default=None, min_length=1, max_length=200)
    categoria: str | None = None
    valor: float | None = Field(default=None, gt=0)
    data_vencimento: date | None = None
    is_dda: bool | None = None
    linha_digitavel: str | None = Field(default=None, max_length=100)
    fornecedor_id: int | None = None
    documento_beneficiario: str | None = Field(default=None, max_length=18)
    observacao: str | None = Field(default=None, max_length=500)


class ContaPagarBaixa(BaseModel):
    forma_pagamento: str

    @field_validator("forma_pagamento")
    @classmethod
    def validar_forma_pagamento(cls, value: str) -> str:
        if value not in FORMAS_PAGAMENTO:
            raise ValueError(f"Forma de pagamento inválida. Opções: {', '.join(FORMAS_PAGAMENTO)}")
        return value


class ContaPagarResponse(ContaPagarBase):
    id: int
    status: str
    forma_pagamento: str | None = None
    data_pagamento: datetime | None = None
    recorrente_id: int | None = None
    referencia_mes: str | None = None
    saida_id: int | None = None
    documento_beneficiario_formatado: str | None = None
    fornecedor_documento: str | None = None
    fornecedor_documento_formatado: str | None = None
    criado_em: datetime

    model_config = {"from_attributes": True}


class ContasPagarResumo(BaseModel):
    quantidade_pendente: int
    total_pendente: float
    quantidade_dda: int
    total_dda: float
    quantidade_vencidas: int
    total_vencidas: float


class GerarContasPagarResultado(BaseModel):
    geradas: int
    ignoradas: int
    contas: list[ContaPagarResponse]
