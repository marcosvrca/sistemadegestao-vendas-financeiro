from sqlalchemy.orm import Session

from documento_utils import formatar_documento, limpar_documento
from models import ContaPagar, Fornecedor
from schemas import ContaPagarResponse


def resolver_documento_beneficiario(
    db: Session,
    fornecedor_id: int | None,
    documento_beneficiario: str | None,
) -> str | None:
    if fornecedor_id:
        fornecedor = db.query(Fornecedor).filter(Fornecedor.id == fornecedor_id).first()
        if fornecedor:
            return fornecedor.documento
    if documento_beneficiario:
        return limpar_documento(documento_beneficiario) or None
    return None


def serializar_conta_pagar(conta: ContaPagar) -> ContaPagarResponse:
    doc_benef = conta.documento_beneficiario
    doc_fornecedor = conta.fornecedor_cadastro.documento if conta.fornecedor_cadastro else None
    return ContaPagarResponse(
        id=conta.id,
        fornecedor=conta.fornecedor,
        descricao=conta.descricao,
        categoria=conta.categoria,
        valor=conta.valor,
        data_vencimento=conta.data_vencimento,
        is_dda=conta.is_dda,
        linha_digitavel=conta.linha_digitavel,
        fornecedor_id=conta.fornecedor_id,
        documento_beneficiario=doc_benef,
        observacao=conta.observacao,
        status=conta.status,
        forma_pagamento=conta.forma_pagamento,
        data_pagamento=conta.data_pagamento,
        recorrente_id=conta.recorrente_id,
        referencia_mes=conta.referencia_mes,
        saida_id=conta.saida_id,
        documento_beneficiario_formatado=formatar_documento(doc_benef) if doc_benef else None,
        fornecedor_documento=doc_fornecedor,
        fornecedor_documento_formatado=formatar_documento(doc_fornecedor) if doc_fornecedor else None,
        criado_em=conta.criado_em,
    )
