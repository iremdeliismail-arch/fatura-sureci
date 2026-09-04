import { useState } from 'react'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { DEPARTMENTS, getUser, USERS } from '../data/mock'
import { formatDate } from '../lib/format'

const statusLabel = {
  active: 'Aktif',
  scheduled: 'Planlandı',
  expired: 'Sona erdi',
  cancelled: 'İptal',
}

export function DelegationsPage() {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [fromUserId, setFromUserId] = useState(user?.id ?? '')
  const [toUserId, setToUserId] = useState('')
  const [department, setDepartment] = useState(user?.department && user.department !== 'Muhasebe' && user.department !== 'BT' ? user.department : 'Satış')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [transferPending, setTransferPending] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})

  if (!user) return null
  const canCreateEmergency = user.role === 'admin'
  const managers = USERS.filter((u) => u.role === 'manager')

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Vekalet</h1>
          <p className="text-sm text-ink-500">Yöneticiler LDAP’tan gelir. Vekalet bu ekrandan tanımlanır; aktif dönemde yeni görevler vekile düşer.</p>
        </div>
        <Button onClick={() => setOpen(true)}>Vekalet tanımla</Button>
      </div>
      {app.delegations.length === 0 ? (
        <EmptyState title="Vekalet yok" description="Planlı izin veya acil vekalet ekleyin." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-paper text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Asıl yönetici</th>
                <th className="px-4 py-3 font-medium">Vekil</th>
                <th className="px-4 py-3 font-medium">Departman</th>
                <th className="px-4 py-3 font-medium">Tarih</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {app.delegations.map((d) => (
                <tr key={d.id} className="border-t border-ink-100">
                  <td className="px-4 py-3">{getUser(d.fromUserId)?.name}</td>
                  <td className="px-4 py-3">{getUser(d.toUserId)?.name}</td>
                  <td className="px-4 py-3">{d.department}</td>
                  <td className="px-4 py-3">{formatDate(d.startDate)} – {formatDate(d.endDate)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${d.status === 'active' ? 'bg-teal-50 text-teal-800' : d.status === 'scheduled' ? 'bg-sky-50 text-sky-800' : 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(d.status === 'active' || d.status === 'scheduled') && (user.role === 'admin' || user.id === d.fromUserId) && (
                      <Button variant="ghost" onClick={() => setCancelId(d.id)}>İptal</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} title={canCreateEmergency ? 'Vekalet / acil atama' : 'Vekalet tanımla'} onClose={() => setOpen(false)} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={() => {
            const next: Record<string, string> = {}
            if (!fromUserId) next.fromUserId = 'Asıl yönetici gerekli'
            if (!toUserId) next.toUserId = 'Vekil gerekli'
            if (!startDate || !endDate) next.dates = 'Başlangıç ve bitiş tarihi zorunlu'
            if (startDate && endDate && endDate < startDate) next.dates = 'Bitiş, başlangıçtan önce olamaz'
            setErrors(next)
            if (Object.keys(next).length) return
            app.addDelegation({ fromUserId, toUserId, department, startDate, endDate, reason, transferPending, createdBy: user.id }, user.id)
            push('Vekalet kaydedildi')
            setOpen(false)
          }}>Kaydet</Button>
        </>
      }>
        <div className="space-y-3">
          {(canCreateEmergency || user.role === 'accounting') ? (
            <Field label="Asıl yönetici" required>
              <Select value={fromUserId} onChange={(e) => setFromUserId(e.target.value)}>
                <option value="">Seçin</option>
                {managers.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.department}</option>)}
              </Select>
            </Field>
          ) : (
            <p className="text-sm text-ink-500">Asıl yetkili: {user.name}</p>
          )}
          <Field label="Vekil" required error={errors.toUserId}>
            <Select value={toUserId} onChange={(e) => setToUserId(e.target.value)}>
              <option value="">Seçin</option>
              {managers.filter((m) => m.id !== fromUserId).map((m) => <option key={m.id} value={m.id}>{m.name} — {m.title}</option>)}
            </Select>
          </Field>
          <Field label="Departman">
            <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
              {DEPARTMENTS.filter((d) => d !== 'Muhasebe').map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Başlangıç" required error={errors.dates}><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
            <Field label="Bitiş" required><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
          </div>
          <Field label="Açıklama"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Yıllık izin, rapor…" /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={transferPending} onChange={(e) => setTransferPending(e.target.checked)} />
            Bekleyen görevleri de vekile aktar
          </label>
        </div>
      </Modal>

      <Modal open={Boolean(cancelId)} title="Vekaleti iptal et" onClose={() => setCancelId(null)} footer={
        <>
          <Button variant="outline" onClick={() => setCancelId(null)}>Vazgeç</Button>
          <Button variant="danger" onClick={() => { if (cancelId) { app.cancelDelegation(cancelId, user.id); push('Vekalet iptal edildi'); setCancelId(null) } }}>İptal et</Button>
        </>
      }>
        <p className="text-sm">İptal sonrası yeni görevler tekrar LDAP yöneticisine düşer.</p>
      </Modal>
    </div>
  )
}
