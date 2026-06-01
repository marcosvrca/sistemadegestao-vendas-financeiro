import { useEffect, useState } from 'react'
import {
  Package,
  Boxes,
  AlertTriangle,
  ArrowDownUp,
  FileCode2,
  PlusCircle,
} from 'lucide-react'
import { api } from '../api'
import { formatarMoeda } from '../utils'
import { KPICard } from './KPICard'
import type { EstoqueResumo } from '../types'
import type { Pagina } from '../navigation'

interface EstoqueResumoPageProps {
  onNavigate?: (pagina: Pagina) => void
}

export function EstoqueResumoPage({ onNavigate }: EstoqueResumoPageProps) {
  const [resumo, setResumo] = useState<EstoqueResumo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getEstoqueResumo()
      .then(setResumo)
      .finally(() => setLoading(false))
  }, [])

  const atalhos: { pagina: Pagina; label: string; desc: string; icon: typeof Package }[] = [
    {
      pagina: 'produtos',
      label: 'Catálogo de Produtos',
      desc: 'Cadastrar e editar produtos',
      icon: Package,
    },
    {
      pagina: 'estoque-movimentacoes',
      label: 'Movimentações',
      desc: 'Entradas, saídas e ajustes',
      icon: ArrowDownUp,
    },
    {
      pagina: 'estoque-importar-xml',
      label: 'Importar XML',
      desc: 'Entrada via NF-e',
      icon: FileCode2,
    },
    {
      pagina: 'nova-venda',
      label: 'Nova Venda',
      desc: 'Baixa automática no estoque',
      icon: PlusCircle,
    },
  ]

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Visão do Estoque</h1>
        <p className="page-subtitle">Indicadores e atalhos do módulo de estoque</p>
      </div>

      {loading ? (
        <div className="loading">Carregando resumo...</div>
      ) : resumo ? (
        <div className="kpi-grid" style={{ marginBottom: '1.5rem' }}>
          <KPICard
            label="Produtos ativos"
            value={String(resumo.produtos_ativos)}
            icon={Package}
            iconColor="blue"
            subtitle={`${resumo.total_produtos} cadastrados`}
          />
          <KPICard
            label="Unidades em estoque"
            value={String(resumo.total_unidades)}
            icon={Boxes}
            iconColor="green"
          />
          <KPICard
            label="Valor em estoque"
            value={formatarMoeda(resumo.valor_total_estoque)}
            icon={Package}
            iconColor="gold"
          />
          <KPICard
            label="Alertas"
            value={String(resumo.produtos_estoque_baixo + resumo.produtos_sem_estoque)}
            icon={AlertTriangle}
            iconColor="red"
            subtitle={`${resumo.produtos_sem_estoque} zerados · ${resumo.produtos_estoque_baixo} baixos`}
          />
        </div>
      ) : null}

      <div className="atalhos-grid">
        {atalhos.map(({ pagina, label, desc, icon: Icon }) => (
          <button
            key={pagina}
            type="button"
            className="atalho-card"
            onClick={() => onNavigate?.(pagina)}
            disabled={!onNavigate}
          >
            <span className="atalho-card-icon">
              <Icon size={22} />
            </span>
            <strong>{label}</strong>
            <span>{desc}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
