import { useEffect, useMemo, useState, Fragment } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, FileWarning, Plus, SplitSquareHorizontal } from 'lucide-react'
import { ApprovalTimeline } from '../components/invoice/ApprovalTimeline'
import { ExpenseCodeSelect, ProjectCodeSelect } from '../components/invoice/CodeSelects'
import { ProcessStepper } from '../components/invoice/ProcessStepper'
import { Button } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { LineBadge, StatusBadge } from '../components/ui/StatusBadge'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { DEPARTMENTS, getUser } from '../data/mock'
import { expenseCodesFor, projectCodesFor } from '../data/codes'
import { formatDate, formatDateTime, formatMoney, round2, uid } from '../lib/format'
import { cariKodFor, dash, itemTypeLabel, lineCodes, resolveItemType } from '../lib/display'
import type { AllocationLine, Invoice, Template, User } from '../types'

const REVISION_REASONS = [
  'Tutar veya vergi tutarsız',
  'Kalem / hizmet fatura ile uyuşmuyor',
  'Yanlış cari veya dönem',
  'Mükerrer fatura',
  'Eksik veya hatalı belge',
  'Diğer',
]

export function InvoiceDetailPage() {
  const { id } = useParams()
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()
  const invoice = app.getInvoice(id ?? '')
  const [splitItemId, setSplitItemId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'include' | 'accounting' | 'transfer' | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [revisionId, setRevisionId] = useState<string | null>(null)
  const [revisionReason, setRevisionReason] = useState('')
  const [revisionPreset, setRevisionPreset] = useState('')
  const location = useLocation()

  useEffect(() => {
    const main = document.querySelector('main')
    if (location.hash === '#dagitim') {
      document.getElementById('dagitim')?.scrollIntoView({ block: 'start' })
    } else {
      main?.scrollTo({ top: 0 })
    }
  }, [id, location.hash])

  if (!invoice || !user) {
    return (
      <EmptyState
        title="Fatura bulunamadı"
        description="Kayıt silinmiş veya yetkiniz yok olabilir."
        action={
          <Link to="/faturalar">
            <Button>Fatura listesine dön</Button>
          </Link>
        }
      />
    )
  }

  const canAccount = user.role === 'accounting' || user.role === 'admin'
  const view: Invoice =
    user.role === 'manager'
      ? {
          ...invoice,
          allocations: invoice.allocations.filter(
            (a) => a.assigneeId === user.id || a.department === user.department,
          ),
          accountingItems: invoice.accountingItems.filter((item) =>
            invoice.allocations.some(
              (a) =>
                a.accountingItemId === item.id &&
                (a.assigneeId === user.id || a.department === user.department),
            ),
          ),
        }
      : invoice

  function runInclude() {
    const res = app.applyMappingAndInclude(invoice!.id, user!.id)
    push(res.message, res.ok ? 'success' : 'error')
    setConfirm(null)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button type="button" onClick={() => navigate('/faturalar')} className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-900">
            <ArrowLeft size={14} /> Geri
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-ink-900">{invoice.number}</h1>
            <StatusBadge status={invoice.status} showDescription />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            Cari {dash(cariKodFor(invoice, app.supplierMappings))} · {invoice.supplierName || 'Cari ismi bekleniyor'} ·{' '}
            {invoice.date ? formatDate(invoice.date) : 'Tarih yok'} · {formatMoney(invoice.total, invoice.currency)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAccount && ['Manuel Fatura Kontrol', 'Mapping Bekliyor'].includes(invoice.status) && (
            <>
              <Button variant="outline" onClick={() => setMapOpen(true)}>Mapping oluştur</Button>
              <Button onClick={() => setConfirm('include')}>Sürece dahil et</Button>
            </>
          )}
          {canAccount && invoice.status === 'Veri Doğrulama Bekliyor' && (
            <Link to={`/faturalar/${invoice.id}/dogrula`}>
              <Button>Veriyi doğrula</Button>
            </Link>
          )}
          {canAccount && ['Tam Onaylandı', 'Muhasebe Kontrolü Bekliyor'].includes(invoice.status) && (
            <Button onClick={() => setConfirm('accounting')}>Muhasebe onayı ver</Button>
          )}
          {canAccount && ['E-LOGO Aktarım Bekliyor', 'Entegrasyon Hatası'].includes(invoice.status) && (
            <Button onClick={() => setConfirm('transfer')}>E-LOGO'ya aktar</Button>
          )}
        </div>
      </div>

      <ProcessStepper status={invoice.status} />

      {invoice.mappingIssues.length > 0 && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <FileWarning className="mt-0.5 shrink-0" size={18} />
          <div>
            <div className="font-semibold">Eksik mapping</div>
            <ul className="mt-1 list-disc pl-4">
              {invoice.mappingIssues.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {invoice.transferError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{invoice.transferError}</div>
      )}

      {invoice.status === 'Satın Alma Referansı Bekliyor' && (
        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 px-4 py-3 text-sm text-fuchsia-900">
          Onay için her dağıtım satırında <strong>Jira Satın Alma Talebi</strong> linki (URL) zorunludur.
        </div>
      )}

      {['Revizyonda', 'Tedarikçi Düzeltmesi Bekleniyor'].includes(invoice.status) && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <div className="font-semibold">Hatalı / revizyon faturası — E-LOGO aktarımı kapalı</div>
          {invoice.revisionReason && <p className="mt-1">Gerekçe: {invoice.revisionReason}</p>}
          {invoice.accountingNote && <p className="mt-1 text-orange-800">Muhasebe notu: {invoice.accountingNote}</p>}
        </div>
      )}

      {invoice.status === 'Yeniden Onay Bekliyor' && (
        <div className="rounded-2xl border border-lime-200 bg-lime-50 px-4 py-3 text-sm text-lime-900">
          Düzeltilmiş fatura departman onayına geri gönderildi.
          {invoice.accountingNote ? ` ${invoice.accountingNote}` : ''}
        </div>
      )}

      {canAccount && ['Revizyonda', 'Tedarikçi Düzeltmesi Bekleniyor'].includes(invoice.status) && (
        <AccountingRevisionPanel invoice={invoice} />
      )}

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(300px,400px)]">
        <aside className="xl:col-start-2 xl:row-start-1 xl:sticky xl:top-4">
          <h2 className="mb-3 text-sm font-semibold text-ink-900">Fatura belgesi</h2>
          <DocumentPreview invoice={view} />
        </aside>
        <div className="min-w-0 space-y-5 xl:col-start-1 xl:row-start-1">
          <Summary invoice={view} />
          <Items invoice={view} />
          <section id="dagitim">
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Dağıtım</h2>
            <Allocations
              invoice={view}
              canEdit={canAccount && !['Tamamlandı', 'E-LOGO Aktarım Bekliyor'].includes(invoice.status)}
              onSplit={setSplitItemId}
              onReject={(lineId) => {
                setRejectId(lineId)
                setRejectReason('')
              }}
              onRevision={(lineId) => {
                setRevisionId(lineId)
                setRevisionReason('')
                setRevisionPreset('')
              }}
              onResubmit={(lineId) => {
                const res = app.resubmitRejected(invoice.id, lineId, user.id)
                push(res.message, res.ok ? 'success' : 'error')
              }}
            />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Onaylar</h2>
            <ApprovalTimeline invoice={view} />
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-900">Geçmiş</h2>
            <History invoiceId={invoice.id} />
          </section>
        </div>
      </div>

      {splitItemId && (
        <SplitModal
          invoice={invoice}
          itemId={splitItemId}
          onClose={() => setSplitItemId(null)}
        />
      )}

      <Modal
        open={Boolean(rejectId)}
        title="Red nedeni"
        onClose={() => setRejectId(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejectId(null)}>Vazgeç</Button>
            <Button
              variant="danger"
              disabled={!rejectReason.trim()}
              onClick={() => {
                if (!rejectId) return
                const res = app.rejectLine(invoice.id, rejectId, rejectReason, user.id)
                push(res.message, res.ok ? 'success' : 'error')
                setRejectId(null)
              }}
            >
              Reddet
            </Button>
          </>
        }
      >
        <Field label="Açıklama" required hint="Zorunlu. Muhasebe satırı buna göre düzeltebilir.">
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Neden reddediyorsunuz?" />
        </Field>
      </Modal>

      <Modal
        open={Boolean(revisionId)}
        title="Revizyona gönder"
        onClose={() => setRevisionId(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setRevisionId(null)}>Vazgeç</Button>
            <Button
              disabled={!revisionReason.trim()}
              onClick={() => {
                if (!revisionId) return
                const res = app.sendToRevision(invoice.id, revisionId, revisionReason, user.id)
                push(res.message, res.ok ? 'success' : 'error')
                setRevisionId(null)
              }}
            >
              Revizyona gönder
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-ink-600">
            Satır muhasebeye döner. Tedarikçi ile görüşülür; düzeltme gerekirse belge güncellenir ve departmana yeniden onay için gelir. Bu süreçte E-LOGO aktarımı yapılmaz.
          </p>
          <Field label="Gerekçe" required>
            <Select
              value={revisionPreset}
              onChange={(e) => {
                setRevisionPreset(e.target.value)
                if (e.target.value && e.target.value !== 'Diğer') setRevisionReason(e.target.value)
                if (e.target.value === 'Diğer') setRevisionReason('')
              }}
            >
              <option value="">Seçin</option>
              {REVISION_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Açıklama" required hint="Muhasebe bu metne göre tedarikçi ile görüşür.">
            <Textarea value={revisionReason} onChange={(e) => setRevisionReason(e.target.value)} placeholder="Revizyon gerekçesini yazın" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={confirm === 'include'}
        title="Sürece dahil et"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>Vazgeç</Button>
            <Button onClick={runInclude}>Onaya gönder</Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          Mapping tamamsa kaynak kalemler muhasebe kalemlerine dönüştürülür, her kalem için otomatik %100 dağıtım satırı
          oluşturulur ve ilgili yöneticilere (aktif vekalet varsa vekile) atanır.
        </p>
      </Modal>

      <Modal
        open={confirm === 'accounting'}
        title="Muhasebe son kontrol"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>Vazgeç</Button>
            <Button
              onClick={() => {
                const res = app.accountingApprove(invoice.id, user.id)
                push(res.message, res.ok ? 'success' : 'error')
                setConfirm(null)
              }}
            >
              Onayla
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">
          Hesap, proje ve masraf kodları ile dağıtım toplamları kontrol edildi. Onay sonrası kayıt E-LOGO aktarımına hazırlanır.
        </p>
      </Modal>

      <Modal
        open={confirm === 'transfer'}
        title="E-LOGO aktarımı"
        onClose={() => setConfirm(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(null)}>Vazgeç</Button>
            <Button
              onClick={() => {
                const res = app.transferElogo(invoice.id, user.id)
                push(res.message, res.ok ? 'success' : 'error')
                setConfirm(null)
              }}
            >
              Aktar
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-700">Onaylanan muhasebeleştirme satırları E-LOGO'ya gönderilecek.</p>
      </Modal>

      <QuickMappingModal open={mapOpen} invoice={invoice} onClose={() => setMapOpen(false)} />
    </div>
  )
}

function approvalCodes(line: AllocationLine, templates: Template[]) {
  const suggested = lineCodes(line, templates)
  return {
    projectCode: line.projectCode || suggested.projectCode || projectCodesFor(line.department)[0] || '',
    expenseCode: line.expenseCode || suggested.expenseCode || expenseCodesFor(line.department)[0] || '',
  }
}

function canEditLineCodes(line: AllocationLine, user: User) {
  if (line.status !== 'pending') return false
  return line.assigneeId === user.id || user.role === 'accounting' || user.role === 'admin'
}

function canApproveLine(line: AllocationLine, user: User) {
  return line.status === 'pending' && line.assigneeId === user.id
}

function LineApprovalActions({
  invoiceId,
  line,
  onReject,
  onRevision,
}: {
  invoiceId: string
  line: AllocationLine
  onReject: () => void
  onRevision: () => void
}) {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [jira, setJira] = useState(line.jiraLink ?? '')
  useEffect(() => {
    setJira(line.jiraLink ?? '')
  }, [line.jiraLink])

  if (!user) return null

  return (
    <div className="space-y-2">
      <Field label="Jira Satın Alma Talebi" required hint="Onay için http(s) URL zorunludur. Hesap kodu mapping’den gelir.">
        <Input
          type="url"
          value={jira}
          placeholder="https://jira.sirket.com/browse/SAT-1234"
          onChange={(e) => setJira(e.target.value)}
          onBlur={() => {
            const res = app.saveJiraLink(invoiceId, line.id, jira, user.id)
            if (res.message) push(res.message, res.ok ? 'success' : 'error')
          }}
        />
      </Field>
      <div className="flex flex-wrap justify-end gap-1">
        <Button
          onClick={() => {
            const res = app.approveLine(invoiceId, line.id, user.id, {
              ...approvalCodes(line, app.templates),
              jiraLink: jira,
            })
            push(res.message, res.ok ? 'success' : 'error')
          }}
        >
          Onayla
        </Button>
        <Button variant="outline" onClick={onRevision}>Revizyona Gönder</Button>
        <Button variant="danger" onClick={onReject}>Reddet</Button>
      </div>
    </div>
  )
}

function AccountingRevisionPanel({ invoice }: { invoice: Invoice }) {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [note, setNote] = useState(invoice.accountingNote ?? '')
  useEffect(() => {
    setNote(invoice.accountingNote ?? '')
  }, [invoice.accountingNote])
  if (!user) return null

  return (
    <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-ink-900">Muhasebe — hatalı fatura / revizyon</h2>
      <p className="mt-1 text-sm text-ink-500">
        Tedarikçi ile görüşün. Düzeltme gerekirse belgeyi güncelleyip departmana geri gönderin; gerekmezse not ekleyerek onaya iade edin. Revizyon sürecinde E-LOGO aktarımı yapılmaz.
      </p>
      <div className="mt-4 space-y-3">
        <Field label="Muhasebe notu">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tedarikçi görüşmesi, iade / iptal / düzeltme kararı…" />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const res = app.saveAccountingNote(invoice.id, note, user.id)
              push(res.message, res.ok ? 'success' : 'error')
            }}
          >
            Notu kaydet
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const res = app.markWaitingSupplier(invoice.id, note, user.id)
              push(res.message, res.ok ? 'success' : 'error')
            }}
          >
            Tedarikçi düzeltmesi bekleniyor
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              const res = app.uploadCorrectedDocument(invoice.id, user.id)
              push(res.message, res.ok ? 'success' : 'error')
            }}
          >
            Düzeltilmiş belgeyi yükle
          </Button>
          <Button
            onClick={() => {
              const res = app.resubmitAfterRevision(invoice.id, note, user.id)
              push(res.message, res.ok ? 'success' : 'error')
            }}
          >
            Departmana geri gönder
          </Button>
        </div>
      </div>
    </div>
  )
}

