import { useRef, useState } from 'react'
import { Upload, FileCode2, CheckCircle, AlertCircle } from 'lucide-react'
import { api } from '../api'
import type { ImportacaoNFeResultado } from '../types'

interface ImportarNFeXmlProps {
  onSuccess?: () => void
}

export function ImportarNFeXml({ onSuccess }: ImportarNFeXmlProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [atualizarPreco, setAtualizarPreco] = useState(false)
  const [criarInexistentes, setCriarInexistentes] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ImportacaoNFeResultado | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function selecionarArquivo(file: File | null) {
    if (!file) return
    const nome = file.name.toLowerCase()
    if (!nome.endsWith('.xml') && !nome.endsWith('.zip')) {
      setError('Use arquivo .xml ou .zip com o XML da NF-e')
      return
    }
    setArquivo(file)
    setError('')
    setResultado(null)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) selecionarArquivo(file)
  }

  async function handleImportar() {
    if (!arquivo) {
      setError('Selecione o XML da nota fiscal')
      return
    }

    setLoading(true)
    setError('')
    setResultado(null)

    try {
      const res = await api.importarXmlNFe(arquivo, {
        atualizar_preco: atualizarPreco,
        criar_inexistentes: criarInexistentes,
      })
      setResultado(res)
      if (res.itens_processados > 0) onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar XML')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-card" style={{ marginBottom: '1.5rem' }}>
      <h3 className="chart-title" style={{ marginBottom: '0.5rem' }}>
        <FileCode2 size={20} style={{ verticalAlign: 'middle', marginRight: 8 }} />
        Importar XML da NF-e
      </h3>
      <p className="page-subtitle" style={{ marginBottom: '1rem' }}>
        Envie o XML (ou ZIP) da nota de compra para dar entrada automática no estoque
      </p>

      {error && <div className="error-message">{error}</div>}

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''} ${arquivo ? 'has-file' : ''}`}
        style={{ marginBottom: '1rem' }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml,.zip,application/xml,text/xml,application/zip"
          hidden
          onChange={(e) => selecionarArquivo(e.target.files?.[0] ?? null)}
        />
        <Upload size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
        {arquivo ? (
          <p>
            <strong>{arquivo.name}</strong>
          </p>
        ) : (
          <p>Arraste o XML da NF-e ou clique para selecionar</p>
        )}
        <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          Formatos: .xml, .zip
        </span>
      </div>

      <div className="form-grid" style={{ marginBottom: '1rem' }}>
        <label className="import-checkbox checkbox-label">
          <input
            type="checkbox"
            checked={criarInexistentes}
            onChange={(e) => setCriarInexistentes(e.target.checked)}
          />
          Criar produtos que ainda não existem no cadastro
        </label>
        <label className="import-checkbox checkbox-label">
          <input
            type="checkbox"
            checked={atualizarPreco}
            onChange={(e) => setAtualizarPreco(e.target.checked)}
          />
          Atualizar preço de venda com o valor unitário da nota
        </label>
      </div>

      <button
        type="button"
        className="btn btn-primary"
        disabled={loading || !arquivo}
        onClick={handleImportar}
      >
        {loading ? 'Importando...' : 'Importar para o estoque'}
      </button>

      {resultado && (
        <div className="import-resultado" style={{ marginTop: '1.25rem' }}>
          <div className="resultado-grid">
            <div className="resultado-item resultado-ok">
              <CheckCircle size={20} />
              <span className="resultado-num">{resultado.itens_processados}</span>
              <span className="resultado-label">itens importados</span>
            </div>
            <div className="resultado-item">
              <span className="resultado-num">{resultado.produtos_criados}</span>
              <span className="resultado-label">produtos novos</span>
            </div>
            <div className="resultado-item">
              <span className="resultado-num">{resultado.total_unidades}</span>
              <span className="resultado-label">unidades em entrada</span>
            </div>
          </div>

          {(resultado.nota_numero || resultado.emitente) && (
            <p style={{ marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {resultado.nota_numero && (
                <>
                  Nota <strong>{resultado.nota_numero}</strong>
                  {resultado.nota_serie && ` / série ${resultado.nota_serie}`}
                </>
              )}
              {resultado.emitente && (
                <>
                  {resultado.nota_numero ? ' · ' : ''}
                  Emitente: <strong>{resultado.emitente}</strong>
                </>
              )}
            </p>
          )}

          {resultado.itens.length > 0 && (
            <div className="table-wrapper" style={{ marginTop: '1rem', maxHeight: 220, overflow: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Produto</th>
                    <th>Qtd</th>
                    <th>Estoque</th>
                    <th>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.itens.map((item) => (
                    <tr key={`${item.numero_item}-${item.produto}`}>
                      <td>{item.numero_item}</td>
                      <td>{item.produto}</td>
                      <td>{item.quantidade}</td>
                      <td>{item.estoque_posterior ?? '—'}</td>
                      <td>
                        <span className="badge">
                          {item.acao === 'criado_entrada' ? 'Novo + entrada' : 'Entrada'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {resultado.erros.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p className="text-saida" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertCircle size={16} /> Avisos / itens não importados
              </p>
              <ul style={{ marginTop: 8, paddingLeft: '1.25rem', fontSize: '0.875rem' }}>
                {resultado.erros.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
