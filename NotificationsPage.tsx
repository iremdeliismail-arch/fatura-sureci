import { Bell, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { formatDateTime } from '../lib/format'
import type { NotificationKind } from '../types'

const KIND_LABEL: Record<NotificationKind, string> = {
  approval: 'Onay görevi',
  revision: 'Revizyon',
  resubmit: 'Yeniden onay',
  accounting: 'Muhasebe',
  mapping: 'Mapping',
  delegation: 'Vekalet',
  elogo: 'E-LOGO',
}

export function NotificationsPage() {
  const app = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  if (!user) return null

  const rows = app.notifications.filter((n) => n.userId === user.id)
  const unread = rows.filter((n) => !n.read).length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Bildirimler</h1>
          <p className="text-sm text-ink-500">
            Uygulama içi bildirimler. Her kayıt için e-posta kopyası da simüle edilir.
          </p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={() => app.markNotificationsRead(user.id)}>
            Tümünü okundu işaretle
          </Button>
        )}
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Bildirim yok" description="Yeni görev, revizyon veya vekalet oluşunca burada listelenir." />
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition hover:border-teal-200 ${
                  n.read ? 'border-ink-100 bg-white' : 'border-teal-200 bg-teal-50/40'
                }`}
                onClick={() => {
                  app.markNotificationsRead(user.id, [n.id])
                  if (n.invoiceId) navigate(`/faturalar/${n.invoiceId}`)
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bell size={16} className={n.read ? 'text-ink-400' : 'text-teal-700'} />
                    <span className="text-sm font-semibold text-ink-900">{n.title}</span>
                    <span className="rounded-full bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
                      {KIND_LABEL[n.kind]}
                    </span>
                  </div>
                  <span className="text-xs text-ink-500">{formatDateTime(n.at)}</span>
                </div>
                <p className="mt-2 text-sm text-ink-700">{n.body}</p>
                <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-500">
                  <Mail size={12} /> E-posta kopyası (simülasyon)
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
