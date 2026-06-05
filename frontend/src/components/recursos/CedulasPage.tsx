import { useMemo, useState, FormEvent } from 'react'
import { Plus, Save, X, Trash2, Banknote } from 'lucide-react'
import { PageShell } from '../PageShell'
import { formatarMoeda } from '../../utils'
import {
  carregarRegistrosCedulas,
  salvarRegistrosCedulas,
  gerarId,
  type RegistroCedulas,
} from '../../cedulasStorage'

type TipoCedula = 'cedula' | 'moeda'

interface Denominacao {
  id: string
  label: string
  valor: number
  tipo: TipoCedula
}

const DENOMINACOES: Denominacao[] = [
  { id: '200', label: 'R$ 200', valor: 200, tipo: 'cedula' },
  { id: '100', label: 'R$ 100', valor: 100, tipo: 'cedula' },
  { id: '50', label: 'R$ 50', valor: 50, tipo: 'cedula' },
  { id: '20', label: 'R$ 20', valor: 20, tipo: 'cedula' },
  { id: '10', label: 'R$ 10', valor: 10, tipo: 'cedula' },
  { id: '5', label: 'R$ 5', valor: 5, tipo: 'cedula' },
  { id: '2', label: 'R$ 2', valor: 2, tipo: 'cedula' },
  { id: '1', label: 'R$ 1', valor: 1, tipo: 'moeda' },
  { id: '0.50', label: 'R$ 0,50', valor: 0.5, tipo: 'moeda' },
  { id: '0.25', label: 'R$ 0,25', valor: 0.25, tipo: 'moeda' },
  { id: '0.10', label: 'R$ 0,10', valor: 0.1, tipo: 'moeda' },
  { id: '0.05', label: 'R$ 0,05', valor: 0.05, tipo: 'moeda' },
]

function quantidadesIniciais(): Record<string, number> {
  return Object.fromEntries(DENOMINACOES.map((d) => [d.id, 0]))
}

function calcularTotal(quantidades: Record<string, number>): number {
  return DENOMINACOES.reduce((soma, d) => soma + (quantidades[d.id] || 0) * d.valor, 0)
}

function GrupoDenominacoes({
  titulo,
  tipo,
  quantidades,
  onQuantidade,
}: {
  titulo: string
  tipo: TipoCedula
  quantidades: Record<string, number>
  onQuantidade: (id: string, valor: string) => void
}) {
  const itens = DENOMINACOES.filter((d) => d.tipo === tipo)

  return (
    <div className="cedulas-grupo">
      <h4 className="cedulas-grupo-titulo">{titulo}</h4>
      <div className="cedulas-grid-head">
        <span>Valor</span>
        <span>Qtd</span>
        <span>Subtotal</span>
      </div>
      <div className="cedulas-grid-linhas">
        {itens.map((d) => {
          const qtd = quantidades[d.id] || 0
          const subtotal = qtd * d.valor
          return (
            <div key={d.id} className="cedulas-linha">
              <span className="cedulas-valor">{d.label}</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                className="form-input cedulas-qtd-input"
                value={qtd || ''}
                placeholder="0"
                onChange={(e) => onQuantidade(d.id, e.target.value)}
              />
              <span className="cedulas-subtotal">{formatarMoeda(subtotal)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function CedulasPage() {
  const [registros, setRegistros] = useState<RegistroCedulas[]>(() => carregarRegistrosCedulas())
  const [mostrarForm, setMostrarForm] = useState(false)
  const [quantidades, setQuantidades] = useState(quantidadesIniciais)

  const total = useMemo(() => calcularTotal(quantidades), [quantidades])
  const temQuantidade = total > 0

  function atualizarQuantidade(id: string, valor: string) {
    const qtd = Math.max(0, parseInt(valor, 10) || 0)
    setQuantidades((atual) => ({ ...atual, [id]: qtd }))
  }

  function resetForm() {
    setQuantidades(quantidadesIniciais())
    setMostrarForm(false)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!temQuantidade) return

    const novo: RegistroCedulas = {
      id: gerarId(),
      criadoEm: new Date().toISOString(),
      quantidades: { ...quantidades },
      total,
    }
    const lista = [novo, ...registros]
    setRegistros(lista)
    salvarRegistrosCedulas(lista)
    resetForm()
  }

  function excluirRegistro(id: string) {
    if (!confirm('Excluir este registro?')) return
    const lista = registros.filter((r) => r.id !== id)
    setRegistros(lista)
    salvarRegistrosCedulas(lista)
  }

  return (
    <PageShell
      title="Registrar Cédulas"
      subtitle="Informe a quantidade de cada valor — o total é calculado na hora"
      width="form"
      actions={
        !mostrarForm ? (
          <button type="button" className="btn btn-primary" onClick={() => setMostrarForm(true)}>
            <Plus size={18} />
            Novo registro
          </button>
        ) : undefined
      }
    >
      {mostrarForm ? (
        <form className="cedulas-form" onSubmit={handleSubmit}>
          <div className="cedulas-form-corpo">
            <GrupoDenominacoes
              titulo="Cédulas"
              tipo="cedula"
              quantidades={quantidades}
              onQuantidade={atualizarQuantidade}
            />
            <GrupoDenominacoes
              titulo="Moedas"
              tipo="moeda"
              quantidades={quantidades}
              onQuantidade={atualizarQuantidade}
            />
          </div>

          <div className="cedulas-form-rodape">
            <div className="cedulas-total-inline">
              <span>Total</span>
              <strong>{formatarMoeda(total)}</strong>
            </div>
            <div className="cedulas-form-acoes">
              <button type="submit" className="btn btn-primary" disabled={!temQuantidade}>
                <Save size={18} />
                Salvar
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                <X size={18} />
                Cancelar
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="table-card cedulas-historico-wrap">
          <div className="card-body">
            <h3 className="card-section-title">Registros salvos</h3>
            {registros.length === 0 ? (
              <p className="empty-state empty-state--compact">
                Nenhum registro ainda. Clique em &quot;Novo registro&quot; para contar o dinheiro.
              </p>
            ) : (
              <ul className="cedulas-historico">
                {registros.map((reg) => (
                  <li key={reg.id} className="cedulas-historico-item">
                    <div className="cedulas-historico-info">
                      <Banknote size={18} />
                      <div>
                        <strong>{formatarMoeda(reg.total)}</strong>
                        <span>{new Date(reg.criadoEm).toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Excluir registro"
                      onClick={() => excluirRegistro(reg.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </PageShell>
  )
}
