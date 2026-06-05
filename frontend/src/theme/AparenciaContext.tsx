import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  APARENCIA_ALTERADA_EVENT,
  APARENCIA_PADRAO,
  NOME_MARCA_PADRAO,
  type AparenciaConfig,
  aplicarAparencia,
  carregarAparencia,
  salvarAparencia,
} from './aparenciaStorage'

interface AparenciaContextValue {
  config: AparenciaConfig
  nomeMarca: string
  atualizar: (parcial: Partial<AparenciaConfig>) => void
  restaurarPadrao: () => void
}

const AparenciaContext = createContext<AparenciaContextValue | null>(null)

export function AparenciaProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AparenciaConfig>(() => carregarAparencia())

  useEffect(() => {
    aplicarAparencia(config)
  }, [config])

  useEffect(() => {
    function sync() {
      setConfig(carregarAparencia())
    }
    window.addEventListener(APARENCIA_ALTERADA_EVENT, sync)
    return () => window.removeEventListener(APARENCIA_ALTERADA_EVENT, sync)
  }, [])

  const atualizar = useCallback((parcial: Partial<AparenciaConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...parcial }
      salvarAparencia(next)
      return next
    })
  }, [])

  const restaurarPadrao = useCallback(() => {
    const padrao = { ...APARENCIA_PADRAO }
    setConfig(padrao)
    salvarAparencia(padrao)
    aplicarAparencia(padrao)
  }, [])

  const nomeMarca = config.nomeMarca?.trim() || NOME_MARCA_PADRAO

  const value = useMemo(
    () => ({ config, nomeMarca, atualizar, restaurarPadrao }),
    [config, nomeMarca, atualizar, restaurarPadrao]
  )

  return <AparenciaContext.Provider value={value}>{children}</AparenciaContext.Provider>
}

export function useAparencia() {
  const ctx = useContext(AparenciaContext)
  if (!ctx) throw new Error('useAparencia must be used within AparenciaProvider')
  return ctx
}
