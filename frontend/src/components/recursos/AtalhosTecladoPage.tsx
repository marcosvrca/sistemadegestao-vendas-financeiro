import { useEffect, useState } from 'react'
import { Plus, Trash2, Keyboard, Save, List } from 'lucide-react'
import { PageShell } from '../PageShell'
import { ConfigBreadcrumb } from './ConfigBreadcrumb'
import type { Pagina as PaginaNav } from '../../navigation'
import {
  PAGINA_TITULOS,
  type Pagina,
  isPaginaEmBreve,
} from '../../navigation'
import {
  type AtalhoCapturado,
  type AtalhoTeclado,
  ATALHOS_ALTERADOS_EVENT,
  carregarAtalhosTeclado,
  criarAtalho,
  eventoParaAtalho,
  formatarAtalho,
  salvarAtalhosTeclado,
  setCapturandoAtalho,
  validarAtalho,
} from '../../atalhosTecladoStorage'

type AbaAtalhos = 'cadastro' | 'consulta'

const paginasDisponiveis = (Object.keys(PAGINA_TITULOS) as Pagina[])
  .filter((p) => !isPaginaEmBreve(p))
  .map((pagina) => ({ pagina, label: PAGINA_TITULOS[pagina] }))
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

interface AtalhosTecladoPageProps {
  onNavigate?: (pagina: PaginaNav) => void
}

