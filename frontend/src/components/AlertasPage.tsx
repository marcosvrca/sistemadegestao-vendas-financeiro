import { Calendar, CalendarDays, StickyNote, Bell, ExternalLink, X } from 'lucide-react'
import { PageShell } from './PageShell'
import type { Pagina } from '../navigation'
import {
  type AlertaItem,
  type TipoAlerta,
  formatarPeriodoEvento,
  paginaDoAlerta,
  removerAlerta,
} from '../recursosStorage'
import { useAlertasRecursos } from '../useAlertasRecursos'

interface AlertasPageProps {
  onNavigate?: (pagina: Pagina) => void
}

const SECOES: {
  chave: 'notas' | 'agenda' | 'calendario'
  titulo: string
  subtitulo: string
  icon: typeof StickyNote
  vazio: string
}[] = [
  {
    chave: 'notas',
    titulo: 'Anotações',
    subtitulo: 'Notas marcadas como alerta no bloco de anotações',
    icon: StickyNote,
    vazio: 'Nenhuma anotação em alerta',
  },
  {
    chave: 'agenda',
    titulo: 'Agenda',
    subtitulo: 'Compromissos marcados como alerta na agenda',
    icon: CalendarDays,
    vazio: 'Nenhum compromisso da agenda em alerta',
  },
  {
    chave: 'calendario',
    titulo: 'Calendário',
    subtitulo: 'Eventos marcados como alerta no calendário',
    icon: Calendar,
    vazio: 'Nenhum evento do calendário em alerta',
  },
]

function formatarDataAlerta(item: AlertaItem): string {
  if (!item.data) return ''
  const periodo = formatarPeriodoEvento(item.data, item.dataFim)
  return item.hora ? `${periodo} · ${item.hora}` : periodo
}

export function AlertasPage({ onNavigate }: AlertasPageProps) {
  const alertas = useAlertasRecursos()

  function irParaOrigem(tipo: TipoAlerta) {
    onNavigate?.(paginaDoAlerta(tipo))
  }

  return (
    <PageShell
      title="Alertas"
      subtitle="Anotações, compromissos da agenda e eventos do calendário marcados como alerta"
      width="narrow"
    >
      {alertas.total === 0 ? (
        <div className="alertas-vazio panel-card">
          <Bell size={40} className="alertas-vazio-icon" />
          <h3>Nenhum alerta ativo</h3>
          <p>
            Marque anotações, compromissos ou eventos como alerta nas telas de Recursos
            para vê-los aqui.
          </p>
          {onNavigate && (
            <div className="alertas-vazio-acoes">
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => irParaOrigem('nota')}>
                Ir para Anotações
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => irParaOrigem('agenda')}>
                Ir para Agenda
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => irParaOrigem('calendario')}>
                Ir para Calendário
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="alertas-resumo panel-card">
          <Bell size={20} />
          <span>
            <strong>{alertas.total}</strong>{' '}
            {alertas.total === 1 ? 'alerta ativo' : 'alertas ativos'}
          </span>
        </div>
      )}

      <div className="page-stack">
        {SECOES.map(({ chave, titulo, subtitulo, icon: Icon, vazio }) => (
          <SecaoAlertas
            key={chave}
            titulo={titulo}
            subtitulo={subtitulo}
            icon={Icon}
            vazio={vazio}
            itens={alertas[chave]}
            onNavigate={onNavigate}
            onRemover={removerAlerta}
            formatarData={formatarDataAlerta}
          />
        ))}
      </div>
    </PageShell>
  )
}

function SecaoAlertas({
  titulo,
  subtitulo,
  icon: Icon,
  vazio,
  itens,
  onNavigate,
  onRemover,
  formatarData,
}: {
  titulo: string
  subtitulo: string
  icon: typeof StickyNote
  vazio: string
  itens: AlertaItem[]
  onNavigate?: (pagina: Pagina) => void
  onRemover: (item: AlertaItem) => void
  formatarData: (item: AlertaItem) => string
}) {
  return (
    <div className="table-card">
      <div className="card-body">
        <div className="alertas-secao-header">
          <div className="alertas-secao-titulo">
            <span className="alertas-secao-icon">
              <Icon size={18} />
            </span>
            <div>
              <h3 className="card-section-title">{titulo}</h3>
              <p className="alertas-secao-sub">{subtitulo}</p>
            </div>
          </div>
          <span className="badge">{itens.length}</span>
        </div>

        {itens.length === 0 ? (
          <p className="empty-state empty-state--compact">{vazio}</p>
        ) : (
          <ul className="alertas-lista">
            {itens.map((item) => (
              <li key={item.id} className="alerta-item">
                <div className="alerta-item-conteudo">
                  <strong>{item.titulo}</strong>
                  {item.data && (
                    <span className="alerta-item-meta">{formatarData(item)}</span>
                  )}
                  {item.descricao && <span className="alerta-item-desc">{item.descricao}</span>}
                  {!item.data && item.tipo === 'nota' && (
                    <span className="alerta-item-meta">
                      Atualizado em {new Date(item.atualizadoEm).toLocaleString('pt-BR')}
                    </span>
                  )}
                </div>
                <div className="alerta-item-acoes">
                  {onNavigate && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-icon btn-sm"
                      title="Abrir origem"
                      onClick={() => onNavigate(paginaDoAlerta(item.tipo))}
                    >
                      <ExternalLink size={16} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    title="Remover alerta"
                    onClick={() => onRemover(item)}
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
