import { useEffect, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

const ICONS: Record<ToastType, string> = {
  success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
}

interface ToastProps {
  id:        number
  message:   string
  type:      ToastType
  onDismiss: (id: number) => void
}

export default function Toast({ id, message, type, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(t)
  }, [])

  function dismiss() {
    setVisible(false)
    setTimeout(() => onDismiss(id), 280)
  }

  return (
    <div
      className={`toast toast--${type} ${visible ? 'toast--in' : ''}`}
      role="alert"
      onClick={dismiss}
    >
      <span className="toast__icon">{ICONS[type]}</span>
      <span className="toast__msg">{message}</span>
    </div>
  )
}
