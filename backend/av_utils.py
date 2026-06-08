"""Regras de negócio para vendas AV (cliente paga depois)."""

from datetime import datetime

from sqlalchemy import func
from sqlalchemy.orm import Query as SqlQuery

from sqlalchemy import or_

from models import PagamentoVenda, Venda
from schemas import FORMA_PAGAMENTO_AV, FORMA_PAGAMENTO_MISTO


def data_efetiva_venda():
    """Data usada em relatórios: pagamento confirmado ou data da venda."""
    return func.coalesce(Venda.pago_em, Venda.data)


def venda_esta_paga(venda: Venda) -> bool:
    return venda.forma_pagamento != FORMA_PAGAMENTO_AV


def registrar_quitacao_av(venda: Venda, forma_anterior: str) -> None:
    """Ao sair de AV, grava data de pagamento para entrar nos totais do período."""
    if forma_anterior == FORMA_PAGAMENTO_AV and venda.forma_pagamento != FORMA_PAGAMENTO_AV:
        venda.pago_em = datetime.now()
    elif venda.forma_pagamento == FORMA_PAGAMENTO_AV:
        venda.pago_em = None


def aplicar_filtro_vendas_financeiras(query: SqlQuery, forma_pagamento: str | None) -> SqlQuery:
    """
    Vendas que entram em faturamento/dashboard/caixa.
    AV pendente fica de fora; filtro explícito AV lista só pendentes.
    """
    if forma_pagamento == FORMA_PAGAMENTO_AV:
        return query.filter(Venda.forma_pagamento == FORMA_PAGAMENTO_AV)
    query = query.filter(Venda.forma_pagamento != FORMA_PAGAMENTO_AV)
    if forma_pagamento == FORMA_PAGAMENTO_MISTO:
        return query.filter(Venda.forma_pagamento == FORMA_PAGAMENTO_MISTO)
    if forma_pagamento:
        return query.filter(
            or_(
                Venda.forma_pagamento == forma_pagamento,
                Venda.pagamentos.any(PagamentoVenda.forma_pagamento == forma_pagamento),
            )
        )
    return query