function CodePairCells({
  department,
  projectCode,
  expenseCode,
  editable,
  suggested,
  onSave,
}: {
  department: string
  projectCode: string
  expenseCode: string
  editable: boolean
  suggested?: boolean
  onSave: (codes: { projectCode: string; expenseCode: string }) => void
}) {
  const [project, setProject] = useState(projectCode)
  const [expense, setExpense] = useState(expenseCode)
  useEffect(() => {
    setProject(projectCode)
    setExpense(expenseCode)
  }, [projectCode, expenseCode])

  function commit(next = { projectCode: project, expenseCode: expense }) {
    if (next.projectCode === projectCode && next.expenseCode === expenseCode) return
    onSave(next)
  }

  if (!editable) {
    return (
      <>
        <td className="py-2.5 pr-3 font-mono text-xs">
          {dash(projectCode)}
          {suggested && projectCode && <div className="font-sans text-[10px] text-ink-500">önerilen</div>}
        </td>
        <td className="py-2.5 pr-3 font-mono text-xs">
          {dash(expenseCode)}
          {suggested && expenseCode && <div className="font-sans text-[10px] text-ink-500">önerilen</div>}
        </td>
      </>
    )
  }

  return (
    <>
      <td className="py-2 pr-3">
        <ProjectCodeSelect
          className="text-xs"
          department={department}
          value={project}
          onChange={(projectCode) => {
            setProject(projectCode)
            commit({ projectCode, expenseCode: expense })
          }}
        />
      </td>
      <td className="py-2 pr-3">
        <ExpenseCodeSelect
          className="text-xs"
          department={department}
          value={expense}
          onChange={(expenseCode) => {
            setExpense(expenseCode)
            commit({ projectCode: project, expenseCode })
          }}
        />
      </td>
    </>
  )
}

