import { useEffect, useState } from 'react'
import { RECURSOS_ALTERADOS_EVENT, carregarAlertas } from './recursosStorage'

export function useAlertasRecursos() {
  const [alertas, setAlertas] = useState(carregarAlertas)

  useEffect(() => {
    function atualizar() {
      setAlertas(carregarAlertas())
    }
    window.addEventListener(RECURSOS_ALTERADOS_EVENT, atualizar)
    return () => window.removeEventListener(RECURSOS_ALTERADOS_EVENT, atualizar)
  }, [])

  return alertas
}
