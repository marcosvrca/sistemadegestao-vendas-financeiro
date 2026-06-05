import { useEffect } from 'react'
import type { Pagina } from './navigation'
import {
  ATALHOS_ALTERADOS_EVENT,
  atalhoCombinaEvento,
  carregarAtalhosTeclado,
  estaCapturandoAtalho,
  teclaEmCampoTexto,
} from './atalhosTecladoStorage'

export function useAtalhosTecladoGlobal(onNavigate: (pagina: Pagina) => void) {
  useEffect(() => {
    let atalhos = carregarAtalhosTeclado()

    function atualizar() {
      atalhos = carregarAtalhosTeclado()
    }

    function onKeyDown(e: KeyboardEvent) {
      if (estaCapturandoAtalho()) return
      if (teclaEmCampoTexto(e)) return

      for (const atalho of atalhos) {
        if (atalhoCombinaEvento(atalho, e)) {
          e.preventDefault()
          onNavigate(atalho.pagina)
          return
        }
      }
    }

    window.addEventListener(ATALHOS_ALTERADOS_EVENT, atualizar)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener(ATALHOS_ALTERADOS_EVENT, atualizar)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onNavigate])
}
