import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition placeholder:text-ink-500 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClass} ${props.className ?? ''}`} {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${inputClass} ${props.className ?? ''}`} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-[88px] ${props.className ?? ''}`} {...props} />
}