export function AtalhosTecladoPage({ onNavigate }: AtalhosTecladoPageProps) {
  const [atalhos, setAtalhos] = useState<AtalhoTeclado[]>(() => carregarAtalhosTeclado())
  const [aba, setAba] = useState<AbaAtalhos>('cadastro')
  const [paginaAlvo, setPaginaAlvo] = useState<Pagina>('dashboard')
  const [capturando, setCapturando] = useState(false)
  const [combo, setCombo] = useState<AtalhoCapturado | null>(null)
  const [erro, setErro] = useState('')

  const ordenados = [...atalhos].sort((a, b) =>
    PAGINA_TITULOS[a.pagina].localeCompare(PAGINA_TITULOS[b.pagina], 'pt-BR')
  )

  useEffect(() => {
    setCapturandoAtalho(capturando)
    return () => setCapturandoAtalho(false)
  }, [capturando])

  useEffect(() => {
    if (!capturando) return

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setCapturando(false)
        setErro('')
        return
      }

      const capturado = eventoParaAtalho(e)
      if (!capturado) {
        setErro('Tecla Windows (Meta) e Fn não são permitidas ou detectáveis.')
        return
      }

      const msg = validarAtalho(capturado, atalhos)
      setCombo(capturado)
      setErro(msg ?? '')
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capturando, atalhos])

  function persistir(lista: AtalhoTeclado[]) {
    setAtalhos(lista)
    salvarAtalhosTeclado(lista)
  }

  function iniciarCaptura() {
    setCombo(null)
    setErro('')
    setCapturando(true)
  }

  function salvarAtalho() {
    if (!combo) {
      setErro('Capture uma combinação de teclas primeiro.')
      return
    }
    const msg = validarAtalho(combo, atalhos)
    if (msg) {
      setErro(msg)
      return
    }
    persistir([...atalhos, criarAtalho(paginaAlvo, combo)])
    setCombo(null)
    setCapturando(false)
    setErro('')
    setAba('consulta')
  }

  function excluir(id: string) {
    if (!confirm('Remover este atalho?')) return
    persistir(atalhos.filter((a) => a.id !== id))
  }

  useEffect(() => {
    function sync() {
      setAtalhos(carregarAtalhosTeclado())
    }
    window.addEventListener(ATALHOS_ALTERADOS_EVENT, sync)
    return () => window.removeEventListener(ATALHOS_ALTERADOS_EVENT, sync)
  }, [])

  return (
    <PageShell
      title="Atalhos do teclado"
      subtitle="Abra telas do sistema com combinações personalizadas"
      width="form"
    >
      {onNavigate && (
        <ConfigBreadcrumb
          onNavigate={onNavigate}
          items={[
            { label: 'Recursos', pagina: 'recursos' },
            { label: 'Configurações', pagina: 'recursos-configuracoes' },
            { label: 'Atalhos do teclado' },
          ]}
        />
      )}

      <div className="config-tabs" role="tablist" aria-label="Atalhos do teclado">
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'cadastro'}
          className={`config-tab ${aba === 'cadastro' ? 'config-tab-ativa' : ''}`}
          onClick={() => setAba('cadastro')}
        >
          <Plus size={16} />
          Cadastrar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={aba === 'consulta'}
          className={`config-tab ${aba === 'consulta' ? 'config-tab-ativa' : ''}`}
          onClick={() => setAba('consulta')}
        >
          <List size={16} />
          Consultar atalhos
          {atalhos.length > 0 && (
            <span className="atalhos-consulta-badge">{atalhos.length}</span>
          )}
        </button>
      </div>

      <div className="page-stack">
        {aba === 'cadastro' ? (
          <div className="panel-card">
            <div className="card-body">
              <h3 className="card-section-title">Novo atalho</h3>
              <p className="atalhos-regras">
                Use <strong>Ctrl</strong>, <strong>Alt</strong> ou <strong>Shift</strong> + uma tecla.
                Combinações do Windows (ex.: Alt+F4) e do navegador não são permitidas.
              </p>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Abrir tela</label>
                <select
                  className="form-select"
                  value={paginaAlvo}
                  onChange={(e) => setPaginaAlvo(e.target.value as Pagina)}
                >
                  {paginasDisponiveis.map(({ pagina, label }) => (
                    <option key={pagina} value={pagina}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div
                className={`atalhos-captura ${capturando ? 'atalhos-captura-ativa' : ''}`}
                tabIndex={0}
                role="button"
                onClick={iniciarCaptura}
                onKeyDown={(e) => e.key === 'Enter' && iniciarCaptura()}
              >
                <Keyboard size={22} />
                {capturando ? (
                  <span>Pressione a combinação… (Esc para cancelar)</span>
                ) : combo ? (
                  <kbd className="atalhos-kbd">{formatarAtalho(combo)}</kbd>
                ) : (
                  <span>Clique aqui e pressione a combinação de teclas</span>
                )}
              </div>

              {erro && <div className="error-message">{erro}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={salvarAtalho}
                  disabled={!combo || Boolean(erro)}
                >
                  <Save size={18} />
                  Salvar atalho
                </button>
                {!capturando && (
                  <button type="button" className="btn btn-secondary" onClick={iniciarCaptura}>
                    <Plus size={18} />
                    Capturar teclas
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="table-card">
            <div className="card-body">
              <div className="atalhos-consulta-cabecalho">
                <span className="atalho-card-icon">
                  <List size={18} />
                </span>
                <div>
                  <h3 className="card-section-title">
                    {atalhos.length === 0
                      ? 'Nenhum atalho cadastrado'
                      : `${atalhos.length} atalho${atalhos.length === 1 ? '' : 's'} cadastrado${atalhos.length === 1 ? '' : 's'}`}
                  </h3>
                  <p className="atalhos-regras" style={{ marginBottom: 0 }}>
                    Pressione a combinação em qualquer tela do sistema para abrir a tela vinculada.
                  </p>
                </div>
              </div>

              {ordenados.length === 0 ? (
                <div className="atalhos-consulta-vazio">
                  <Keyboard size={32} strokeWidth={1.25} />
                  <p>Você ainda não registrou atalhos de teclado.</p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setAba('cadastro')}
                  >
                    <Plus size={18} />
                    Cadastrar primeiro atalho
                  </button>
                </div>
              ) : (
                <ul className="atalhos-lista atalhos-lista-consulta">
                  {ordenados.map((atalho) => (
                    <li key={atalho.id} className="atalhos-lista-item">
                      <kbd className="atalhos-kbd">{formatarAtalho(atalho)}</kbd>
                      <span className="atalhos-lista-tela">{PAGINA_TITULOS[atalho.pagina]}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm"
                        title="Remover atalho"
                        onClick={() => excluir(atalho.id)}
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
      </div>
    </PageShell>
  )
}
