import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/format'
import type { InvoiceStatus } from '../types'

const FINAL_QUEUE: InvoiceStatus[] = [
  'Tam Onaylandı',
  'Muhasebe Kontrolü Bekliyor',
  'E-LOGO Aktarım Bekliyor',
  'Entegrasyon Hatası',
]
const REVISION_QUEUE: InvoiceStatus[] = ['Revizyonda', 'Tedarikçi Düzeltmesi Bekleniyor']

export function AccountingReviewPage() {
  const app = useApp()
  const navigate = useNavigate()
  const finalRows = app.invoices.filter((i) => FINAL_QUEUE.includes(i.status))
  const revisionRows = app.invoices.filter((i) => REVISION_QUEUE.includes(i.status))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">Muhasebe son kontrol</h1>
        <p className="text-sm text-ink-500">
          Departman onayları tamamlanan kayıtlar ERP’ye gitmeden önce burada doğrulanır. Revizyondaki faturalar E-LOGO’ya aktarılmaz.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">Hatalı fatura / revizyon</h2>
        {revisionRows.length === 0 ? (
          <EmptyState title="Revizyon kuyruğu boş" description="Departmandan gelen revizyon talebi yok." />
        ) : (
          revisionRows.map((inv) => (
            <div
              key={inv.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer rounded-2xl border border-orange-200 bg-orange-50/40 p-5 shadow-sm transition hover:border-orange-300"
              onClick={() => navigate(`/faturalar/${inv.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/faturalar/${inv.id}`)
                }
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-navy-800">{inv.number}</div>
                  <div className="text-xs text-ink-500">{inv.supplierName} · {formatMoney(inv.total, inv.currency)}</div>
                  {inv.revisionReason && <p className="mt-2 text-sm text-orange-950">{inv.revisionReason}</p>}
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/faturalar/${inv.id}`)
                  }}
                >
                  Tedarikçi görüşmesi
                </Button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-ink-900">ERP aktarım öncesi kontrol</h2>
        {finalRows.length === 0 ? (
          <EmptyState title="Kuyruk boş" description="Tüm kalemleri onaylanmış fatura yok." />
        ) : (
          finalRows.map((inv) => (
            <div
              key={inv.id}
              role="link"
              tabIndex={0}
              className="cursor-pointer rounded-2xl border border-ink-100 bg-white p-5 shadow-sm transition hover:border-teal-200"
              onClick={() => navigate(`/faturalar/${inv.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/faturalar/${inv.id}`)
                }
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-navy-800">{inv.number}</div>
                  <div className="text-xs text-ink-500">{inv.supplierName} · {formatMoney(inv.total, inv.currency)}</div>
                </div>
                <StatusBadge status={inv.status} />
              </div>
              <table className="mt-3 w-full text-sm">
                <thead className="text-xs text-ink-500">
                  <tr>
                    <th className="py-1 text-left font-medium">Hesap</th>
                    <th className="py-1 text-left font-medium">Proje</th>
                    <th className="py-1 text-left font-medium">Masraf</th>
                    <th className="py-1 text-right font-medium">Tutar</th>
                  </tr>
                </thead>
                <tbody>
                  {inv.allocations.map((a) => (
                    <tr key={a.id} className="border-t border-ink-100">
                      <td className="py-1.5 font-mono text-xs">{a.accountCode}</td>
                      <td className="py-1.5">{a.projectCode}</td>
                      <td className="py-1.5">{a.expenseCode}</td>
                      <td className="py-1.5 text-right">{formatMoney(a.amount, inv.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3">
                <Button
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/faturalar/${inv.id}`)
                  }}
                >
                  Detay ve onay
                </Button>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  )
}
