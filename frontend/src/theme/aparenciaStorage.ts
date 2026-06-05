export interface AparenciaConfig {
  corDestaque: string | null
  logoUrl: string | null
  nomeMarca: string | null
}

const STORAGE_KEY = 'recanto-aparencia'
export const APARENCIA_ALTERADA_EVENT = 'recanto-aparencia-alterada'

export const APARENCIA_PADRAO: AparenciaConfig = {
  corDestaque: null,
  logoUrl: null,
  nomeMarca: null,
}

export const NOME_MARCA_PADRAO = 'Recanto da Fé'

export function carregarAparencia(): AparenciaConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...APARENCIA_PADRAO }
    const parsed = JSON.parse(raw) as Partial<AparenciaConfig>
    return {
      corDestaque: typeof parsed.corDestaque === 'string' ? parsed.corDestaque : null,
      logoUrl: typeof parsed.logoUrl === 'string' ? parsed.logoUrl : null,
      nomeMarca: typeof parsed.nomeMarca === 'string' ? parsed.nomeMarca : null,
    }
  } catch {
    return { ...APARENCIA_PADRAO }
  }
}

export function salvarAparencia(config: AparenciaConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new CustomEvent(APARENCIA_ALTERADA_EVENT))
}

function clamp(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const limpo = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpo)) return null
  return {
    r: parseInt(limpo.slice(0, 2), 16),
    g: parseInt(limpo.slice(2, 4), 16),
    b: parseInt(limpo.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

function misturar(hex: string, fator: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  const t = fator >= 0 ? 255 : 0
  const p = Math.abs(fator)
  return rgbToHex(
    rgb.r + (t - rgb.r) * p,
    rgb.g + (t - rgb.g) * p,
    rgb.b + (t - rgb.b) * p
  )
}

export function derivarCoresDestaque(hex: string): {
  accent: string
  accentLight: string
  accentDark: string
  accentGlow: string
} {
  const rgb = hexToRgb(hex)
  if (!rgb) {
    return {
      accent: hex,
      accentLight: hex,
      accentDark: hex,
      accentGlow: 'rgba(201, 162, 39, 0.35)',
    }
  }
  return {
    accent: hex,
    accentLight: misturar(hex, 0.22),
    accentDark: misturar(hex, -0.28),
    accentGlow: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
  }
}

export function aplicarCoresDestaque(hex: string | null): void {
  const root = document.documentElement
  if (!hex) {
    root.style.removeProperty('--accent')
    root.style.removeProperty('--accent-light')
    root.style.removeProperty('--accent-dark')
    root.style.removeProperty('--accent-glow')
    return
  }
  const cores = derivarCoresDestaque(hex)
  root.style.setProperty('--accent', cores.accent)
  root.style.setProperty('--accent-light', cores.accentLight)
  root.style.setProperty('--accent-dark', cores.accentDark)
  root.style.setProperty('--accent-glow', cores.accentGlow)
}

export function aplicarAparencia(config: AparenciaConfig): void {
  aplicarCoresDestaque(config.corDestaque)
}

export const CORES_SUGERIDAS = [
  { nome: 'Dourado (padrão)', hex: '#c9a227' },
  { nome: 'Azul', hex: '#3b82f6' },
  { nome: 'Verde', hex: '#22c55e' },
  { nome: 'Roxo', hex: '#a855f7' },
  { nome: 'Vermelho', hex: '#ef4444' },
  { nome: 'Laranja', hex: '#f97316' },
  { nome: 'Teal', hex: '#14b8a6' },
]
