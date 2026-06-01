import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../theme/ThemeContext'

interface ThemeToggleProps {
  compact?: boolean
}

export function ThemeToggle({ compact }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`theme-toggle ${compact ? 'theme-toggle-compact' : ''}`}
      onClick={toggleTheme}
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      title={isDark ? 'Tema claro' : 'Tema escuro'}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${isDark ? 'is-dark' : 'is-light'}`}>
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </span>
      </span>
      {!compact && (
        <span className="theme-toggle-label">{isDark ? 'Escuro' : 'Claro'}</span>
      )}
    </button>
  )
}
