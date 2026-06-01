# Recanto da Fé — Sistema de Gestão Comercial

Sistema de gestão para a loja de artigos religiosos **Recanto da Fé**: vendas, estoque, financeiro (caixa, contas a pagar) e cadastros.

**Repositório:** [github.com/marcosvrca/sistemadegestao-vendas-financeiro](https://github.com/marcosvrca/sistemadegestao-vendas-financeiro)

## Funcionalidades

### Cadastro de Vendas
- ID automático
- Data e hora
- Produto
- Cliente
- Quantidade
- Valor unitário
- Desconto
- Valor total (calculado automaticamente)
- Forma de pagamento (Dinheiro, Pix, Cartão Débito, Cartão Crédito, Outro)
- Observação opcional

### Dashboard
- **KPIs:** faturamento total, vendas do mês, vendas do dia, ticket médio, total de vendas, itens vendidos, descontos concedidos
- **Gráficos:**
  - Evolução de vendas (últimos 30 dias)
  - Distribuição por forma de pagamento
  - Vendas diárias do mês atual
  - Top 5 produtos
  - Top 5 clientes

### Histórico de Vendas
- Listagem completa com filtros por produto, cliente e forma de pagamento
- Exclusão de vendas

## Tecnologias

- **Backend:** Python + FastAPI + SQLite (banco local)
- **Frontend:** React + TypeScript + Vite + Recharts

## Como executar

### Pré-requisitos
- Python 3.10+
- Node.js 18+

### 1. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2. Frontend

Em outro terminal:

```bash
cd frontend
npm install
npm run dev
```

### 3. Acessar

Abra no navegador: **http://localhost:5173**

> O sistema inclui dados de exemplo na primeira execução para demonstrar o dashboard.

## Atalho rápido (Windows)

Execute o arquivo `iniciar.bat` na raiz do projeto para subir backend e frontend automaticamente.

## Estrutura

```
recanto-da-fe/
├── backend/
│   ├── main.py          # API REST
│   ├── models.py        # Modelo de vendas
│   ├── schemas.py       # Validação de dados
│   ├── database.py      # SQLite local
│   └── recanto_da_fe.db # Banco (criado automaticamente)
├── frontend/
│   └── src/
│       ├── components/  # Dashboard, Vendas, Formulário
│       └── api.ts       # Comunicação com backend
└── iniciar.bat
```

## API

Documentação interativa disponível em: **http://localhost:8000/docs**

## Publicar no GitHub

Na pasta `recanto-da-fe`, com [Git instalado](https://git-scm.com/download/win):

```powershell
.\publicar-github.ps1
```

Ou manualmente:

```powershell
git init
git branch -M main
git remote add origin https://github.com/marcosvrca/sistemadegestao-vendas-financeiro.git
git add -A
git commit -m "Sistema de gestao: vendas, estoque, financeiro e cadastros"
git push -u origin main
```

O arquivo `.gitignore` exclui `venv`, `node_modules` e o banco SQLite local.
