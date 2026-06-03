import { useEffect, useState } from 'react'
import { Settings, ShieldAlert } from 'lucide-react'
import { api } from '../api'
import type { EstoqueConfiguracao } from '../types'

export function EstoqueConfigPage() {
  const [config, setConfig] = useState<EstoqueConfiguracao | null>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)

  useEffect(() => {
    api
      .getEstoqueConfiguracoes()
      .then(setConfig)
      .finally(() => setLoading(false))
  }, [])

  async function atualizarConfig(campo: keyof EstoqueConfiguracao, valor: boolean) {
    if (!config) return
    setSalvando(true)
    setErro('')
    setSucesso(false)
    const payload = { ...config, [campo]: valor }
    try {
      const res = await api.updateEstoqueConfiguracoes(payload)
      setConfig(res)
      setSucesso(true)
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao salvar configuração')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configurações de Estoque</h1>
        <p className="page-subtitle">
          Regras de operação, bloqueios e comportamento do módulo de estoque
        </p>
      </div>

      {erro && <div className="error-message">{erro}</div>}
      {sucesso && <div className="success-message">Configurações salvas.</div>}

      {loading ? (
        <div className="loading">Carregando configurações...</div>
      ) : (
        <div className="estoque-config-layout">
          <section className="form-card estoque-config-section">
            <h3 className="chart-title estoque-config-section-title">
              <ShieldAlert size={20} />
              Regras de venda e bloqueio
            </h3>
            <p className="estoque-config-section-desc">
              Defina como o sistema se comporta ao registrar vendas e movimentações.
            </p>

            <div className="estoque-config-rule">
              <div className="estoque-config-rule-text">
                <strong>Operar com estoque insuficiente</strong>
                <p>
                  Quando ativado, permite vendas mesmo com saldo zero ou menor que a
                  quantidade vendida. Útil enquanto o cadastro de estoque não estiver
                  completo.
                </p>
              </div>
              <label className="import-checkbox checkbox-label estoque-config-toggle">
                <input
                  type="checkbox"
                  checked={config?.permitir_estoque_insuficiente ?? false}
                  disabled={salvando || !config}
                  onChange={(e) =>
                    atualizarConfig('permitir_estoque_insuficiente', e.target.checked)
                  }
                />
                {config?.permitir_estoque_insuficiente
                  ? 'Ativado'
                  : 'Desativado — bloqueia venda sem saldo'}
              </label>
            </div>
          </section>

          <section className="form-card estoque-config-section estoque-config-section-muted">
            <h3 className="chart-title estoque-config-section-title">
              <Settings size={20} />
              Outras regras
            </h3>
            <p className="estoque-config-section-desc">
              Novas regras de estoque (alertas automáticos, reserva, bloqueio por
              categoria, etc.) serão configuradas nesta tela.
            </p>
            <ul className="em-breve-list">
              <li>Alerta automático de estoque mínimo</li>
              <li>Bloqueio de produtos inativos na venda</li>
              <li>Reserva de estoque para pedidos</li>
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}
