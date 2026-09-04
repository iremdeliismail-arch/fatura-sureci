import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  RotateCcw,
  ShieldAlert,
  XCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { formatMoney, isOverdue } from '../lib/format'
import { pendingApprovals } from '../lib/mapping'
import { StatusBadge } from '../components/ui/StatusBadge'
import { Button } from '../components/ui/Button'

export function DashboardPage() {
  const { user } = useAuth()
  const app = useApp()
  const navigate = useNavigate()
  if (!user) return null

  const invoices =
    user.role === 'manager'
      ? app.invoices.filter((i) => i.allocations.some((a) => a.assigneeId === user.id || a.department === user.department))
      : app.invoices

  const total = invoices.length
  const completed = invoices.filter((i) => i.status === 'Tamamlandı').length
  const rejected = invoices.filter((i) => i.status === 'Kısmi Red').length
  const overdue = invoices.filter((i) => isOverdue(i.dueDate, i.status) && i.status !== 'Tamamlandı').length
  const accountingWait = invoices.filter((i) =>
    ['Tam Onaylandı', 'Muhasebe Kontrolü Bekliyor'].includes(i.status),
  ).length
  const revisionWait = invoices.filter((i) =>
    ['Revizyonda', 'Tedarikçi Düzeltmesi Bekleniyor'].includes(i.status),
  ).length
  const mappingWait = invoices.filter((i) =>
    ['Manuel Fatura Kontrol', 'Mapping Bekliyor', 'Veri Doğrulama Bekliyor'].includes(i.status),
  ).length
  const myPending = pendingApprovals(app.invoices, user.id)

  const kpis = [
    { label: 'Toplam fatura', value: total, to: '/faturalar', icon: FileText, tone: 'bg-navy-50 text-navy-800' },
    {
      label: 'Bende bekleyen',
      value: myPending.length,
      to: '/onaylar',
      icon: Clock3,
      tone: 'bg-yellow-50 text-yellow-800',
    },
    {
      label: 'Muhasebe kontrolü',
      value: accountingWait,
      to: '/muhasebe-kontrol',
      icon: ShieldAlert,
      tone: 'bg-violet-50 text-violet-800',
      hide: user.role === 'manager',
    },
    {
      label: 'Revizyon / hatalı fatura',
      value: revisionWait,
      to: '/muhasebe-kontrol',
      icon: RotateCcw,
      tone: 'bg-orange-50 text-orange-800',
      hide: user.role === 'manager',
    },
    { label: 'Tamamlanan', value: completed, to: '/faturalar?status=Tamamlandı', icon: CheckCircle2, tone: 'bg-teal-50 text-teal-800' },
    { label: 'Reddedilen', value: rejected, to: '/faturalar?status=Kısmi Red', icon: XCircle, tone: 'bg-rose-50 text-rose-800' },
    { label: 'Geciken', value: overdue, to: '/faturalar?overdue=1', icon: AlertTriangle, tone: 'bg-orange-50 text-orange-800' },
  ].filter((k) => !k.hide)

  const attention = invoices
    .filter((i) =>
      [
        'Manuel Fatura Kontrol',
        'Mapping Bekliyor',
        'Veri Doğrulama Bekliyor',
        'Muhasebe Kontrolü Bekliyor',
        'Tam Onaylandı',
        'Entegrasyon Hatası',
        'Kısmi Red',
        'E-LOGO Aktarım Bekliyor',
        'Revizyonda',
        'Tedarikçi Düzeltmesi Bekleniyor',
        'Satın Alma Referansı Bekliyor',
      ].includes(i.status),
    )
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink-900">Dashboard</h1>
        <p className="text-sm text-ink-500">İşinize düşen kayıtlar ve süreç özeti</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <Link
              key={k.label}
              to={k.to}
              className="group flex items-center justify-between rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow"
            >
              <div>
                <div className="text-xs font-medium text-ink-500">{k.label}</div>
                <div className="mt-1 text-2xl font-bold text-ink-900">{k.value}</div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                  Detaya git <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
                </div>
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${k.tone}`}>
                <Icon size={20} />
              </div>
            </Link>
          )
        })}
      </div>

      {(user.role === 'manager' || myPending.length > 0) && (
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink-900">Onay kuyruğum</h2>
            <Link to="/onaylar" className="text-xs font-semibold text-teal-700">
              Tümünü gör
            </Link>
          </div>
          {myPending.length === 0 ? (
            <p className="text-sm text-ink-500">Şu anda onay bekleyen satırınız yok.</p>
          ) : (
            <div className="space-y-2">
              {myPending.slice(0, 5).map(({ invoice, line }) => (
                <Link
                  key={line.id}
                  to={`/faturalar/${invoice.id}`}
                  className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 hover:bg-paper"
                >
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{invoice.number}</div>
                    <div className="text-xs text-ink-500">
                      {invoice.supplierName} · {line.department} · {line.project || 'Proje yok'}
                      {line.isDelegate ? ' · Vekil' : ''}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">{formatMoney(line.amount, invoice.currency)}</div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {user.role !== 'manager' && (
        <section className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Müdahale bekleyenler</h2>
              <p className="text-xs text-ink-500">{mappingWait} kayıt mapping / doğrulama kuyruğunda</p>
            </div>
            {user.role === 'accounting' && (
              <Link to="/faturalar/yeni">
                <Button>Yeni fatura</Button>
              </Link>
            )}
          </div>
          {attention.length === 0 ? (
            <p className="text-sm text-ink-500">Kritik kuyruk boş.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-ink-500">
                  <tr>
                    <th className="pb-2 font-medium">Fatura</th>
                    <th className="pb-2 font-medium">Tedarikçi</th>
                    <th className="pb-2 font-medium">Tutar</th>
                    <th className="pb-2 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {attention.map((inv) => (
                    <tr
                      key={inv.id}
                      tabIndex={0}
                      className="cursor-pointer border-t border-ink-100 hover:bg-paper"
                      onClick={() => navigate(`/faturalar/${inv.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          navigate(`/faturalar/${inv.id}`)
                        }
                      }}
                    >
                      <td className="py-3 font-semibold text-navy-800">{inv.number}</td>
                      <td className="py-3 text-ink-700">{inv.supplierName || '—'}</td>
                      <td className="py-3">{formatMoney(inv.total, inv.currency)}</td>
                      <td className="py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
