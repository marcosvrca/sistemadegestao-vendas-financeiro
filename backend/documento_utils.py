import re

TIPO_CPF = "cpf"
TIPO_CNPJ = "cnpj"


def limpar_documento(valor: str | None) -> str:
    if not valor:
        return ""
    return re.sub(r"\D", "", valor.strip())


def tipo_documento(documento: str) -> str:
    doc = limpar_documento(documento)
    if len(doc) == 11:
        return TIPO_CPF
    if len(doc) == 14:
        return TIPO_CNPJ
    raise ValueError("Documento deve ter 11 dígitos (CPF) ou 14 dígitos (CNPJ)")


def validar_documento(documento: str) -> str:
    doc = limpar_documento(documento)
    tipo_documento(doc)
    return doc


def formatar_documento(documento: str) -> str:
    doc = limpar_documento(documento)
    if len(doc) == 11:
        return f"{doc[0:3]}.{doc[3:6]}.{doc[6:9]}-{doc[9:11]}"
    if len(doc) == 14:
        return f"{doc[0:2]}.{doc[2:5]}.{doc[5:8]}/{doc[8:12]}-{doc[12:14]}"
    return documento
