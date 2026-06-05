import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  Gift,
  Plus,
  Trash2,
  Shuffle,
  Users,
  Trophy,
  X,
  Save,
  Calendar,
  Pencil,
  Eye,
  Archive,
  FolderArchive,
} from 'lucide-react'
import { PageShell } from '../PageShell'
import {
  SORTEADOR_ALTERADO_EVENT,
  agruparSorteiosPorMes,
  carregarSorteios,
  criarParticipante,
  criarSorteio,
  formatarMesAno,
  formatarPeriodoSorteio,
  hojeIso,
  listarMesesArquivo,
  mesReferenciaSorteio,
  salvarSorteios,
  sortearParticipante,
  sorteioConcluido,
  sorteioEstaAtivo,
  type ParticipanteSorteio,
  type Sorteio,
} from '../../sorteadorStorage'

const formSorteioInicial = { nome: '', dataFim: '' }
const formParticipanteInicial = { nome: '', telefone: '', endereco: '', observacao: '' }

type AbaSorteador = 'operacao' | 'arquivo'

export function SorteadorPage() {
  const [sorteios, setSorteios] = useState<Sorteio[]>(() => carregarSorteios())
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null)
  const [mostrarFormSorteio, setMostrarFormSorteio] = useState(false)
  const [formSorteio, setFormSorteio] = useState(formSorteioInicial)
  const [formParticipante, setFormParticipante] = useState(formParticipanteInicial)
  const [erroSorteio, setErroSorteio] = useState('')
  const [erroParticipante, setErroParticipante] = useState('')
  const [sorteando, setSorteando] = useState(false)
  const [resultadoSorteio, setResultadoSorteio] = useState<ParticipanteSorteio | null>(null)
  const [mostrarModalParticipantes, setMostrarModalParticipantes] = useState(false)
  const [editandoParticipanteId, setEditandoParticipanteId] = useState<string | null>(null)
  const [formEditParticipante, setFormEditParticipante] = useState(formParticipanteInicial)
  const [erroEditParticipante, setErroEditParticipante] = useState('')
  const [aba, setAba] = useState<AbaSorteador>('operacao')
  const [mesArquivo, setMesArquivo] = useState<string>('')

  const hoje = hojeIso()

  const naoArquivados = useMemo(
    () => sorteios.filter((s) => !s.arquivado),
    [sorteios]
  )

  const arquivados = useMemo(
    () => sorteios.filter((s) => s.arquivado),
    [sorteios]
  )

  const mesesArquivo = useMemo(() => listarMesesArquivo(sorteios), [sorteios])

  const arquivadosPorMes = useMemo(() => {
    const filtrados =
      mesArquivo === ''
        ? arquivados
        : arquivados.filter((s) => mesReferenciaSorteio(s) === mesArquivo)
    return agruparSorteiosPorMes(filtrados)
  }, [arquivados, mesArquivo])

  useEffect(() => {
    if (mesArquivo !== '' && mesesArquivo.length > 0 && !mesesArquivo.includes(mesArquivo)) {
      setMesArquivo('')
    }
  }, [mesesArquivo, mesArquivo])

  const selecionado = useMemo(
    () => sorteios.find((s) => s.id === selecionadoId) ?? null,
    [sorteios, selecionadoId]
  )

  const ativos = useMemo(
    () =>
      [...naoArquivados]
        .filter((s) => !s.ganhadorId && sorteioEstaAtivo(s, hoje))
        .sort((a, b) => a.dataFim.localeCompare(b.dataFim)),
    [naoArquivados, hoje]
  )

  const concluidos = useMemo(
    () =>
      [...naoArquivados]
        .filter((s) => sorteioConcluido(s))
        .sort((a, b) => (b.sorteadoEm ?? '').localeCompare(a.sorteadoEm ?? '')),
    [naoArquivados]
  )

  const encerrados = useMemo(
    () =>
      [...naoArquivados]
        .filter((s) => !s.ganhadorId && !sorteioEstaAtivo(s, hoje))
        .sort((a, b) => b.dataFim.localeCompare(a.dataFim)),
    [naoArquivados, hoje]
  )

  useEffect(() => {
    function sync() {
      setSorteios(carregarSorteios())
    }
    window.addEventListener(SORTEADOR_ALTERADO_EVENT, sync)
    return () => window.removeEventListener(SORTEADOR_ALTERADO_EVENT, sync)
  }, [])

  useEffect(() => {
    if (selecionadoId && !sorteios.some((s) => s.id === selecionadoId)) {
      setSelecionadoId(null)
    }
  }, [sorteios, selecionadoId])

  function persistir(lista: Sorteio[]) {
    setSorteios(lista)
    salvarSorteios(lista)
  }

  function abrirNovoSorteio() {
    setFormSorteio({ nome: '', dataFim: hoje })
    setFormParticipante(formParticipanteInicial)
    setErroSorteio('')
    setErroParticipante('')
    setMostrarFormSorteio(true)
  }

  function fecharFormSorteio() {
    setMostrarFormSorteio(false)
    setFormSorteio(formSorteioInicial)
    setFormParticipante(formParticipanteInicial)
    setErroSorteio('')
    setErroParticipante('')
  }

  function handleCriarSorteio(e: FormEvent) {
    e.preventDefault()
    if (!formSorteio.nome.trim()) {
      setErroSorteio('Informe o nome do sorteio.')
      return
    }
    if (!formSorteio.dataFim) {
      setErroSorteio('Informe a data fim do sorteio.')
      return
    }
    if (formSorteio.dataFim < hoje) {
      setErroSorteio('A data fim não pode ser anterior a hoje.')
      return
    }

    const temParticipante =
      formParticipante.nome.trim() || formParticipante.telefone.trim()
    if (temParticipante) {
      if (!formParticipante.nome.trim()) {
        setErroParticipante('Informe o nome do participante.')
        return
      }
      if (!formParticipante.telefone.trim()) {
        setErroParticipante('Informe o telefone do participante.')
        return
      }
    }

    const novo = criarSorteio(formSorteio.nome, formSorteio.dataFim)
    if (temParticipante) {
      novo.participantes = [criarParticipante(formParticipante)]
    }

    persistir([novo, ...sorteios])
    setSelecionadoId(novo.id)
    setResultadoSorteio(null)
    fecharFormSorteio()
  }

  function handleAdicionarParticipante(e: FormEvent) {
    e.preventDefault()
    if (!selecionado) return

    if (!formParticipante.nome.trim()) {
      setErroParticipante('Informe o nome.')
      return
    }
    if (!formParticipante.telefone.trim()) {
      setErroParticipante('Informe o telefone.')
      return
    }

    const participante = criarParticipante(formParticipante)
    const lista = sorteios.map((s) =>
      s.id === selecionado.id
        ? {
            ...s,
            participantes: [...s.participantes, participante],
            ganhadorId: undefined,
            sorteadoEm: undefined,
          }
        : s
    )
    persistir(lista)
    setFormParticipante(formParticipanteInicial)
    setErroParticipante('')
    setResultadoSorteio(null)
  }

  function excluirSorteio(id: string) {
    if (!confirm('Excluir este sorteio e todos os participantes?')) return
    persistir(sorteios.filter((s) => s.id !== id))
    if (selecionadoId === id) {
      setSelecionadoId(null)
      setResultadoSorteio(null)
    }
  }

  function excluirParticipante(sorteioId: string, participanteId: string) {
    if (!confirm('Remover este participante?')) return
    const lista = sorteios.map((s) => {
      if (s.id !== sorteioId) return s
      return {
        ...s,
        participantes: s.participantes.filter((p) => p.id !== participanteId),
        ganhadorId: s.ganhadorId === participanteId ? undefined : s.ganhadorId,
      }
    })
    persistir(lista)
    if (resultadoSorteio?.id === participanteId) setResultadoSorteio(null)
    if (editandoParticipanteId === participanteId) cancelarEdicaoParticipante()
  }

  function abrirModalParticipantes() {
    setEditandoParticipanteId(null)
    setFormEditParticipante(formParticipanteInicial)
    setErroEditParticipante('')
    setMostrarModalParticipantes(true)
  }

  function fecharModalParticipantes() {
    setMostrarModalParticipantes(false)
    cancelarEdicaoParticipante()
  }

  function cancelarEdicaoParticipante() {
    setEditandoParticipanteId(null)
    setFormEditParticipante(formParticipanteInicial)
    setErroEditParticipante('')
  }

  function iniciarEdicaoParticipante(p: ParticipanteSorteio) {
    setEditandoParticipanteId(p.id)
    setFormEditParticipante({
      nome: p.nome,
      telefone: p.telefone,
      endereco: p.endereco,
      observacao: p.observacao,
    })
    setErroEditParticipante('')
  }

  function handleSalvarEdicaoParticipante(e: FormEvent) {
    e.preventDefault()
    if (!selecionado || !editandoParticipanteId) return

    if (!formEditParticipante.nome.trim()) {
      setErroEditParticipante('Informe o nome.')
      return
    }
    if (!formEditParticipante.telefone.trim()) {
      setErroEditParticipante('Informe o telefone.')
      return
    }

    const original = selecionado.participantes.find((p) => p.id === editandoParticipanteId)
    if (!original) return

    const atualizado: ParticipanteSorteio = {
      ...original,
      nome: formEditParticipante.nome.trim(),
      telefone: formEditParticipante.telefone.trim(),
      endereco: formEditParticipante.endereco.trim(),
      observacao: formEditParticipante.observacao.trim(),
    }

    const lista = sorteios.map((s) => {
      if (s.id !== selecionado.id) return s
      return {
        ...s,
        participantes: s.participantes.map((p) =>
          p.id === editandoParticipanteId ? atualizado : p
        ),
      }
    })
    persistir(lista)
    if (resultadoSorteio?.id === editandoParticipanteId) {
      setResultadoSorteio(atualizado)
    }
    cancelarEdicaoParticipante()
  }

  function arquivarSorteio(id: string) {
    if (!confirm('Arquivar este sorteio? Ele sairá da lista principal e ficará disponível no arquivo por mês.')) {
      return
    }
    const lista = sorteios.map((s) =>
      s.id === id
        ? { ...s, arquivado: true, arquivadoEm: new Date().toISOString() }
        : s
    )
    persistir(lista)
    if (selecionadoId === id) setSelecionadoId(null)
    setAba('arquivo')
  }

  function executarSorteio() {
    if (!selecionado || selecionado.participantes.length === 0 || selecionado.ganhadorId) return
    setSorteando(true)
    setResultadoSorteio(null)

    setTimeout(() => {
      const ganhador = sortearParticipante(selecionado)
      if (!ganhador) {
        setSorteando(false)
        return
      }

      const lista = sorteios.map((s) =>
        s.id === selecionado.id
          ? {
              ...s,
              ganhadorId: ganhador.id,
              sorteadoEm: new Date().toISOString(),
            }
          : s
      )
      persistir(lista)
      setResultadoSorteio(ganhador)
      setSorteando(false)
    }, 900)
  }

  function renderCardSorteio(s: Sorteio, opts?: { arquivado?: boolean }) {
    const ativo = sorteioEstaAtivo(s, hoje)
    const concluido = sorteioConcluido(s)
    const ganhador = s.ganhadorId
      ? s.participantes.find((p) => p.id === s.ganhadorId)
      : undefined

    return (
      <button
        key={s.id}
        type="button"
        className={`sorteador-card ${selecionadoId === s.id ? 'sorteador-card-ativo' : ''}`}
        onClick={() => {
          setSelecionadoId(s.id)
          setResultadoSorteio(ganhador ?? null)
        }}
      >
        <div className="sorteador-card-topo">
          <strong>{s.nome}</strong>
          <span
            className={`sorteador-badge ${
              opts?.arquivado
                ? 'sorteador-badge-arquivado'
                : concluido
                  ? 'sorteador-badge-concluido'
                  : ativo
                    ? 'sorteador-badge-ativo'
                    : ''
            }`}
          >
            {opts?.arquivado
              ? 'Arquivado'
              : concluido
                ? 'Concluído'
                : ativo
                  ? 'Ativo'
                  : 'Encerrado'}
          </span>
        </div>
        <span className="sorteador-card-periodo">
          <Calendar size={14} />
          {formatarPeriodoSorteio(s.dataInicio, s.dataFim)}
        </span>
        <span className="sorteador-card-meta">
          <Users size={14} />
          {s.participantes.length} participante{s.participantes.length === 1 ? '' : 's'}
        </span>
        {ganhador && (
          <span className="sorteador-card-ganhador">
            <Trophy size={14} />
            {ganhador.nome}
          </span>
        )}
      </button>
    )
  }

  return (
    <PageShell
      title="Sorteador"
      subtitle="Sorteios para clientes — cadastre participantes e realize o sorteio"
      width="full"
      actions={
        <button type="button" className="btn btn-primary btn-sm" onClick={abrirNovoSorteio}>
          <Plus size={16} />
          Novo sorteio
        </button>
      }
    >
      <div className="sorteador-layout">
        <aside className="sorteador-lista-panel">
          <div className="config-tabs sorteador-abas" role="tablist" aria-label="Sorteador">
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'operacao'}
              className={`config-tab ${aba === 'operacao' ? 'config-tab-ativa' : ''}`}
              onClick={() => setAba('operacao')}
            >
              <Gift size={16} />
              Sorteios
              {naoArquivados.length > 0 && (
                <span className="atalhos-consulta-badge">{naoArquivados.length}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === 'arquivo'}
              className={`config-tab ${aba === 'arquivo' ? 'config-tab-ativa' : ''}`}
              onClick={() => setAba('arquivo')}
            >
              <FolderArchive size={16} />
              Arquivo
              {arquivados.length > 0 && (
                <span className="atalhos-consulta-badge">{arquivados.length}</span>
              )}
            </button>
          </div>

          {aba === 'operacao' ? (
            <>
              {ativos.length > 0 && (
                <section className="sorteador-secao">
                  <h3 className="sorteador-secao-titulo">Sorteios ativos</h3>
                  <div className="sorteador-cards">{ativos.map((s) => renderCardSorteio(s))}</div>
                </section>
              )}

              {concluidos.length > 0 && (
                <section className="sorteador-secao">
                  <h3 className="sorteador-secao-titulo">Concluídos</h3>
                  <p className="sorteador-secao-dica">Sorteios realizados — arquive para organizar por mês.</p>
                  <div className="sorteador-cards">{concluidos.map((s) => renderCardSorteio(s))}</div>
                </section>
              )}

              {encerrados.length > 0 && (
                <section className="sorteador-secao">
                  <h3 className="sorteador-secao-titulo">Encerrados</h3>
                  <div className="sorteador-cards">{encerrados.map((s) => renderCardSorteio(s))}</div>
                </section>
              )}

              {naoArquivados.length === 0 && (
                <div className="sorteador-vazio">
                  <Gift size={36} strokeWidth={1.25} />
                  <p>Nenhum sorteio em andamento.</p>
                  <button type="button" className="btn btn-primary" onClick={abrirNovoSorteio}>
                    <Plus size={18} />
                    Criar sorteio
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {arquivados.length > 0 && (
                <div className="sorteador-arquivo-filtro">
                  <label className="form-label" htmlFor="mes-arquivo">
                    Mês
                  </label>
                  <select
                    id="mes-arquivo"
                    className="form-select"
                    value={mesArquivo}
                    onChange={(e) => setMesArquivo(e.target.value)}
                  >
                    <option value="">Todos os meses</option>
                    {mesesArquivo.map((mes) => (
                      <option key={mes} value={mes}>
                        {formatarMesAno(mes)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {arquivados.length === 0 ? (
                <div className="sorteador-vazio">
                  <Archive size={36} strokeWidth={1.25} />
                  <p>Nenhum sorteio arquivado ainda.</p>
                  <p className="sorteador-secao-dica">
                    Conclua um sorteio e use &quot;Arquivar&quot; para guardá-lo aqui por mês.
                  </p>
                </div>
              ) : (
                [...arquivadosPorMes.entries()]
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([mes, lista]) => (
                    <section key={mes} className="sorteador-secao">
                      <h3 className="sorteador-secao-titulo">{formatarMesAno(mes)}</h3>
                      <div className="sorteador-cards">
                        {lista.map((s) => renderCardSorteio(s, { arquivado: true }))}
                      </div>
                    </section>
                  ))
              )}
            </>
          )}
        </aside>

        <div className="sorteador-detalhe">
          {!selecionado ? (
            <div className="sorteador-vazio sorteador-vazio-detalhe">
              <Shuffle size={36} strokeWidth={1.25} />
              <p>
                {aba === 'arquivo'
                  ? 'Selecione um sorteio arquivado para ver o resultado.'
                  : 'Selecione um sorteio ou crie um novo para cadastrar participantes.'}
              </p>
            </div>
          ) : (
            <>
              <div className="panel-card">
                <div className="card-body">
                  <div className="sorteador-detalhe-cabecalho">
                    <div>
                      <h3 className="card-section-title">{selecionado.nome}</h3>
                      <p className="sorteador-detalhe-periodo">
                        {formatarPeriodoSorteio(selecionado.dataInicio, selecionado.dataFim)}
                        {selecionado.arquivado
                          ? ' · Arquivado'
                          : sorteioConcluido(selecionado)
                            ? ' · Concluído'
                            : sorteioEstaAtivo(selecionado, hoje)
                              ? ' · Ativo'
                              : ' · Encerrado'}
                      </p>
                    </div>
                    {!selecionado.arquivado && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Excluir sorteio"
                        onClick={() => excluirSorteio(selecionado.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="sorteador-acoes">
                    {!selecionado.arquivado && (
                      <>
                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={
                            sorteando ||
                            selecionado.participantes.length === 0 ||
                            !sorteioEstaAtivo(selecionado, hoje) ||
                            Boolean(selecionado.ganhadorId)
                          }
                          onClick={executarSorteio}
                        >
                          <Shuffle size={18} className={sorteando ? 'sorteador-girando' : ''} />
                          {sorteando ? 'Sorteando…' : 'Sortear ganhador'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={abrirModalParticipantes}
                        >
                          <Eye size={18} />
                          Ver participantes
                          {selecionado.participantes.length > 0 && (
                            <span className="atalhos-consulta-badge">
                              {selecionado.participantes.length}
                            </span>
                          )}
                        </button>
                        {sorteioConcluido(selecionado) && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => arquivarSorteio(selecionado.id)}
                          >
                            <Archive size={18} />
                            Arquivar sorteio
                          </button>
                        )}
                        {selecionado.participantes.length === 0 && !selecionado.ganhadorId && (
                          <span className="sorteador-aviso">
                            Cadastre participantes antes de sortear.
                          </span>
                        )}
                      </>
                    )}
                    {selecionado.arquivado && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={abrirModalParticipantes}
                      >
                        <Eye size={18} />
                        Ver participantes
                        {selecionado.participantes.length > 0 && (
                          <span className="atalhos-consulta-badge">
                            {selecionado.participantes.length}
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  {resultadoSorteio && (
                    <div className="sorteador-resultado">
                      <Trophy size={28} />
                      <div>
                        <span className="sorteador-resultado-label">Ganhador</span>
                        <strong>{resultadoSorteio.nome}</strong>
                        <span>{resultadoSorteio.telefone}</span>
                        {resultadoSorteio.endereco && <span>{resultadoSorteio.endereco}</span>}
                        {resultadoSorteio.observacao && (
                          <span className="sorteador-resultado-obs">{resultadoSorteio.observacao}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!selecionado.arquivado && !selecionado.ganhadorId && (
              <div className="panel-card">
                <div className="card-body">
                  <h3 className="card-section-title">Novo participante</h3>
                  <form onSubmit={handleAdicionarParticipante} className="sorteador-form">
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Nome *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formParticipante.nome}
                          onChange={(e) =>
                            setFormParticipante((f) => ({ ...f, nome: e.target.value }))
                          }
                          placeholder="Nome completo"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Telefone *</label>
                        <input
                          type="tel"
                          className="form-input"
                          value={formParticipante.telefone}
                          onChange={(e) =>
                            setFormParticipante((f) => ({ ...f, telefone: e.target.value }))
                          }
                          placeholder="(00) 00000-0000"
                          required
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Endereço</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formParticipante.endereco}
                        onChange={(e) =>
                          setFormParticipante((f) => ({ ...f, endereco: e.target.value }))
                        }
                        placeholder="Rua, número, bairro"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Observação</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        value={formParticipante.observacao}
                        onChange={(e) =>
                          setFormParticipante((f) => ({ ...f, observacao: e.target.value }))
                        }
                        placeholder="Ex.: cliente com mais compras no mês"
                      />
                    </div>
                    {erroParticipante && <div className="error-message">{erroParticipante}</div>}
                    <div className="form-actions">
                      <button type="submit" className="btn btn-secondary">
                        <Plus size={18} />
                        Adicionar participante
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              )}
            </>
          )}
        </div>
      </div>

      {mostrarModalParticipantes && selecionado && (
        <div className="modal-overlay" role="presentation" onClick={fecharModalParticipantes}>
          <div
            className="modal-content modal-content-wide sorteador-modal sorteador-modal-participantes"
            role="dialog"
            aria-labelledby="sorteador-participantes-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="sorteador-participantes-titulo" className="modal-title">
                  Participantes
                </h2>
                <p className="sorteador-modal-subtitulo">
                  {selecionado.nome} · {selecionado.participantes.length} cadastrado
                  {selecionado.participantes.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-icon btn-ghost"
                onClick={fecharModalParticipantes}
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body sorteador-modal-participantes-body">
              {selecionado.participantes.length === 0 ? (
                <p className="empty-state empty-state--compact">
                  Nenhum participante cadastrado neste sorteio.
                </p>
              ) : (
                <ul className="sorteador-participantes-lista">
                  {selecionado.participantes.map((p) => (
                    <li
                      key={p.id}
                      className={`sorteador-participante-item ${
                        selecionado.ganhadorId === p.id ? 'sorteador-participante-ganhador' : ''
                      } ${editandoParticipanteId === p.id ? 'sorteador-participante-editando' : ''}`}
                    >
                      {editandoParticipanteId === p.id ? (
                        <form
                          className="sorteador-edit-form"
                          onSubmit={handleSalvarEdicaoParticipante}
                        >
                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label">Nome *</label>
                              <input
                                type="text"
                                className="form-input"
                                value={formEditParticipante.nome}
                                onChange={(e) =>
                                  setFormEditParticipante((f) => ({
                                    ...f,
                                    nome: e.target.value,
                                  }))
                                }
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label className="form-label">Telefone *</label>
                              <input
                                type="tel"
                                className="form-input"
                                value={formEditParticipante.telefone}
                                onChange={(e) =>
                                  setFormEditParticipante((f) => ({
                                    ...f,
                                    telefone: e.target.value,
                                  }))
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Endereço</label>
                            <input
                              type="text"
                              className="form-input"
                              value={formEditParticipante.endereco}
                              onChange={(e) =>
                                setFormEditParticipante((f) => ({
                                  ...f,
                                  endereco: e.target.value,
                                }))
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Observação</label>
                            <textarea
                              className="form-textarea"
                              rows={2}
                              value={formEditParticipante.observacao}
                              onChange={(e) =>
                                setFormEditParticipante((f) => ({
                                  ...f,
                                  observacao: e.target.value,
                                }))
                              }
                            />
                          </div>
                          {erroEditParticipante && (
                            <div className="error-message">{erroEditParticipante}</div>
                          )}
                          <div className="form-actions">
                            <button type="submit" className="btn btn-primary btn-sm">
                              <Save size={16} />
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={cancelarEdicaoParticipante}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <>
                          <div>
                            <div className="sorteador-participante-linha-topo">
                              <strong>{p.nome}</strong>
                              {selecionado.ganhadorId === p.id && (
                                <span className="sorteador-badge-ganhador">
                                  <Trophy size={12} />
                                  Ganhador
                                </span>
                              )}
                            </div>
                            <span>{p.telefone}</span>
                            {p.endereco && <span>{p.endereco}</span>}
                            {p.observacao && (
                              <span className="sorteador-participante-obs">{p.observacao}</span>
                            )}
                          </div>
                          {!selecionado.arquivado && (
                          <div className="sorteador-participante-acoes">
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Editar participante"
                              onClick={() => iniciarEdicaoParticipante(p)}
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              title="Excluir participante"
                              onClick={() => excluirParticipante(selecionado.id, p.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {mostrarFormSorteio && (
        <div className="modal-overlay" role="presentation" onClick={fecharFormSorteio}>
          <div
            className="modal-content sorteador-modal"
            role="dialog"
            aria-labelledby="sorteador-modal-titulo"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2 id="sorteador-modal-titulo" className="modal-title">
                Novo sorteio
              </h2>
              <button type="button" className="btn btn-icon btn-ghost" onClick={fecharFormSorteio}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCriarSorteio} className="modal-body">
              <p className="atalhos-regras">
                Crie campanhas de sorteio para clientes com mais compras ou outras promoções da loja.
                Você pode ter vários sorteios ativos ao mesmo tempo.
              </p>

              <div className="form-group">
                <label className="form-label">Nome do sorteio *</label>
                <input
                  type="text"
                  className="form-input"
                  value={formSorteio.nome}
                  onChange={(e) => setFormSorteio((f) => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex.: Maiores compradores — Junho"
                  autoFocus
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data início</label>
                  <input type="date" className="form-input" value={hoje} readOnly disabled />
                  <span className="form-hint">Data do sistema (automática)</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Data fim *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formSorteio.dataFim}
                    min={hoje}
                    onChange={(e) => setFormSorteio((f) => ({ ...f, dataFim: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="sorteador-modal-divisor">
                <span>Participante (opcional)</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Nome *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formParticipante.nome}
                    onChange={(e) =>
                      setFormParticipante((f) => ({ ...f, nome: e.target.value }))
                    }
                    placeholder="Nome do participante"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telefone *</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formParticipante.telefone}
                    onChange={(e) =>
                      setFormParticipante((f) => ({ ...f, telefone: e.target.value }))
                    }
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Endereço</label>
                <input
                  type="text"
                  className="form-input"
                  value={formParticipante.endereco}
                  onChange={(e) =>
                    setFormParticipante((f) => ({ ...f, endereco: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Observação</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={formParticipante.observacao}
                  onChange={(e) =>
                    setFormParticipante((f) => ({ ...f, observacao: e.target.value }))
                  }
                />
              </div>

              {erroSorteio && <div className="error-message">{erroSorteio}</div>}
              {erroParticipante && <div className="error-message">{erroParticipante}</div>}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <Save size={18} />
                  Criar sorteio
                </button>
                <button type="button" className="btn btn-secondary" onClick={fecharFormSorteio}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
