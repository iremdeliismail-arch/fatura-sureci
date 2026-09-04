import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { getUser } from '../data/mock'
import { formatDateTime, matchesQuery } from '../lib/format'
import { Input, Select } from '../components/ui/Field'

export function AuditPage() {
  const app = useApp()
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const actions = useMemo(() => Array.from(new Set(app.audit.map((a) => a.action))), [app.audit])
  const rows = app.audit.filter((a) => {
    if (action && a.action !== action) return false
    if (q && !matchesQuery(`${a.detail} ${a.entity} ${getUser(a.userId)?.name ?? ''}`, q)) return false
    return true
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Denetim kaydı</h1>
        <p className="text-sm text-ink-500">Onay, red, vekalet ve mapping işlemleri izlenir. Vekaleten işlemler işaretlidir.</p>
      </div>
      <div className="grid gap-3 rounded-2xl border border-ink-100 bg-white p-4 md:grid-cols-2">
        <Input placeholder="Ara…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Select value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Tüm işlemler</option>
          {actions.map((a) => <option key={a}>{a}</option>)}
        </Select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs uppercase text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Zaman</th>
              <th className="px-4 py-3 font-medium">Kullanıcı</th>
              <th className="px-4 py-3 font-medium">İşlem</th>
              <th className="px-4 py-3 font-medium">Detay</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-t border-ink-100 align-top">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-ink-500">{formatDateTime(a.at)}</td>
                <td className="px-4 py-3">{getUser(a.userId)?.name}</td>
                <td className="px-4 py-3">
                  {a.action}
                  {a.isDelegate && <div className="text-[11px] font-semibold text-violet-700">Vekaleten · asıl {getUser(a.principalId ?? '')?.name}</div>}
                </td>
                <td className="px-4 py-3 text-ink-700">{a.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
