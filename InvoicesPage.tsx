import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { formatDate, formatMoney, isOverdue, matchesQuery } from '../lib/format'
import { visibleInvoicesForUser } from '../lib/mapping'
import { StatusBadge } from '../components/ui/StatusBadge'
import { EmptyState } from '../components/ui/EmptyState'
import { Input, Select } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { STATUS_META, STATUS_ORDER } from '../lib/status'
import type { InvoiceStatus } from '../types'

export function InvoicesPage() {
  const app = useApp()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const status = (params.get('status') ?? '') as InvoiceStatus | ''
  const overdueOnly = params.get('overdue') === '1'
  const source = params.get('source') ?? ''
  const [sort, setSort] = useState<'date-desc' | 'amount-desc' | 'number'>('date-desc')
  const [page, setPage] = useState(1)
  const pageSize = 8

  const list = useMemo(() => {
    let rows = visibleInvoicesForUser(app.invoices, user?.id ?? '', user?.role ?? '')
    if (q) {
      rows = rows.filter((i) => matchesQuery(`${i.number} ${i.supplierName} ${i.taxNumber}`, q))
    }
    if (status) rows = rows.filter((i) => i.status === status)
    if (source) rows = rows.filter((i) => i.source === source)
    if (overdueOnly) rows = rows.filter((i) => isOverdue(i.dueDate, i.status))
    rows = [...rows].sort((a, b) => {
      if (sort === 'amount-desc') return b.total - a.total
      if (sort === 'number') return b.number.localeCompare(a.number)
      return b.date.localeCompare(a.date)
    })
    return rows
  }, [app.invoices, user, q, status, source, overdueOnly, sort])

  const pages = Math.max(1, Math.ceil(list.length / pageSize))
  const slice = list.slice((page - 1) * pageSize, page * pageSize)

  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink-900">Faturalar</h1>
          <p className="text-sm text-ink-500">{list.length} kayıt</p>
        </div>
        {user?.role === 'accounting' && (
          <Link to="/faturalar/yeni">
            <Button>Yeni fatura</Button>
          </Link>
        )}
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-100 bg-white p-4 md:grid-cols-5">
        <Input placeholder="Fatura no, tedarikçi, VKN…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1) }} />
        <Select value={status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Tüm durumlar</option>
          {STATUS_ORDER.map((s) => (
            <option key={s} value={s} title={STATUS_META[s].description}>
              {STATUS_META[s].label}
            </option>
          ))}
        </Select>
        <Select value={source} onChange={(e) => setFilter('source', e.target.value)}>
          <option value="">Tüm kaynaklar</option>
          <option value="e-logo">E-LOGO</option>
          <option value="pdf">PDF</option>
          <option value="image">Görsel</option>
          <option value="manual">Manuel form</option>
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="date-desc">Tarih (yeni)</option>
          <option value="amount-desc">Tutar (yüksek)</option>
          <option value="number">Fatura no</option>
        </Select>
        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input type="checkbox" checked={overdueOnly} onChange={(e) => setFilter('overdue', e.target.checked ? '1' : '')} />
          Yalnızca gecikenler
        </label>
      </div>

      {slice.length === 0 ? (
        <EmptyState title="Kayıt bulunamadı" description="Filtreleri temizleyerek tekrar deneyin." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Fatura</th>
                <th className="px-4 py-3 font-medium">Tedarikçi</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Tutar</th>
                <th className="px-4 py-3 font-medium">Kaynak</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3 font-medium"><span className="sr-only">Detay</span></th>
              </tr>
            </thead>
            <tbody>
              {slice.map((inv) => (
                <tr
                  key={inv.id}
                  tabIndex={0}
                  className="cursor-pointer border-t border-ink-100 hover:bg-navy-50/70 focus:bg-navy-50 focus:outline-none"
                  onClick={() => navigate(`/faturalar/${inv.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      navigate(`/faturalar/${inv.id}`)
                    }
                  }}
                >
                  <td className="px-4 py-3">
                    <span className="font-semibold text-navy-800">{inv.number}</span>
                    {isOverdue(inv.dueDate, inv.status) && inv.status !== 'Tamamlandı' && (
                      <span className="ml-2 text-[11px] font-semibold text-orange-700">Gecikmiş</span>
                    )}
                  </td>
                  <td className="px-4 py-3">{inv.supplierName || '—'}</td>
                  <td className="px-4 py-3">{inv.date ? formatDate(inv.date) : '—'}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(inv.total, inv.currency)}</td>
                  <td className="px-4 py-3 capitalize text-ink-500">{inv.source}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={inv.status} showDescription />
                    </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700">
                      Detay <ChevronRight size={14} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-ink-100 px-4 py-3 text-xs text-ink-500">
            <span>
              Sayfa {page} / {pages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                Önceki
              </Button>
              <Button variant="outline" disabled={page === pages} onClick={() => setPage((p) => p + 1)}>
                Sonraki
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
