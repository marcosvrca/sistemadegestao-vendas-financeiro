import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageShell } from '../PageShell'
import { BotaoAlerta } from '../BotaoAlerta'
import {
  alternarAlertaEvento,
  carregarEventosAgenda,
  montarMapaEventosPorDia,
  formatarPeriodoEvento,
  type EventoAgenda,
} from '../../recursosStorage'
import { useAlertasRecursos } from '../../useAlertasRecursos'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function toIso(ano: number, mes: number, dia: number): string {
  return `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

export function CalendarioPage() {
  const hoje = new Date()
  const [mesAtual, setMesAtual] = useState(hoje.getMonth())
  const [anoAtual, setAnoAtual] = useState(hoje.getFullYear())
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(
    toIso(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  )

  const alertas = useAlertasRecursos()

  const eventos = useMemo(
    () => carregarEventosAgenda(),
    [mesAtual, anoAtual, alertas.total]
  )

  const eventosPorData = useMemo(
    () => montarMapaEventosPorDia(eventos),
    [eventos]
  )

  const dias = useMemo(() => {
    const primeiro = new Date(anoAtual, mesAtual, 1)
    const ultimo = new Date(anoAtual, mesAtual + 1, 0)
    const inicioSemana = primeiro.getDay()
    const totalDias = ultimo.getDate()

    const celulas: (number | null)[] = []
    for (let i = 0; i < inicioSemana; i++) celulas.push(null)
    for (let d = 1; d <= totalDias; d++) celulas.push(d)
    while (celulas.length % 7 !== 0) celulas.push(null)
    return celulas
  }, [mesAtual, anoAtual])

  function mesAnterior() {
    if (mesAtual === 0) {
      setMesAtual(11)
      setAnoAtual((a) => a - 1)
    } else {
      setMesAtual((m) => m - 1)
    }
  }

  function proximoMes() {
    if (mesAtual === 11) {
      setMesAtual(0)
      setAnoAtual((a) => a + 1)
    } else {
      setMesAtual((m) => m + 1)
    }
  }

  function toggleAlerta(id: string) {
    alternarAlertaEvento(id, 'calendario')
  }

  const hojeIso = toIso(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
  const eventosDia = diaSelecionado ? (eventosPorData.get(diaSelecionado) ?? []) : []

  return (
    <PageShell
      title="Calendário"
      subtitle="Visualize o calendário mensal e marque eventos como alerta"
      width="narrow"
    >
      <div className="calendario-layout">
        <div className="panel-card calendario-card">
          <div className="calendario-nav">
            <button type="button" className="btn btn-ghost btn-icon" onClick={mesAnterior} aria-label="Mês anterior">
              <ChevronLeft size={20} />
            </button>
            <h2 className="calendario-titulo">
              {MESES[mesAtual]} {anoAtual}
            </h2>
            <button type="button" className="btn btn-ghost btn-icon" onClick={proximoMes} aria-label="Próximo mês">
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="calendario-grade">
            {DIAS_SEMANA.map((d) => (
              <div key={d} className="calendario-cabecalho">{d}</div>
            ))}
            {dias.map((dia, i) => {
              if (dia === null) return <div key={`v-${i}`} className="calendario-celula calendario-vazia" />
              const iso = toIso(anoAtual, mesAtual, dia)
              const lista = eventosPorData.get(iso) ?? []
              const temEvento = lista.length > 0
              const temAlerta = lista.some((ev) => ev.alerta)
              const ehHoje = iso === hojeIso
              const selecionado = iso === diaSelecionado
              return (
                <button
                  key={iso}
                  type="button"
                  className={`calendario-celula calendario-dia ${ehHoje ? 'calendario-hoje' : ''} ${selecionado ? 'calendario-selecionado' : ''} ${temEvento ? 'calendario-com-evento' : ''} ${temAlerta ? 'calendario-com-alerta' : ''}`}
                  onClick={() => setDiaSelecionado(iso)}
                >
                  {dia}
                </button>
              )
            })}
          </div>
        </div>

        <div className="panel-card calendario-detalhe">
          <h3 className="calendario-detalhe-titulo">
            {diaSelecionado
              ? new Date(diaSelecionado + 'T12:00:00').toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : 'Selecione um dia'}
          </h3>
          {eventosDia.length === 0 ? (
            <p className="empty-state empty-state--compact">Nenhum evento neste dia</p>
          ) : (
            <ul className="calendario-eventos-lista">
              {eventosDia.map((ev) => (
                <li key={ev.id} className={`calendario-evento-item ${ev.alerta ? 'calendario-evento-alerta' : ''}`}>
                  <div className="calendario-evento-topo">
                    <strong>
                      {ev.hora ? `${ev.hora} — ` : ''}
                      {ev.titulo}
                      {ev.dataFim && ev.dataFim > ev.data && (
                        <span className="calendario-evento-periodo">
                          {' '}({formatarPeriodoEvento(ev.data, ev.dataFim)})
                        </span>
                      )}
                    </strong>
                    <BotaoAlerta
                      ativo={Boolean(ev.alerta)}
                      onClick={() => toggleAlerta(ev.id)}
                      size={16}
                    />
                  </div>
                  {ev.descricao && <span>{ev.descricao}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="calendario-dica">Eventos são cadastrados na Agenda. Marque como alerta para ver em Início → Alertas.</p>
        </div>
      </div>
    </PageShell>
  )
}
