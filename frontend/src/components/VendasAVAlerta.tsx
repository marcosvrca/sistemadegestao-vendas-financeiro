import { AlertTriangle } from 'lucide-react'
import { formatarDataCurta, formatarMoeda } from '../utils'
import type { VendasAVPendentes } from '../types'

interface VendasAVAlertaProps {
  dados: VendasAVPendentes
  compacto?: boolean
}

export function VendasAVAlerta({ dados, compacto }: VendasAVAlertaProps) {
  if (dados.quantidade === 0) return null

  return (
    <div className="av-alerta">
      <div className="av-alerta-header">
        <AlertTriangle size={20} />
        <div>
          <strong>Vendas AV — pagamento pendente</strong>
          <p>
            {dados.quantidade} venda(s) aguardando pagamento · Total: {formatarMoeda(dados.total)}
          </p>
        </div>
      </div>
      {!compacto && (
        <ul className="av-alerta-lista">
          {dados.vendas.map((venda) => (
            <li key={venda.id}>
              <span className="av-alerta-id">#{venda.id}</span>
              <span>{formatarDataCurta(venda.data)}</span>
              <span>{venda.cliente}</span>
              <span>{venda.produto}</span>
              <strong>{formatarMoeda(venda.valor)}</strong>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
