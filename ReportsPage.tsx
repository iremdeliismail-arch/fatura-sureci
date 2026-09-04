import { useApp } from '../context/AppContext'
import { formatMoney } from '../lib/format'
import { STATUS_META, STATUS_ORDER } from '../lib/status'

export function ReportsPage() {
  const app = useApp()
  const byStatus = app.invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1
    return acc
  }, {})
  const byDept = app.invoices.flatMap((i) => i.allocations).reduce<Record<string, { n: number; amount: number }>>((acc, line) => {
    acc[line.department] = acc[line.department] ?? { n: 0, amount: 0 }
    acc[line.department].n += 1
    acc[line.department].amount += line.amount
    return acc
  }, {})
  const pendingAmount = app.invoices
    .filter((i) => !['Tamamlandı'].includes(i.status))
    .reduce((s, i) => s + i.total, 0)
  const doneAmount = app.invoices.filter((i) => i.status === 'Tamamlandı').reduce((s, i) => s + i.total, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">Raporlar</h1>
        <p className="text-sm text-ink-500">Süreç hacmi ve departman yükü — prototip özeti</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="text-xs text-ink-500">Açık süreç tutarı</div>
          <div className="mt-1 text-2xl font-bold">{formatMoney(pendingAmount)}</div>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <div className="text-xs text-ink-500">E-LOGO’ya aktarılan</div>
          <div className="mt-1 text-2xl font-bold">{formatMoney(doneAmount)}</div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Duruma göre</h2>
          <ul className="space-y-2">
            {STATUS_ORDER.filter((status) => byStatus[status]).map((status) => (
              <li key={status} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_META[status].className}`}>
                    {STATUS_META[status].label}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-500">{STATUS_META[status].description}</span>
                </span>
                <span className="font-semibold">{byStatus[status]}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Departman dağıtım yükü</h2>
          <ul className="space-y-2">
            {Object.entries(byDept).map(([dept, v]) => (
              <li key={dept} className="flex items-center justify-between text-sm">
                <span>{dept} <span className="text-ink-500">({v.n} satır)</span></span>
                <span className="font-semibold">{formatMoney(v.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
