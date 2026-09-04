import type { InvoiceStatus, LineStatus } from '../../types'
import { LINE_STATUS_META, STATUS_META } from '../../lib/status'

export function StatusBadge({
  status,
  showDescription = false,
}: {
  status: InvoiceStatus
  showDescription?: boolean
}) {
  const meta = STATUS_META[status]
  return (
    <span className="inline-flex max-w-full flex-col items-start gap-0.5">
      <span
        title={meta.description}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}
      >
        {meta.label}
      </span>
      {showDescription && (
        <span className="text-[11px] font-medium leading-snug text-ink-500">{meta.description}</span>
      )}
    </span>
  )
}

export function LineBadge({ status }: { status: LineStatus }) {
  const meta = LINE_STATUS_META[status]
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  )
}

export function Chip({ children, className = '' }: { children: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700 ${className}`}>
      {children}
    </span>
  )
}
