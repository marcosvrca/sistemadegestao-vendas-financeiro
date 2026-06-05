import { useRef, useState } from 'react'
import { ImagePlus, Palette, RotateCcw, Save, Trash2 } from 'lucide-react'
import { PageShell } from '../PageShell'
import { ConfigBreadcrumb } from './ConfigBreadcrumb'
import { useTheme } from '../../theme/ThemeContext'
import { useAparencia } from '../../theme/AparenciaContext'
import { CORES_SUGERIDAS, NOME_MARCA_PADRAO } from '../../theme/aparenciaStorage'
import type { Pagina } from '../../navigation'

interface RecursosAparenciaPageProps {
  onNavigate?: (pagina: Pagina) => void
}

const LOGO_MAX_BYTES = 512 * 1024

export function RecursosAparenciaPage({ onNavigate }: RecursosAparenciaPageProps) {
  const { theme, setTheme } = useTheme()
  const { config, atualizar, restaurarPadrao } = useAparencia()
  const fileRef = useRef<HTMLInputElement>(null)

  const [cor, setCor] = useState(config.corDestaque ?? '#c9a227')
  const [nome, setNome] = useState(config.nomeMarca ?? '')
  const [erro, setErro] = useState('')
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    setCor(config.corDestaque ?? '#c9a227')
    setNome(config.nomeMarca ?? '')
  }, [config.corDestaque, config.nomeMarca])

  function salvar() {
    setErro('')
    atualizar({
      corDestaque: cor,
      nomeMarca: nome.trim() || null,
    })
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem (PNG, JPG, WebP ou SVG).')
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setErro('A logo deve ter no máximo 512 KB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        atualizar({ logoUrl: reader.result })
        setErro('')
      }
    }
    reader.readAsDataURL(file)
  }

  function removerLogo() {
    atualizar({ logoUrl: null })
  }

  function restaurar() {
    if (!confirm('Restaurar cores, logo e nome para o padrão do sistema?')) return
    restaurarPadrao()
    setCor('#c9a227')
    setNome('')
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2500)
  }

  return (
    <PageShell
      title="Aparência do sistema"
      subtitle="Altere as cores de destaque, a logo e o nome exibidos no menu"
      width="form"
    >
      {onNavigate && (
        <ConfigBreadcrumb
          onNavigate={onNavigate}
          items={[
            { label: 'Recursos', pagina: 'recursos' },
            { label: 'Configurações', pagina: 'recursos-configuracoes' },
            { label: 'Aparência do sistema' },
          ]}
        />
      )}

      <div className="page-stack">
        {salvo && <div className="success-message">Aparência salva.</div>}
        {erro && <div className="error-message">{erro}</div>}

        <div className="panel-card">
          <div className="card-body">
            <h3 className="card-section-title">Tema da interface</h3>
            <p className="atalhos-regras">
              Modo claro ou escuro para fundos, textos e cartões.
            </p>
            <div className="config-tema-opcoes">
              <label className="config-tema-opcao">
                <input
                  type="radio"
                  name="tema"
                  checked={theme === 'light'}
                  onChange={() => setTheme('light')}
                />
                Claro
              </label>
              <label className="config-tema-opcao">
                <input
                  type="radio"
                  name="tema"
                  checked={theme === 'dark'}
                  onChange={() => setTheme('dark')}
                />
                Escuro
              </label>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="card-body">
            <h3 className="card-section-title">Cor de destaque</h3>
            <p className="atalhos-regras">
              Usada em botões, links, ícones ativos e destaques do sistema.
            </p>

            <div className="aparencia-cores-sugeridas">
              {CORES_SUGERIDAS.map(({ nome: rotulo, hex }) => (
                <button
                  key={hex}
                  type="button"
                  className={`aparencia-cor-chip ${cor === hex ? 'aparencia-cor-chip-ativa' : ''}`}
                  title={rotulo}
                  onClick={() => setCor(hex)}
                >
                  <span className="aparencia-cor-amostra" style={{ background: hex }} />
                  <span>{rotulo}</span>
                </button>
              ))}
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="cor-personalizada">
                Cor personalizada
              </label>
              <div className="aparencia-cor-input-row">
                <input
                  id="cor-personalizada"
                  type="color"
                  className="aparencia-color-picker"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                />
                <input
                  type="text"
                  className="form-input"
                  value={cor}
                  onChange={(e) => setCor(e.target.value)}
                  placeholder="#c9a227"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel-card">
          <div className="card-body">
            <h3 className="card-section-title">Logo e nome</h3>
            <p className="atalhos-regras">
              A logo aparece no menu lateral e no cabeçalho. PNG, JPG, WebP ou SVG (máx. 512 KB).
            </p>

            <div className="aparencia-logo-preview">
              <div className={`sidebar-logo-icon ${config.logoUrl ? 'sidebar-logo-icon--imagem' : ''}`}>
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="Prévia da logo" className="app-brand-logo" />
                ) : (
                  <Palette size={22} />
                )}
              </div>
              <div>
                <strong>{nome.trim() || NOME_MARCA_PADRAO}</strong>
                <p className="alertas-secao-sub">Prévia no menu</p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              hidden
              onChange={onLogoChange}
            />

            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={18} />
                Enviar logo
              </button>
              {config.logoUrl && (
                <button type="button" className="btn btn-ghost" onClick={removerLogo}>
                  <Trash2 size={18} />
                  Remover logo
                </button>
              )}
            </div>

            <div className="form-group" style={{ marginTop: '1rem' }}>
              <label className="form-label" htmlFor="nome-marca">
                Nome exibido
              </label>
              <input
                id="nome-marca"
                type="text"
                className="form-input"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder={NOME_MARCA_PADRAO}
                maxLength={48}
              />
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn btn-primary" onClick={salvar}>
            <Save size={18} />
            Salvar aparência
          </button>
          <button type="button" className="btn btn-secondary" onClick={restaurar}>
            <RotateCcw size={18} />
            Restaurar padrão
          </button>
        </div>
      </div>
    </PageShell>
  )
}
