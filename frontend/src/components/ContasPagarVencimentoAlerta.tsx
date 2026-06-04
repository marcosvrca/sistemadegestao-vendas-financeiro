import { AlertTriangle, CheckCircle } from 'lucide-react'
import { diasAteVencimento, labelVencimentoConta, tipoContaPagarLabel } from '../contasPagarUi'
import { formatarDataIso, formatarMoeda } from '../utils'
import type { ContaPagar } from '../types'

interface ContasPagarVencimentoAlertaProps {
  contas: ContaPagar[]
  onPagar?: (conta: ContaPagar) => void
}

export function ContasPagarVencimentoAlerta({ contas, onPagar }: ContasPagarVencimentoAlertaProps) {
  if (contas.length === 0) return null

  const total = contas.reduce((s, c) => s + c.valor, 0)

  return (
    <div className="av-alerta" style={{ marginBottom: '1.5rem' }}>
      <div className="av-alerta-header">
        <AlertTriangle size={20} />
        <div>
          <strong>Vencimento nos próximos 3 dias</strong>
          <p>
            {contas.length} conta{contas.length !== 1 ? 's' : ''} a vencer · Total:{' '}
            {formatarMoeda(total)}
          </p>
        </div>
      </div>
      <ul className="av-alerta-lista contas-pagar-alerta-lista">
        {contas.map((conta) => {
          const dias = diasAteVencimento(conta.data_vencimento)
          return (
            <li key={conta.id}>
              <span className="av-alerta-id">{tipoContaPagarLabel(conta)}</span>
              <span>{formatarDataIso(conta.data_vencimento)}</span>
              <span>{conta.fornecedor}</span>
              <span>{conta.descricao}</span>
              <span className="badge">{labelVencimentoConta(dias)}</span>
              <strong className="text-saida">{formatarMoeda(conta.valor)}</strong>
              {onPagar && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onPagar(conta)}
                  title="Registrar pagamento"
                >
                  <CheckCircle size={14} />
                  Pagar
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
