import type { Pagina } from './navigation'
import { gerarId } from './recursosStorage'

export interface AtalhoTeclado {
  id: string
  pagina: Pagina
  ctrl: boolean
  alt: boolean
  shift: boolean
  key: string
}

export interface AtalhoCapturado {
  ctrl: boolean
  alt: boolean
  shift: boolean
  key: string
}

const STORAGE_KEY = 'recanto-atalhos-teclado'
export const ATALHOS_ALTERADOS_EVENT = 'recanto-atalhos-alterados'

let capturandoAtalho = false

export function setCapturandoAtalho(ativo: boolean): void {
  capturandoAtalho = ativo
}

export function estaCapturandoAtalho(): boolean {
  return capturandoAtalho
}

/** Teclas reservadas do sistema / navegador (comparação case-insensitive na tecla). */
const COMBOS_PROIBIDOS: AtalhoCapturado[] = [
  { ctrl: false, alt: true, shift: false, key: 'F4' },
  { ctrl: false, alt: true, shift: false, key: 'Tab' },
  { ctrl: false, alt: true, shift: false, key: 'Escape' },
  { ctrl: false, alt: true, shift: false, key: ' ' },
  { ctrl: true, alt: false, shift: false, key: 'w' },
  { ctrl: true, alt: false, shift: false, key: 'W' },
  { ctrl: true, alt: false, shift: false, key: 't' },
  { ctrl: true, alt: false, shift: false, key: 'T' },
  { ctrl: true, alt: false, shift: false, key: 'n' },
  { ctrl: true, alt: false, shift: false, key: 'N' },
  { ctrl: true, alt: false, shift: false, key: 'r' },
  { ctrl: true, alt: false, shift: false, key: 'R' },
  { ctrl: true, alt: true, shift: false, key: 'Delete' },
  { ctrl: true, alt: true, shift: false, key: 'Del' },
  { ctrl: true, alt: false, shift: true, key: 'Delete' },
  { ctrl: true, alt: false, shift: true, key: 'I' },
  { ctrl: true, alt: false, shift: true, key: 'i' },
  { ctrl: false, alt: false, shift: false, key: 'F11' },
  { ctrl: false, alt: false, shift: false, key: 'F12' },
  { ctrl: false, alt: false, shift: false, key: 'F5' },
  { ctrl: true, alt: false, shift: false, key: 'F5' },
]

const TECLAS_SO_MODIFICADOR = new Set([
  'Control',
  'Alt',
  'Shift',
  'Meta',
  'OS',
  'Fn',
])

function normalizarTecla(key: string): string {
  if (key.length === 1) return key.toLowerCase()
  return key
}

function combosIguais(a: AtalhoCapturado, b: AtalhoCapturado): boolean {
  return (
    a.ctrl === b.ctrl &&
    a.alt === b.alt &&
    a.shift === b.shift &&
    normalizarTecla(a.key) === normalizarTecla(b.key)
  )
}

export function eventoParaAtalho(e: KeyboardEvent): AtalhoCapturado | null {
  if (e.metaKey) return null
  if (TECLAS_SO_MODIFICADOR.has(e.key)) return null

  return {
    ctrl: e.ctrlKey,
    alt: e.altKey,
    shift: e.shiftKey,
    key: e.key,
  }
}

export function validarAtalho(combo: AtalhoCapturado, existentes: AtalhoTeclado[], ignorarId?: string): string | null {
  if (!combo.ctrl && !combo.alt && !combo.shift) {
    return 'O atalho deve incluir Ctrl, Alt ou Shift (Fn não é detectável pelo navegador).'
  }

  if (TECLAS_SO_MODIFICADOR.has(combo.key)) {
    return 'Pressione uma tecla além do modificador (ex.: Ctrl + K).'
  }

  for (const proibido of COMBOS_PROIBIDOS) {
    if (combosIguais(combo, proibido)) {
      return 'Esta combinação é reservada pelo Windows ou pelo navegador (ex.: Alt+F4).'
    }
  }

  const duplicado = existentes.find(
    (a) => a.id !== ignorarId && combosIguais(combo, a)
  )
  if (duplicado) {
    return 'Esta combinação já está em uso.'
  }

  return null
}

export function formatarTecla(key: string): string {
  if (key === ' ') return 'Espaço'
  if (key.length === 1) return key.toUpperCase()
  return key
}

export function formatarAtalho(atalho: AtalhoCapturado): string {
  const partes: string[] = []
  if (atalho.ctrl) partes.push('Ctrl')
  if (atalho.alt) partes.push('Alt')
  if (atalho.shift) partes.push('Shift')
  partes.push(formatarTecla(atalho.key))
  return partes.join(' + ')
}

export function atalhoCombinaEvento(atalho: AtalhoTeclado, e: KeyboardEvent): boolean {
  if (e.metaKey) return false
  return (
    atalho.ctrl === e.ctrlKey &&
    atalho.alt === e.altKey &&
    atalho.shift === e.shiftKey &&
    normalizarTecla(atalho.key) === normalizarTecla(e.key)
  )
}

export function carregarAtalhosTeclado(): AtalhoTeclado[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as AtalhoTeclado[]
  } catch {
    return []
  }
}

export function salvarAtalhosTeclado(atalhos: AtalhoTeclado[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(atalhos))
  window.dispatchEvent(new CustomEvent(ATALHOS_ALTERADOS_EVENT))
}

export function criarAtalho(pagina: Pagina, combo: AtalhoCapturado): AtalhoTeclado {
  return {
    id: gerarId(),
    pagina,
    ctrl: combo.ctrl,
    alt: combo.alt,
    shift: combo.shift,
    key: combo.key,
  }
}

export function teclaEmCampoTexto(e: KeyboardEvent): boolean {
  const el = e.target
  if (!(el instanceof HTMLElement)) return false
  if (el.isContentEditable) return true
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
}
