import { useEffect, useState } from 'react'
import { Plus, Trash2, StickyNote } from 'lucide-react'
import { PageShell } from '../PageShell'
import { BotaoAlerta } from '../BotaoAlerta'
import {
  carregarNotas,
  salvarNotas,
  gerarId,
  alternarAlertaNota,
  type Nota,
} from '../../recursosStorage'

export function NotasPage() {
  const [notas, setNotas] = useState<Nota[]>([])
  const [notaAtiva, setNotaAtiva] = useState<string | null>(null)

  useEffect(() => {
    const salvas = carregarNotas()
    setNotas(salvas)
    if (salvas.length > 0) setNotaAtiva(salvas[0].id)
  }, [])

  function persistir(lista: Nota[]) {
    setNotas(lista)
    salvarNotas(lista)
  }

  function recarregar() {
    setNotas(carregarNotas())
  }

  function novaNota() {
    const nota: Nota = {
      id: gerarId(),
      titulo: 'Nova nota',
      conteudo: '',
      atualizadoEm: new Date().toISOString(),
    }
    persistir([nota, ...notas])
    setNotaAtiva(nota.id)
  }

  function atualizar(id: string, campo: 'titulo' | 'conteudo', valor: string) {
    persistir(
      notas.map((n) =>
        n.id === id ? { ...n, [campo]: valor, atualizadoEm: new Date().toISOString() } : n
      )
    )
  }

  function excluir(id: string) {
    if (!confirm('Excluir esta nota?')) return
    const restantes = notas.filter((n) => n.id !== id)
    persistir(restantes)
    if (notaAtiva === id) setNotaAtiva(restantes[0]?.id ?? null)
  }

  function toggleAlerta(id: string) {
    alternarAlertaNota(id)
    recarregar()
  }

  const ativa = notas.find((n) => n.id === notaAtiva)

  return (
    <PageShell title="Anotações" subtitle="Bloco de notas para anotações rápidas" width="narrow">
      <div className="notas-layout">
        <aside className="panel-card notas-sidebar">
          <button type="button" className="btn btn-primary notas-nova-btn" onClick={novaNota}>
            <Plus size={18} />
            Nova nota
          </button>

          {notas.length === 0 ? (
            <p className="empty-state empty-state--compact">Nenhuma nota ainda</p>
          ) : (
            <ul className="notas-lista">
              {notas.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notas-item ${notaAtiva === n.id ? 'notas-item-ativo' : ''} ${n.alerta ? 'notas-item-alerta' : ''}`}
                    onClick={() => setNotaAtiva(n.id)}
                  >
                    <StickyNote size={16} />
                    <span className="notas-item-titulo">{n.titulo || 'Sem título'}</span>
                    <span className="notas-item-data">
                      {new Date(n.atualizadoEm).toLocaleDateString('pt-BR')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className="panel-card notas-editor">
          {ativa ? (
            <>
              <div className="notas-editor-header">
                <input
                  className="form-input notas-titulo-input"
                  value={ativa.titulo}
                  onChange={(e) => atualizar(ativa.id, 'titulo', e.target.value)}
                  placeholder="Título da nota"
                />
                <div className="notas-editor-acoes">
                  <BotaoAlerta
                    ativo={Boolean(ativa.alerta)}
                    onClick={() => toggleAlerta(ativa.id)}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    onClick={() => excluir(ativa.id)}
                    title="Excluir nota"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <textarea
                className="form-input notas-textarea"
                value={ativa.conteudo}
                onChange={(e) => atualizar(ativa.id, 'conteudo', e.target.value)}
                placeholder="Escreva sua anotação aqui..."
              />
              <p className="notas-rodape">
                {ativa.alerta && <span className="notas-alerta-badge">Em alerta · </span>}
                Atualizado em {new Date(ativa.atualizadoEm).toLocaleString('pt-BR')}
              </p>
            </>
          ) : (
            <div className="empty-state empty-state--panel">
              Selecione uma nota ou crie uma nova para começar
            </div>
          )}
        </div>
      </div>
    </PageShell>
  )
}
