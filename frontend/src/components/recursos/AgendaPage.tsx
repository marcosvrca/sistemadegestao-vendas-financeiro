import { useEffect, useState, FormEvent } from 'react'
import { Plus, Trash2, Pencil, Save, X } from 'lucide-react'
import { PageShell } from '../PageShell'
import { BotaoAlerta } from '../BotaoAlerta'
import {
  carregarEventosAgenda,
  salvarEventosAgenda,
  alternarAlertaEvento,
  eventoEhPassado,
  formatarPeriodoEvento,
  gerarId,
  type EventoAgenda,
} from '../../recursosStorage'

const formInicial = {
  titulo: '',
  descricao: '',
  data: '',
  dataFim: '',
  hora: '',
  alerta: false,
}

export function AgendaPage() {
  const [eventos, setEventos] = useState<EventoAgenda[]>([])
  const [form, setForm] = useState(formInicial)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [erroForm, setErroForm] = useState('')

  useEffect(() => {
    setEventos(carregarEventosAgenda())
  }, [])

  function persistir(lista: EventoAgenda[]) {
    setEventos(lista)
    salvarEventosAgenda(lista)
  }

  function recarregar() {
    setEventos(carregarEventosAgenda())
  }

  function resetForm() {
    setForm(formInicial)
    setEditandoId(null)
    setMostrarForm(false)
    setErroForm('')
  }

  function editar(ev: EventoAgenda) {
    setForm({
      titulo: ev.titulo,
      descricao: ev.descricao,
      data: ev.data,
      dataFim: ev.dataFim && ev.dataFim > ev.data ? ev.dataFim : '',
      hora: ev.hora,
      alerta: Boolean(ev.alerta),
    })
    setEditandoId(ev.id)
    setMostrarForm(true)
    setErroForm('')
  }

  function normalizarDataFim(data: string, dataFim: string): string | undefined {
    if (!dataFim || dataFim <= data) return undefined
    return dataFim
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.data) return

    if (form.dataFim && form.dataFim < form.data) {
      setErroForm('A data final deve ser igual ou posterior à data inicial.')
      return
    }

    const dataFim = normalizarDataFim(form.data, form.dataFim)

    if (editandoId) {
      persistir(
        eventos.map((ev) =>
          ev.id === editandoId
            ? {
                ...ev,
                titulo: form.titulo.trim(),
                descricao: form.descricao.trim(),
                data: form.data,
                dataFim,
                hora: form.hora,
                alerta: form.alerta,
                alertaOrigem: form.alerta ? (ev.alertaOrigem ?? 'agenda') : undefined,
              }
            : ev
        )
      )
    } else {
      const novo: EventoAgenda = {
        id: gerarId(),
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim(),
        data: form.data,
        dataFim,
        hora: form.hora,
        criadoEm: new Date().toISOString(),
        alerta: form.alerta,
        alertaOrigem: form.alerta ? 'agenda' : undefined,
      }
      persistir([novo, ...eventos])
    }
    resetForm()
  }

  function excluir(id: string) {
    if (!confirm('Excluir este evento?')) return
    persistir(eventos.filter((ev) => ev.id !== id))
    if (editandoId === id) resetForm()
  }

  function toggleAlerta(id: string) {
    alternarAlertaEvento(id, 'agenda')
    recarregar()
  }

  const ordenados = [...eventos].sort((a, b) => {
    const cmp = a.data.localeCompare(b.data)
    return cmp !== 0 ? cmp : a.hora.localeCompare(b.hora)
  })

  const hoje = new Date().toISOString().slice(0, 10)
  const proximos = ordenados.filter((ev) => !eventoEhPassado(ev, hoje))
  const passados = ordenados.filter((ev) => eventoEhPassado(ev, hoje))

  return (
    <PageShell
      title="Agenda"
      subtitle="Organize compromissos e lembretes por dia ou por período"
      width="narrow"
      actions={
        !mostrarForm ? (
          <button type="button" className="btn btn-primary" onClick={() => setMostrarForm(true)}>
            <Plus size={18} />
            Novo evento
          </button>
        ) : undefined
      }
    >
      <div className="agenda-page-content page-stack">
        {mostrarForm && (
          <form className="form-card form-card--full" onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Título *</label>
                <input
                  className="form-input"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Ex: Reunião com fornecedor"
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">De *</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.data}
                  max={form.dataFim || undefined}
                  onChange={(e) => setForm({ ...form, data: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Até</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dataFim}
                  min={form.data || undefined}
                  onChange={(e) => setForm({ ...form, dataFim: e.target.value })}
                  placeholder="Opcional — evento de um dia só"
                />
              </div>
              <div className="form-group full-width">
                <p className="agenda-periodo-dica">
                  Para evento em um único dia, preencha apenas &quot;De&quot;. Para período, informe as duas datas
                  (ex.: 31/05/2026 a 10/06/2026).
                </p>
              </div>
              <div className="form-group">
                <label className="form-label">Hora</label>
                <input
                  type="time"
                  className="form-input"
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Descrição</label>
                <textarea
                  className="form-input form-textarea"
                  rows={3}
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  placeholder="Detalhes opcionais..."
                />
              </div>
              <div className="form-group full-width">
                <label className="import-checkbox">
                  <input
                    type="checkbox"
                    checked={form.alerta}
                    onChange={(e) => setForm({ ...form, alerta: e.target.checked })}
                  />
                  Marcar como alerta (aparece em Início → Alertas)
                </label>
              </div>
            </div>
            {erroForm && <div className="error-message">{erroForm}</div>}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <Save size={18} />
                {editandoId ? 'Salvar alterações' : 'Adicionar'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetForm}>
                <X size={18} />
                Cancelar
              </button>
            </div>
          </form>
        )}

        {proximos.length === 0 && passados.length === 0 ? (
          <div className="empty-state empty-state--panel">
            Nenhum evento cadastrado. Clique em &quot;Novo evento&quot; para começar.
          </div>
        ) : (
          <>
            {proximos.length > 0 && (
              <div className="table-card">
                <div className="card-body">
                  <h3 className="card-section-title">Próximos eventos</h3>
                  <ListaEventos
                    eventos={proximos}
                    onEditar={editar}
                    onExcluir={excluir}
                    onAlternarAlerta={toggleAlerta}
                  />
                </div>
              </div>
            )}
            {passados.length > 0 && (
              <div className="table-card">
                <div className="card-body">
                  <h3 className="card-section-title card-section-title--muted">Eventos passados</h3>
                  <ListaEventos
                    eventos={passados}
                    onEditar={editar}
                    onExcluir={excluir}
                    onAlternarAlerta={toggleAlerta}
                    passado
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  )
}

function ListaEventos({
  eventos,
  onEditar,
  onExcluir,
  onAlternarAlerta,
  passado,
}: {
  eventos: EventoAgenda[]
  onEditar: (ev: EventoAgenda) => void
  onExcluir: (id: string) => void
  onAlternarAlerta: (id: string) => void
  passado?: boolean
}) {
  return (
    <div className="agenda-lista">
      {eventos.map((ev) => (
        <div key={ev.id} className={`agenda-item ${passado ? 'agenda-item-passado' : ''} ${ev.alerta ? 'agenda-item-alerta' : ''}`}>
          <div className="agenda-item-data">
            <span className="agenda-data-dia">
              {formatarPeriodoEvento(ev.data, ev.dataFim)}
            </span>
            {ev.hora && <span className="agenda-data-hora">{ev.hora}</span>}
          </div>
          <div className="agenda-item-conteudo">
            <strong>{ev.titulo}</strong>
            {ev.descricao && <span>{ev.descricao}</span>}
          </div>
          <div className="agenda-item-acoes">
            <BotaoAlerta ativo={Boolean(ev.alerta)} onClick={() => onAlternarAlerta(ev.id)} size={16} />
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onEditar(ev)} title="Editar">
              <Pencil size={16} />
            </button>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onExcluir(ev.id)} title="Excluir">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
