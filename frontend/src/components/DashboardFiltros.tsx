import { useEffect, useState } from 'react'
import { Filter } from 'lucide-react'
import { api } from '../api'
import type { DashboardFiltrosState, FiltroDashboard } from '../dashboardFilters'
import { filtrosIniciais } from '../dashboardFilters'

interface DashboardFiltrosProps {
  filtros: DashboardFiltrosState
  onChange: (filtros: DashboardFiltrosState) => void
  descricaoPeriodo?: string
}

export function DashboardFiltros({ filtros, onChange, descricaoPeriodo }: DashboardFiltrosProps) {
  const [formas, setFormas] = useState<string[]>([])
  const [produtos, setProdutos] = useState<string[]>([])
  const [categorias, setCategorias] = useState<string[]>([])

  useEffect(() => {
    api.getFormasPagamentoVenda().then(setFormas)
    api.getProdutosVendidos().then(setProdutos)
    api.getCategoriasSaida().then(setCategorias)
  }, [])

  function atualizar(campo: keyof DashboardFiltrosState, valor: string) {
    onChange({ ...filtros, [campo]: valor })
  }

  function setFiltro(filtro: FiltroDashboard) {
    onChange({ ...filtros, filtro })
  }

  function limpar() {
    onChange({ ...filtrosIniciais })
  }

  return (
    <div className="dashboard-filtros">
      <div className="dashboard-filtros-top">
        <div className="dashboard-filtros-title">
          <Filter size={18} />
          <span>Filtros do dashboard</span>
        </div>
        {descricaoPeriodo && (
          <span className="dashboard-filtros-resumo">{descricaoPeriodo}</span>
        )}
        <button type="button" className="btn btn-secondary btn-sm" onClick={limpar}>
          Limpar filtros
        </button>
      </div>

      <div className="kpi-filtros-periodo">
        {([
          ['hoje', 'Hoje'],
          ['mes', 'Mês'],
          ['periodo', 'Período'],
          ['data', 'Data'],
          ['total', 'Total'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`kpi-filtro-btn ${filtros.filtro === id ? 'active' : ''}`}
            onClick={() => setFiltro(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {filtros.filtro === 'periodo' && (
        <div className="kpi-filtros-datas">
          <input
            type="date"
            className="form-input form-input-sm"
            value={filtros.dataInicio}
            onChange={(e) => atualizar('dataInicio', e.target.value)}
          />
          <span className="kpi-filtro-sep">até</span>
          <input
            type="date"
            className="form-input form-input-sm"
            value={filtros.dataFim}
            onChange={(e) => atualizar('dataFim', e.target.value)}
          />
        </div>
      )}

      {filtros.filtro === 'data' && (
        <input
          type="date"
          className="form-input form-input-sm"
          value={filtros.dataEspecifica}
          onChange={(e) => atualizar('dataEspecifica', e.target.value)}
        />
      )}

      <div className="kpi-filtros-selects">
        <select
          className="form-select form-input-sm"
          value={filtros.formaPagamento}
          onChange={(e) => atualizar('formaPagamento', e.target.value)}
        >
          <option value="">Pagamento: todos</option>
          {formas.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        <select
          className="form-select form-input-sm"
          value={filtros.produto}
          onChange={(e) => atualizar('produto', e.target.value)}
        >
          <option value="">Produto: todos</option>
          {produtos.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          className="form-select form-input-sm"
          value={filtros.categoriaSaida}
          onChange={(e) => atualizar('categoriaSaida', e.target.value)}
        >
          <option value="">Categoria saída: todas</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
