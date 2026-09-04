import { createContext, createElement, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: string
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  toasts: ToastItem[]
  push: (message: string, kind?: ToastKind) => void
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setToasts((prev) => [...prev, { id, kind, message }])
    window.setTimeout(() => dismiss(id), 3600)
  }, [dismiss])

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])
  return createElement(ToastContext.Provider, { value }, children)
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('ToastProvider missing')
  return ctx
}
