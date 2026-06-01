import { useEffect, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, Download, CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import { api } from '../api'
import type { ImportacaoResultado } from '../types'

interface ImportExcelProps {
  onSuccess?: () => void
}

export function ImportExcel({ onSuccess }: ImportExcelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [substituir, setSubstituir] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState<ImportacaoResultado | null>(null)
  const [colunas, setColunas] = useState<{ obrigatorias: string[]; opcionais: string[] } | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    api.getColunasImportacao().then(setColunas)
  }, [])

  function selecionarArquivo(file: File | null) {
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
      setError('Selecione um arquivo Excel (.xlsx)')
      return
    }

    setLoading(true)
    setError('')
    setResultado(null)

    try {
      const res = await api.importarExcel(arquivo, substituir)
      setResultado(res)
      if (res.importadas > 0) onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar planilha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Importar Planilha</h1>
        <p className="page-subtitle">
          Importe vendas do Excel com os campos da sua planilha atual
        </p>
      </div>

      <div className="import-grid">
        <div className="form-card">
          <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
            Enviar arquivo Excel
          </h3>

          <div
            className={`upload-zone ${dragOver ? 'drag-over' : ''} ${arquivo ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xlsm,.xltx"
              hidden
              onChange={(e) => selecionarArquivo(e.target.files?.[0] || null)}
            />
            {arquivo ? (
              <>
                <FileSpreadsheet size={40} color="#c9a227" />
                <p className="upload-filename">{arquivo.name}</p>
                <p className="upload-hint">Clique para trocar o arquivo</p>
              </>
            ) : (
              <>
                <Upload size={40} color="#64748b" />
                <p>Arraste sua planilha aqui ou clique para selecionar</p>
                <p className="upload-hint">Formato: .xlsx</p>
              </>
            )}
          </div>

          <label className="import-checkbox">
            <input
              type="checkbox"
              checked={substituir}
              onChange={(e) => setSubstituir(e.target.checked)}
            />
            Substituir vendas com ID duplicado (em vez de ignorar)
          </label>

          {error && <div className="error-message" style={{ marginTop: '1rem' }}>{error}</div>}

          <div className="form-actions" style={{ marginTop: '1.25rem' }}>
            <button
              className="btn btn-primary"
              onClick={handleImportar}
              disabled={loading || !arquivo}
            >
              <Upload size={18} />
              {loading ? 'Importando...' : 'Importar Planilha'}
            </button>
            <a className="btn btn-secondary" href="/api/vendas/importar/modelo" download>
              <Download size={18} />
              Baixar Modelo
            </a>
          </div>
        </div>

        <div className="form-card">
          <h3 className="chart-title" style={{ marginBottom: '1rem' }}>
            Colunas aceitas
          </h3>

          <div className="colunas-info">
            <div>
              <h4>Obrigatórias</h4>
              <ul>
                {(colunas?.obrigatorias || ['data', 'valor', 'forma_pag', 'quantidade', 'desconto', 'produto']).map((c) => (
                  <li key={c}><code>{c}</code></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Opcionais</h4>
              <ul>
                {(colunas?.opcionais || ['id', 'cliente', 'troco', 'valor_recebido', 'observacao']).map((c) => (
                  <li key={c}><code>{c}</code></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="import-exemplo">
            <h4>Exemplo — venda em dinheiro com troco</h4>
            <p>
              Valor da venda: <strong>R$ 112,80</strong> · Cliente passou: <strong>R$ 150,00</strong> · Troco: <strong>R$ 37,20</strong>
            </p>
            <p className="text-muted" style={{ fontSize: '0.8125rem', marginTop: '0.5rem' }}>
              O sistema detecta automaticamente variações como &quot;forma pag&quot;, &quot;valor recebido&quot;, &quot;cliente passou&quot; etc.
              Linhas vazias e anotações sem produto são ignoradas.
            </p>
          </div>
        </div>
      </div>

      {resultado && (
        <div className="import-resultado">
          <h3 className="chart-title">Resultado da importação</h3>

          <div className="resultado-cards">
            <div className="resultado-card sucesso">
              <CheckCircle size={24} />
              <div>
                <span className="resultado-num">{resultado.importadas}</span>
                <span className="resultado-label">Importadas</span>
              </div>
            </div>
            <div className="resultado-card aviso">
              <AlertCircle size={24} />
              <div>
                <span className="resultado-num">{resultado.ignoradas}</span>
                <span className="resultado-label">Ignoradas</span>
              </div>
            </div>
            <div className="resultado-card erro">
              <XCircle size={24} />
              <div>
                <span className="resultado-num">{resultado.erros.length}</span>
                <span className="resultado-label">Erros</span>
              </div>
            </div>
          </div>

          {resultado.colunas_detectadas.length > 0 && (
            <p className="text-muted" style={{ marginBottom: '1rem' }}>
              Colunas detectadas: {resultado.colunas_detectadas.join(', ')}
            </p>
          )}

          {(resultado.erros.length > 0 || resultado.detalhes_ignoradas.length > 0) && (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Status</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {resultado.detalhes_ignoradas.map((item, i) => (
                    <tr key={`ign-${i}`}>
                      <td>{item.linha}</td>
                      <td><span className="badge badge-warn">Ignorada</span></td>
                      <td>{item.motivo}{item.produto ? ` — ${item.produto}` : ''}</td>
                    </tr>
                  ))}
                  {resultado.erros.map((item, i) => (
                    <tr key={`err-${i}`}>
                      <td>{item.linha}</td>
                      <td><span className="badge badge-error">Erro</span></td>
                      <td>{item.mensagem}{item.produto ? ` — ${item.produto}` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
