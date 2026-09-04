import { getUser } from '../../data/mock'
import { formatDateTime } from '../../lib/format'
import { LineBadge } from '../ui/StatusBadge'
import type { Invoice } from '../../types'
import { Check, Circle, RotateCcw, X } from 'lucide-react'

export function ApprovalTimeline({ invoice }: { invoice: Invoice }) {
  const items = invoice.allocations.map((line) => {
    const user = getUser(line.assigneeId)
    const principal = getUser(line.originalAssigneeId)
    return { line, user, principal }
  })

  return (
    <div className="space-y-3">
      {items.length === 0 && <p className="text-sm text-ink-500">Henüz onay satırı oluşmadı.</p>}
      {items.map(({ line, user, principal }) => (
        <div key={line.id} className="flex gap-3 rounded-xl border border-ink-100 bg-white p-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              line.status === 'approved'
                ? 'bg-teal-50 text-teal-700'
                : line.status === 'rejected'
                  ? 'bg-rose-50 text-rose-700'
                  : line.status === 'revision'
                    ? 'bg-orange-50 text-orange-700'
                    : 'bg-yellow-50 text-yellow-700'
            }`}
          >
            {line.status === 'approved' ? <Check size={16} /> : line.status === 'rejected' ? <X size={16} /> : line.status === 'revision' ? <RotateCcw size={16} /> : <Circle size={14} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink-900">{line.department}</span>
              <LineBadge status={line.status} />
              {line.isDelegate && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                  Vekaleten
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-700">
              {formatMoneySafe(line.amount)} · {line.project || 'Proje belirtilmedi'}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              Onaycı: {user?.name ?? 'Atanmadı'}
              {line.isDelegate && principal ? ` (asıl yetkili: ${principal.name})` : ''}
            </p>
            {line.accountCode && (
              <p className="mt-1 font-mono text-xs text-ink-500">
                {line.accountCode} · {line.projectCode} · {line.expenseCode}
              </p>
            )}
            {line.jiraLink && (
              <p className="mt-1 truncate text-[11px] text-teal-700">{line.jiraLink}</p>
            )}
            {line.approvedAt && <p className="mt-1 text-xs text-teal-700">Onay: {formatDateTime(line.approvedAt)}</p>}
            {line.rejectedAt && (
              <p className="mt-1 text-xs text-rose-700">
                Red: {formatDateTime(line.rejectedAt)} — {line.rejectReason}
              </p>
            )}
            {line.revisionAt && (
              <p className="mt-1 text-xs text-orange-800">
                Revizyon: {formatDateTime(line.revisionAt)} — {line.revisionReason}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatMoneySafe(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(n)
}