function Summary({ invoice }: { invoice: Invoice }) {
  const app = useApp()
  const cariKod = dash(cariKodFor(invoice, app.supplierMappings))
  const rows = [
    ['Cari kod', cariKod],
    ['Cari ismi', invoice.supplierName || '—'],
    ['VKN', invoice.taxNumber || '—'],
    ['Fatura no', invoice.number],
    ['Fatura tarihi', invoice.date ? formatDate(invoice.date) : '—'],
    ['Son işlem tarihi', invoice.dueDate ? formatDate(invoice.dueDate) : '—'],
    ['Para birimi', invoice.currency],
    ['Kaynak', invoice.source.toUpperCase()],
    ['İşleme tipi', invoice.processingType ?? 'Henüz belirlenmedi'],
    ['Belge', invoice.document.name || 'Yok'],
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Cari ve fatura bilgileri</h3>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-ink-500">{k}</dt>
                <dd className="font-medium text-ink-900">{k === 'Cari kod' || k === 'VKN' ? <span className="font-mono">{v}</span> : v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">Tutar özeti</h3>
          <p className="text-2xl font-bold">{formatMoney(invoice.total, invoice.currency)}</p>
          <p className="mt-2 text-xs text-ink-500">
            {invoice.sourceItems.length} hizmet/ürün kalemi · {invoice.allocations.length} muhasebe satırı
          </p>
        </div>
      </div>
      <LineDetailTable invoice={invoice} />
    </div>
  )
}

function LineDetailTable({ invoice }: { invoice: Invoice }) {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const rows =
    invoice.allocations.length > 0
      ? invoice.allocations.map((line) => {
          const acc = invoice.accountingItems.find((a) => a.id === line.accountingItemId)
          const sources = invoice.sourceItems.filter((s) => acc?.sourceItemIds.includes(s.id))
          const primary = sources[0]
          const codes = lineCodes(line, app.templates)
          return {
            id: line.id,
            line,
            itemType: primary ? resolveItemType(primary) : ('hizmet' as const),
            itemName: sources.length ? sources.map((s) => s.description).join(', ') : (acc?.name ?? '—'),
            amount: line.amount,
            accountCode: codes.accountCode,
            projectCode: codes.projectCode,
            expenseCode: codes.expenseCode,
            suggested: codes.suggested,
            department: line.department,
            status: line.status,
          }
        })
      : invoice.sourceItems.map((s) => ({
          id: s.id,
          line: undefined as AllocationLine | undefined,
          itemType: resolveItemType(s),
          itemName: s.description,
          amount: s.amount,
          accountCode: '',
          projectCode: '',
          expenseCode: '',
          suggested: false,
          department: '',
          status: undefined as AllocationLine['status'] | undefined,
        }))

  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold">Kalem ve muhasebeleştirme detayı</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-500">Bu faturada henüz kalem yok.</p>
      ) : (
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase text-ink-500">
            <tr>
              <th className="pb-2 pr-3 font-medium">Tip</th>
              <th className="pb-2 pr-3 font-medium">Hizmet / ürün kalemi</th>
              <th className="pb-2 pr-3 font-medium">Hesap no</th>
              <th className="pb-2 pr-3 font-medium">Proje kodu</th>
              <th className="pb-2 pr-3 font-medium">Masraf kodu</th>
              <th className="pb-2 pr-3 text-right font-medium">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-ink-100">
                <td className="py-2.5 pr-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${row.itemType === 'ürün' ? 'bg-navy-50 text-navy-800' : 'bg-teal-50 text-teal-800'}`}>
                    {itemTypeLabel(row.itemType)}
                  </span>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="font-medium text-ink-900">{row.itemName}</div>
                  {row.department && <div className="text-xs text-ink-500">{row.department}</div>}
                </td>
                <td className="py-2.5 pr-3 font-mono text-xs">
                  {dash(row.accountCode)}
                  {row.suggested && row.accountCode && <div className="font-sans text-[10px] text-ink-500">önerilen</div>}
                </td>
                <CodePairCells
                  department={row.department}
                  projectCode={row.projectCode}
                  expenseCode={row.expenseCode}
                  suggested={row.suggested}
                  editable={Boolean(user && row.line && canEditLineCodes(row.line, user))}
                  onSave={(codes) => {
                    if (!user || !row.line) return
                    const res = app.updateLineCodes(invoice.id, row.line.id, codes, user.id)
                    if (res.message) push(res.message, res.ok ? 'success' : 'error')
                  }}
                />
                <td className="py-2.5 text-right font-medium">{formatMoney(row.amount, invoice.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function Items({ invoice }: { invoice: Invoice }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Hizmet / ürün kalemleri</h3>
        {invoice.sourceItems.length === 0 ? (
          <p className="text-sm text-ink-500">Kaynak kalem henüz girilmedi.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-ink-500">
              <tr>
                <th className="pb-2 text-left font-medium">Tip</th>
                <th className="pb-2 text-left font-medium">Kalem</th>
                <th className="pb-2 text-right font-medium">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {invoice.sourceItems.map((s) => (
                <tr key={s.id} className="border-t border-ink-100">
                  <td className="py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${resolveItemType(s) === 'ürün' ? 'bg-navy-50 text-navy-800' : 'bg-teal-50 text-teal-800'}`}>
                      {itemTypeLabel(resolveItemType(s))}
                    </span>
                  </td>
                  <td className="py-2">{s.description}</td>
                  <td className="py-2 text-right font-medium">{formatMoney(s.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold">Muhasebe kalemleri</h3>
        {invoice.accountingItems.length === 0 ? (
          <p className="text-sm text-ink-500">Dönüşüm henüz yapılmadı. Mapping sonrası otomatik gruplanır.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {invoice.accountingItems.map((a) => (
                <tr key={a.id} className="border-t border-ink-100">
                  <td className="py-2">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-ink-500">{a.department ?? 'Departman yok'} · {a.sourceItemIds.length} kaynak satır</div>
                  </td>
                  <td className="py-2 text-right font-medium">{formatMoney(a.amount, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function Allocations({
  invoice,
  canEdit,
  onSplit,
  onReject,
  onRevision,
  onResubmit,
}: {
  invoice: Invoice
  canEdit: boolean
  onSplit: (id: string) => void
  onReject: (lineId: string) => void
  onRevision: (lineId: string) => void
  onResubmit: (lineId: string) => void
}) {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  return (
    <div className="space-y-4">
      {invoice.accountingItems.map((item) => {
        const lines = invoice.allocations.filter((a) => a.accountingItemId === item.id)
        const allocated = round2(lines.reduce((s, l) => s + l.amount, 0))
        const remaining = round2(item.amount - allocated)
        return (
          <div key={item.id} className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{item.name}</h3>
                <p className="text-xs text-ink-500">
                  {formatMoney(item.amount, invoice.currency)} · kalan {formatMoney(remaining, invoice.currency)}
                </p>
              </div>
              {canEdit && (
                <Button variant="outline" onClick={() => onSplit(item.id)}>
                  <SplitSquareHorizontal size={16} /> Bölüştür
                </Button>
              )}
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ink-100">
              <div
                className={`h-full ${remaining === 0 ? 'bg-teal-600' : remaining < 0 ? 'bg-red-500' : 'bg-amber-500'}`}
                style={{ width: `${Math.min(100, (allocated / item.amount) * 100)}%` }}
              />
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-ink-500">
                <tr>
                  <th className="pb-2 text-left font-medium">Hizmet / ürün</th>
                  <th className="pb-2 text-left font-medium">Hesap no</th>
                  <th className="pb-2 text-left font-medium">Proje kodu</th>
                  <th className="pb-2 text-left font-medium">Masraf kodu</th>
                  <th className="pb-2 text-right font-medium">Tutar</th>
                  <th className="pb-2 text-left font-medium">Durum</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => {
                  const sources = invoice.sourceItems.filter((s) => {
                    const acc = invoice.accountingItems.find((a) => a.id === l.accountingItemId)
                    return acc?.sourceItemIds.includes(s.id)
                  })
                  const codes = lineCodes(l, app.templates)
                  return (
                    <Fragment key={l.id}>
                      <tr key={l.id} className="border-t border-ink-100">
                        <td className="py-2">
                          <div className="font-medium">{sources.length ? sources.map((s) => s.description).join(', ') : item.name}</div>
                          <div className="text-xs text-ink-500">{l.department} · {getUser(l.assigneeId)?.name}{l.isDelegate ? ' (vekil)' : ''}</div>
                          {l.jiraLink && (
                            <a href={l.jiraLink} className="mt-1 block truncate text-[11px] font-medium text-teal-700" target="_blank" rel="noreferrer">
                              {l.jiraLink}
                            </a>
                          )}
                          {l.revisionReason && (
                            <div className="mt-1 text-[11px] text-orange-800">Revizyon: {l.revisionReason}</div>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs">{dash(codes.accountCode)}</td>
                        <CodePairCells
                          department={l.department}
                          projectCode={codes.projectCode}
                          expenseCode={codes.expenseCode}
                          suggested={codes.suggested}
                          editable={Boolean(user && canEditLineCodes(l, user))}
                          onSave={(nextCodes) => {
                            if (!user) return
                            const res = app.updateLineCodes(invoice.id, l.id, nextCodes, user.id)
                            if (res.message) push(res.message, res.ok ? 'success' : 'error')
                          }}
                        />
                        <td className="py-2 text-right">{formatMoney(l.amount, invoice.currency)}</td>
                        <td className="py-2"><LineBadge status={l.status} /></td>
                      </tr>
                      {user && canApproveLine(l, user) && (
                        <tr key={`${l.id}-actions`} className="border-t border-ink-50 bg-paper/60">
                          <td colSpan={6} className="px-2 py-3">
                            <LineApprovalActions
                              invoiceId={invoice.id}
                              line={l}
                              onReject={() => onReject(l.id)}
                              onRevision={() => onRevision(l.id)}
                            />
                          </td>
                        </tr>
                      )}
                      {canEdit && l.status === 'rejected' && (
                        <tr key={`${l.id}-resubmit`}>
                          <td colSpan={6} className="py-2 text-right">
                            <Button variant="ghost" onClick={() => onResubmit(l.id)}>Yeniden gönder</Button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </div>
  )
}

function SplitModal({ invoice, itemId, onClose }: { invoice: Invoice; itemId: string; onClose: () => void }) {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const item = invoice.accountingItems.find((a) => a.id === itemId)
  const existing = invoice.allocations.filter((a) => a.accountingItemId === itemId)
  const [rows, setRows] = useState(
    existing.length
      ? existing.map((e) => ({ ...e }))
      : [
          {
            id: uid('al'),
            accountingItemId: itemId,
            department: item?.department ?? DEPARTMENTS[0],
            project: '',
            amount: item?.amount ?? 0,
            status: 'pending' as const,
            assigneeId: '',
            originalAssigneeId: '',
            isDelegate: false,
          },
        ],
  )

  if (!item || !user) return null
  const total = round2(rows.reduce((s, r) => s + Number(r.amount || 0), 0))
  const remaining = round2(item.amount - total)

  return (
    <Modal
      open
      wide
      title={`${item.name} — satır bölüştürme`}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Vazgeç</Button>
          <Button
            onClick={() => {
              const prepared: AllocationLine[] = rows.map((r) => {
                const manager = app.deptManagers.find((d) => d.department === r.department)?.managerId ?? ''
                return {
                  ...r,
                  amount: Number(r.amount),
                  assigneeId: r.assigneeId || manager,
                  originalAssigneeId: r.originalAssigneeId || manager,
                  status: r.status === 'approved' ? 'pending' : r.status,
                }
              })
              const res = app.saveAllocations(invoice.id, itemId, prepared, user.id)
              push(res.message, res.ok ? 'success' : 'error')
              if (res.ok) onClose()
            }}
          >
            Kaydet
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-500">
        Toplam dağıtım {formatMoney(item.amount, invoice.currency)} olmalıdır. Kalan:{' '}
        <span className={remaining === 0 ? 'font-semibold text-teal-700' : 'font-semibold text-amber-700'}>
          {formatMoney(remaining, invoice.currency)}
        </span>
      </p>
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div key={row.id} className="grid gap-2 rounded-xl border border-ink-100 p-3 md:grid-cols-4">
            <Select value={row.department} onChange={(e) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, department: e.target.value } : r)))}>
              {DEPARTMENTS.filter((d) => d !== 'Muhasebe').map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
            <Input placeholder="Proje" value={row.project} onChange={(e) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, project: e.target.value } : r)))} />
            <Input type="number" min={0} value={row.amount} onChange={(e) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, amount: Number(e.target.value) } : r)))} />
            <Button variant="ghost" onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))}>Kaldır</Button>
          </div>
        ))}
      </div>
      <Button
        className="mt-3"
        variant="outline"
        onClick={() =>
          setRows((rs) => [
            ...rs,
            {
              id: uid('al'),
              accountingItemId: itemId,
              department: item.department ?? 'IT',
              project: '',
              amount: Math.max(remaining, 0),
              status: 'pending',
              assigneeId: '',
              originalAssigneeId: '',
              isDelegate: false,
            },
          ])
        }
      >
        <Plus size={16} /> Satır ekle
      </Button>
    </Modal>
  )
}

function DocumentPreview({ invoice }: { invoice: Invoice }) {
  const app = useApp()
  const cariKod = dash(cariKodFor(invoice, app.supplierMappings))
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-ink-100 bg-white p-8 shadow-sm">
      <div className="mb-6 flex justify-between border-b border-ink-100 pb-4">
        <div>
          <div className="text-xs text-ink-500">Cari</div>
          <div className="text-lg font-bold">{invoice.supplierName || 'Belge'}</div>
          <div className="font-mono text-xs text-ink-500">Kod {cariKod} · VKN {invoice.taxNumber || '—'}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-ink-500">Fatura</div>
          <div className="font-semibold">{invoice.number}</div>
          <div className="text-xs">{invoice.date ? formatDate(invoice.date) : '—'}</div>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs text-ink-500">
          <tr>
            <th className="pb-2 text-left">Tip</th>
            <th className="pb-2 text-left">Hizmet / ürün kalemi</th>
            <th className="pb-2 text-right">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {invoice.sourceItems.map((s) => (
            <tr key={s.id} className="border-t border-ink-100">
              <td className="py-2">{itemTypeLabel(resolveItemType(s))}</td>
              <td className="py-2">{s.description}</td>
              <td className="py-2 text-right">{formatMoney(s.amount, invoice.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-6 flex justify-end text-sm font-bold">Toplam {formatMoney(invoice.total, invoice.currency)}</div>
      <p className="mt-6 text-center text-[11px] text-ink-500">Orijinal dosya: {invoice.document.name || 'yok'} · salt okunur kopya</p>
    </div>
  )
}

function History({ invoiceId }: { invoiceId: string }) {
  const app = useApp()
  const rows = app.audit.filter((a) => a.entityId === invoiceId || app.getInvoice(invoiceId)?.allocations.some((l) => l.id === a.entityId))
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      {rows.length === 0 && <p className="text-sm text-ink-500">Bu fatura için henüz denetim kaydı yok.</p>}
      <ul className="space-y-3">
        {rows.map((a) => (
          <li key={a.id} className="border-b border-ink-100 pb-3 last:border-0">
            <div className="text-sm font-semibold">{a.action}</div>
            <div className="text-xs text-ink-500">{formatDateTime(a.at)} · {getUser(a.userId)?.name}</div>
            <div className="mt-1 text-sm text-ink-700">{a.detail}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QuickMappingModal({ open, invoice, onClose }: { open: boolean; invoice: Invoice; onClose: () => void }) {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const unmatched = invoice.sourceItems.filter(
    (s) => !app.itemMappings.some((m) => m.sourceItem.toLocaleLowerCase('tr') === s.description.toLocaleLowerCase('tr')),
  )
  const needsSupplier = !app.supplierMappings.some(
    (s) => s.supplierName.toLocaleLowerCase('tr') === invoice.supplierName.toLocaleLowerCase('tr'),
  )
  const [processingType, setProcessingType] = useState<'Komisyon' | 'Standart'>('Standart')
  const [itemMap, setItemMap] = useState<Record<string, { accountingItem: string; department: string }>>({})

  const existingNames = useMemo(() => Array.from(new Set(app.itemMappings.map((m) => m.accountingItem))), [app.itemMappings])

  if (!user) return null

  return (
    <Modal
      open={open}
      wide
      title="Eksik mapping'i tamamla"
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Kapat</Button>
          <Button
            onClick={() => {
              if (needsSupplier) {
                app.addSupplierMapping(
                  { supplierName: invoice.supplierName, taxNumber: invoice.taxNumber, cariKod: invoice.taxNumber || '320.99.0000', processingType },
                  user.id,
                )
              }
              unmatched.forEach((s) => {
                const row = itemMap[s.id]
                if (!row?.accountingItem || !row.department) return
                app.addItemMapping({ sourceItem: s.description, accountingItem: row.accountingItem }, user.id)
                if (!app.deptMappings.some((d) => d.accountingItem === row.accountingItem)) {
                  app.addDeptMapping({ accountingItem: row.accountingItem, department: row.department }, user.id)
                }
              })
              push('Mapping kaydedildi. Sürece dahil et ile onaya gönderebilirsiniz.', 'success')
              onClose()
            }}
          >
            Mapping kaydet
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink-500">Bu tanımlar sonraki faturalarda da kullanılacak. Geçici yönlendirme için yalnızca bu faturayı onaya almak istiyorsanız kalem eşlemesini doldurun.</p>
      {needsSupplier && (
        <div className="mb-4 rounded-xl bg-paper p-4">
          <h4 className="mb-2 text-sm font-semibold">Yeni tedarikçi</h4>
          <Field label="İşleme tipi" required>
            <Select value={processingType} onChange={(e) => setProcessingType(e.target.value as 'Komisyon' | 'Standart')}>
              <option>Standart</option>
              <option>Komisyon</option>
            </Select>
          </Field>
        </div>
      )}
      {unmatched.map((s) => (
        <div key={s.id} className="mb-3 grid gap-2 rounded-xl border border-ink-100 p-3 md:grid-cols-2">
          <div className="text-sm">
            <div className="font-medium">{s.description}</div>
            <div className="text-xs text-ink-500">{formatMoney(s.amount, invoice.currency)}</div>
          </div>
          <div className="grid gap-2">
            <Input
              list="acc-items"
              placeholder="Muhasebe kalemi"
              value={itemMap[s.id]?.accountingItem ?? ''}
              onChange={(e) => setItemMap((m) => ({ ...m, [s.id]: { accountingItem: e.target.value, department: m[s.id]?.department ?? 'IT' } }))}
            />
            <Select
              value={itemMap[s.id]?.department ?? 'IT'}
              onChange={(e) => setItemMap((m) => ({ ...m, [s.id]: { accountingItem: m[s.id]?.accountingItem ?? '', department: e.target.value } }))}
            >
              {DEPARTMENTS.filter((d) => d !== 'Muhasebe').map((d) => (
                <option key={d}>{d}</option>
              ))}
            </Select>
          </div>
        </div>
      ))}
      <datalist id="acc-items">
        {existingNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </Modal>
  )
}

export function ValidateInvoicePage() {
  const { id } = useParams()
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const invoice = app.getInvoice(id ?? '')
  const [form, setForm] = useState(() => ({
    supplierName: invoice?.supplierName || 'Vodafone',
    taxNumber: invoice?.taxNumber || '9250262858',
    number: invoice?.number || 'INV-2026-0189',
    date: invoice?.date || '2026-08-25',
    total: invoice?.total || 6400,
    items: invoice?.sourceItems.length
      ? invoice.sourceItems
      : [
          { id: uid('si'), description: 'Kurumsal Hat Bedeli', amount: 4000 },
          { id: uid('si'), description: 'İnternet Hizmeti', amount: 2400 },
        ],
  }))
  const navigate = useNavigate()

  if (!invoice || !user) return <EmptyState title="Kayıt yok" description="Fatura bulunamadı." />

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-xl font-bold">OCR verisini doğrula</h1>
      <p className="text-sm text-ink-500">AI alanları otomatik doldurdu. Kaydetmeden fatura oluşmaz.</p>
      <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Tedarikçi" required><Input value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} /></Field>
          <Field label="VKN" required><Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} /></Field>
          <Field label="Fatura no" required><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
          <Field label="Tarih" required><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
          <Field label="Toplam" required><Input type="number" value={form.total} onChange={(e) => setForm({ ...form, total: Number(e.target.value) })} /></Field>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">Kalemler</h3>
          {form.items.map((it, idx) => (
            <div key={it.id} className="mb-2 grid gap-2 md:grid-cols-2">
              <Input value={it.description} onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)) })} />
              <Input type="number" value={it.amount} onChange={(e) => setForm({ ...form, items: form.items.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) } : x)) })} />
            </div>
          ))}
        </div>
        <Field label="Not"><Textarea placeholder="Doğrulama notu (opsiyonel)" /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(`/faturalar/${invoice.id}`)}>Vazgeç</Button>
          <Button
            onClick={() => {
              const duplicate = app.invoices.find((i) => i.id !== invoice.id && i.number === form.number && i.supplierName === form.supplierName)
              if (duplicate) {
                push('Mükerrer fatura: aynı tedarikçi ve fatura numarası mevcut.', 'error')
                return
              }
              const next: Invoice = {
                ...invoice,
                supplierName: form.supplierName,
                taxNumber: form.taxNumber,
                number: form.number,
                date: form.date,
                dueDate: form.date,
                total: form.total,
                sourceItems: form.items,
                status: 'Manuel Fatura Kontrol',
              }
              app.saveDraft(next, user.id)
              push('Veri doğrulandı. Mapping kontrolüne alındı.', 'success')
              navigate(`/faturalar/${invoice.id}`)
            }}
          >
            Doğrula ve kaydet
          </Button>
        </div>
      </div>
    </div>
  )
}
