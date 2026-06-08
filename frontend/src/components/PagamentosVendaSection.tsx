import { Plus, Trash2 } from 'lucide-react'
import {
  FORMA_CARTAO_CREDITO,
  FORMA_PAGAMENTO_AV,
  formatarMoeda,
} from '../utils'
import type { PagamentoForm } from '../pagamentosVendaHelpers'
import { criarPagamentoVazio, somaPagamentos } from '../pagamentosVendaHelpers'

const PAGAMENTO_CURTO: Record<string, string> = {
  'Cartão Débito': 'Débito',
  'Cartão Crédito': 'Crédito',
  AV: 'AV',
}

interface PagamentosVendaSectionProps {
  formas: string[]
  pagamentos: PagamentoForm[]
  dividirPagamento: boolean
  valorTotal: number
  onDividirPagamentoChange: (dividir: boolean) => void
  onPagamentosChange: (pagamentos: PagamentoForm[]) => void
  compact?: boolean
}

export function PagamentosVendaSection({
  formas,
  pagamentos,
  dividirPagamento,
  valorTotal,
  onDividirPagamentoChange,
  onPagamentosChange,
  compact = false,
}: PagamentosVendaSectionProps) {
  const principal = pagamentos[0] ?? criarPagamentoVazio()
  const isDinheiro = principal.forma_pagamento === 'Dinheiro'
  const isAV = principal.forma_pagamento === FORMA_PAGAMENTO_AV
  const isCredito = principal.forma_pagamento === FORMA_CARTAO_CREDITO
  const valorRecebidoNum =
    typeof principal.valor_recebido === 'number' ? principal.valor_recebido : 0
  const trocoCalculado =
    principal.houveTroco && valorRecebidoNum > 0
      ? Math.max(valorRecebidoNum - valorTotal, 0)
      : 0
  const valorParcela = isCredito && principal.parcelas > 0 ? valorTotal / principal.parcelas : 0
  const restante =
    dividirPagamento ? Math.max(valorTotal - somaPagamentos(pagamentos), 0) : 0

  function atualizarPrincipal(patch: Partial<PagamentoForm>) {
    onPagamentosChange([{ ...principal, ...patch }])
  }

  function atualizarPagamento(key: string, patch: Partial<PagamentoForm>) {
    onPagamentosChange(
      pagamentos.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    )
  }

  function adicionarPagamento() {
    onPagamentosChange([...pagamentos, criarPagamentoVazio('Pix')])
  }

  function removerPagamento(key: string) {
    if (pagamentos.length <= 2) return
    onPagamentosChange(pagamentos.filter((p) => p.key !== key))
  }

  function alternarDividir(dividir: boolean) {
    onDividirPagamentoChange(dividir)
    if (dividir) {
      const metade = Math.round((valorTotal / 2) * 100) / 100
      const resto = Math.round((valorTotal - metade) * 100) / 100
      onPagamentosChange([
        { ...principal, valor: metade },
        criarPagamentoVazio('Pix', resto),
      ])
      return
    }
    onPagamentosChange([
      {
        ...principal,
        valor: '',
        houveTroco: false,
        valor_recebido: '',
        parcelas: 1,
      },
    ])
  }

  if (compact) {
    return (
      <div className="form-group full-width">
        <label className="import-checkbox" style={{ marginBottom: '0.75rem' }}>
          <input
            type="checkbox"
            checked={dividirPagamento}
            onChange={(e) => alternarDividir(e.target.checked)}
          />
          Dividir em mais de uma forma de pagamento
        </label>

        {!dividirPagamento ? (
          <>
            <label className="form-label">Forma de Pagamento</label>
            <select
              className="form-select"
              value={principal.forma_pagamento}
              onChange={(e) => {
                const val = e.target.value
                atualizarPrincipal({
                  forma_pagamento: val,
                  houveTroco: false,
                  valor_recebido: '',
                  parcelas: 1,
                })
              }}
              required
            >
              {formas.map((f) => (
                <option key={f} value={f}>
                  {f === 'AV' ? 'AV — Cliente paga depois' : f}
                </option>
              ))}
            </select>
          </>
        ) : (
          <div className="pagamentos-divididos">
            {pagamentos.map((pagamento, index) => (
              <PagamentoDivididoRow
                key={pagamento.key}
                pagamento={pagamento}
                index={index}
                formas={formas.filter((f) => f !== FORMA_PAGAMENTO_AV)}
                podeRemover={pagamentos.length > 2}
                onChange={(patch) => atualizarPagamento(pagamento.key, patch)}
                onRemove={() => removerPagamento(pagamento.key)}
              />
            ))}
            <div className="pagamentos-divididos-footer">
              <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarPagamento}>
                <Plus size={14} /> Forma de pagamento
              </button>
              <span className={restante > 0.01 ? 'text-saida' : ''}>
                Restante: {formatarMoeda(restante)}
              </span>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="venda-compact-row venda-compact-pagamento">
        <span className="form-label venda-compact-pag-label">Pagamento</span>
        <label className="venda-compact-troco-check" style={{ marginRight: '0.75rem' }}>
          <input
            type="checkbox"
            checked={dividirPagamento}
            onChange={(e) => alternarDividir(e.target.checked)}
          />
          Dividir pagamento
        </label>
        {!dividirPagamento && isAV && (
          <span className="venda-compact-tag-av">Pendente até pagar</span>
        )}
      </div>

      {!dividirPagamento ? (
        <>
          <div className="venda-compact-row venda-compact-pagamento">
            <div className="venda-compact-pag-btns" role="group" aria-label="Forma de pagamento">
              {formas.map((forma) => (
                <button
                  key={forma}
                  type="button"
                  className={`venda-compact-pag ${principal.forma_pagamento === forma ? 'active' : ''} ${forma === 'AV' ? 'is-av' : ''}`}
                  onClick={() =>
                    atualizarPrincipal({
                      forma_pagamento: forma,
                      houveTroco: false,
                      valor_recebido: '',
                      parcelas: 1,
                    })
                  }
                >
                  {PAGAMENTO_CURTO[forma] ?? forma}
                </button>
              ))}
            </div>
          </div>

          {isCredito && (
            <div className="venda-compact-parcelas">
              <div className="form-group venda-compact-parcelas-field">
                <label className="form-label">Parcelamento</label>
                <select
                  className="form-select"
                  value={principal.parcelas}
                  onChange={(e) =>
                    atualizarPrincipal({ parcelas: parseInt(e.target.value, 10) || 1 })
                  }
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}x {n === 1 ? '(à vista no crédito)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              {principal.parcelas > 1 && (
                <p className="venda-compact-parcelas-hint">
                  {principal.parcelas}x de <strong>{formatarMoeda(valorParcela)}</strong> — total{' '}
                  {formatarMoeda(valorTotal)}
                </p>
              )}
            </div>
          )}

          {isDinheiro && (
            <div className="venda-compact-troco-section">
              <label className="venda-compact-troco-check">
                <input
                  type="checkbox"
                  checked={principal.houveTroco}
                  onChange={(e) =>
                    atualizarPrincipal({
                      houveTroco: e.target.checked,
                      valor_recebido: e.target.checked ? principal.valor_recebido : '',
                    })
                  }
                />
                Houve troco?
              </label>
              {principal.houveTroco && (
                <div className="venda-compact-troco-fields">
                  <div className="form-group">
                    <label className="form-label">Valor recebido (R$)</label>
                    <input
                      type="number"
                      className="form-input"
                      min={0}
                      step={0.01}
                      placeholder="Ex: 150,00"
                      value={principal.valor_recebido}
                      onChange={(e) =>
                        atualizarPrincipal({
                          valor_recebido: e.target.value ? parseFloat(e.target.value) : '',
                        })
                      }
                    />
                  </div>
                  <div className="venda-compact-troco-resultado">
                    <span className="form-label">Troco a devolver</span>
                    <strong>{formatarMoeda(trocoCalculado)}</strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="pagamentos-divididos" style={{ marginBottom: '1rem' }}>
          {pagamentos.map((pagamento, index) => (
            <PagamentoDivididoRow
              key={pagamento.key}
              pagamento={pagamento}
              index={index}
              formas={formas.filter((f) => f !== FORMA_PAGAMENTO_AV)}
              podeRemover={pagamentos.length > 2}
              onChange={(patch) => atualizarPagamento(pagamento.key, patch)}
              onRemove={() => removerPagamento(pagamento.key)}
            />
          ))}
          <div className="pagamentos-divididos-footer">
            <button type="button" className="btn btn-secondary btn-sm" onClick={adicionarPagamento}>
              <Plus size={14} /> Forma de pagamento
            </button>
            <span className={restante > 0.01 ? 'text-saida' : ''}>
              Restante: {formatarMoeda(restante)} · Total: {formatarMoeda(valorTotal)}
            </span>
          </div>
        </div>
      )}
    </>
  )
}

interface PagamentoDivididoRowProps {
  pagamento: PagamentoForm
  index: number
  formas: string[]
  podeRemover: boolean
  onChange: (patch: Partial<PagamentoForm>) => void
  onRemove: () => void
}

function PagamentoDivididoRow({
  pagamento,
  index,
  formas,
  podeRemover,
  onChange,
  onRemove,
}: PagamentoDivididoRowProps) {
  const isDinheiro = pagamento.forma_pagamento === 'Dinheiro'
  const isCredito = pagamento.forma_pagamento === FORMA_CARTAO_CREDITO
  const valorNum = typeof pagamento.valor === 'number' ? pagamento.valor : 0
  const recebidoNum =
    typeof pagamento.valor_recebido === 'number' ? pagamento.valor_recebido : 0
  const troco =
    pagamento.houveTroco && recebidoNum > 0 ? Math.max(recebidoNum - valorNum, 0) : 0

  return (
    <div className="pagamento-dividido-row">
      <div className="pagamento-dividido-top">
        <strong>Pagamento {index + 1}</strong>
        {podeRemover && (
          <button type="button" className="btn btn-icon btn-ghost" onClick={onRemove} title="Remover">
            <Trash2 size={15} />
          </button>
        )}
      </div>
      <div className="pagamento-dividido-grid">
        <div className="form-group">
          <label className="form-label">Forma</label>
          <select
            className="form-select"
            value={pagamento.forma_pagamento}
            onChange={(e) =>
              onChange({
                forma_pagamento: e.target.value,
                houveTroco: false,
                valor_recebido: '',
                parcelas: 1,
              })
            }
          >
            {formas.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Valor (R$)</label>
          <input
            type="number"
            className="form-input"
            min={0}
            step={0.01}
            value={pagamento.valor}
            onChange={(e) =>
              onChange({ valor: e.target.value ? parseFloat(e.target.value) : '' })
            }
            required
          />
        </div>
        {isCredito && (
          <div className="form-group">
            <label className="form-label">Parcelas</label>
            <select
              className="form-select"
              value={pagamento.parcelas}
              onChange={(e) =>
                onChange({ parcelas: parseInt(e.target.value, 10) || 1 })
              }
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}x
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {isDinheiro && (
        <div className="pagamento-dividido-troco">
          <label className="import-checkbox">
            <input
              type="checkbox"
              checked={pagamento.houveTroco}
              onChange={(e) =>
                onChange({
                  houveTroco: e.target.checked,
                  valor_recebido: e.target.checked ? pagamento.valor_recebido : '',
                })
              }
            />
            Houve troco neste pagamento em dinheiro?
          </label>
          {pagamento.houveTroco && (
            <div className="troco-fields">
              <div className="form-group">
                <label className="form-label">Valor recebido (R$)</label>
                <input
                  type="number"
                  className="form-input"
                  min={0}
                  step={0.01}
                  value={pagamento.valor_recebido}
                  onChange={(e) =>
                    onChange({
                      valor_recebido: e.target.value ? parseFloat(e.target.value) : '',
                    })
                  }
                />
              </div>
              <span className="form-hint">Troco: {formatarMoeda(troco)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
