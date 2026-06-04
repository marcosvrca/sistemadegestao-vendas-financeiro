import { Bell, BellOff } from 'lucide-react'

interface BotaoAlertaProps {
  ativo: boolean
  onClick: () => void
  titulo?: string
  size?: number
  className?: string
}

export function BotaoAlerta({
  ativo,
  onClick,
  titulo,
  size = 18,
  className = '',
}: BotaoAlertaProps) {
  const label = titulo ?? (ativo ? 'Remover alerta' : 'Marcar como alerta')

  return (
    <button
      type="button"
      className={`btn-alerta ${ativo ? 'btn-alerta-ativo' : ''} ${className}`.trim()}
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={ativo}
    >
      {ativo ? <Bell size={size} /> : <BellOff size={size} />}
    </button>
  )
}
