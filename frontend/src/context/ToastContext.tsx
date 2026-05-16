import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import Toast from '../components/Toast'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface ToastItem {
  id:      number
  message: string
  type:    ToastType
}

interface ToastApi {
  show:    (message: string, type?: ToastType, duration?: number) => number
  success: (msg: string, dur?: number) => number
  error:   (msg: string, dur?: number) => number
  warning: (msg: string, dur?: number) => number
  info:    (msg: string, dur?: number) => number
}

const Ctx = createContext<ToastApi | null>(null)
let _id = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback((message: string, type: ToastType = 'info', duration = 3000): number => {
    const id = _id++
    setToasts((prev) => [...prev, { id, message, type }])
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }, [dismiss])

  const toast = useMemo<ToastApi>(() => ({
    show,
    success: (msg, dur) => show(msg, 'success', dur),
    error:   (msg, dur) => show(msg, 'error',   dur),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info:    (msg, dur) => show(msg, 'info',    dur),
  }), [show])

  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return ctx
}
