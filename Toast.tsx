import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

export function ToastViewport() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[360px] max-w-[calc(100%-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white px-4 py-3 shadow-lg ${
            t.kind === 'error' ? 'border-red-200' : t.kind === 'info' ? 'border-sky-200' : 'border-teal-200'
          }`}
        >
          {t.kind === 'error' ? (
            <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={18} />
          ) : t.kind === 'info' ? (
            <Info className="mt-0.5 shrink-0 text-sky-600" size={18} />
          ) : (
            <CheckCircle2 className="mt-0.5 shrink-0 text-teal-600" size={18} />
          )}
          <p className="flex-1 text-sm font-medium text-ink-900">{t.message}</p>
          <button type="button" onClick={() => dismiss(t.id)} className="text-ink-500 hover:text-ink-900">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
