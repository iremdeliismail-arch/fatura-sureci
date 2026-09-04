import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { LineBadge } from '../components/ui/StatusBadge'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { formatMoney } from '../lib/format'
import { pendingApprovals } from '../lib/mapping'

export function ApprovalsPage() {
  const app = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const rows = pendingApprovals(app.invoices, user.id)

  function openDetail(invoiceId: string) {
    navigate(`/faturalar/${invoiceId}`)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Onaylarım</h1>
        <p className="text-sm text-ink-500">Yalnızca size atanmış dağıtım satırları. Faturaya tıklayınca detay açılır; Jira linki girip onaylayabilir, reddedebilir veya revizyona gönderebilirsiniz.</p>
      </div>
      {rows.length === 0 ? (
        <EmptyState title="Bekleyen onay yok" description="Yeni görev oluştuğunda burada listelenir." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Fatura</th>
                <th className="px-4 py-3 font-medium">Kalem / proje</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">İşlem</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ invoice, line }) => (
                <tr
                  key={line.id}
                  tabIndex={0}
                  className="cursor-pointer border-t border-ink-100 hover:bg-navy-50/70 focus:bg-navy-50 focus:outline-none"
                  onClick={() => openDetail(invoice.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      openDetail(invoice.id)
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="font-semibold text-navy-800">{invoice.number}</div>
                    <div className="text-xs text-ink-500">{invoice.supplierName}{line.isDelegate ? ' · vekaleten' : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    {invoice.accountingItems.find((a) => a.id === line.accountingItemId)?.name}
                    <div className="text-xs text-ink-500">{line.project || 'Proje yok'}</div>
                  </td>
                  <td className="px-4 py-3 font-medium">{formatMoney(line.amount, invoice.currency)}</td>
                  <td className="px-4 py-3"><LineBadge status={line.status} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/faturalar/${invoice.id}#dagitim`)
                      }}
                    >
                      Onayla
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
