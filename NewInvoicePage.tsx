import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileUp, Image as ImageIcon, Keyboard, Loader2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { uid } from '../lib/format'
import { runMapping, buildAllocations } from '../lib/mapping'
import type { Invoice, InvoiceSource, SourceItem } from '../types'

type Step = 1 | 2 | 3
type Sample = 'vodafone' | 'abc' | 'blank'

const samples: Record<Exclude<Sample, 'blank'>, { supplierName: string; taxNumber: string; number: string; date: string; items: SourceItem[] }> = {
  vodafone: {
    supplierName: 'Vodafone',
    taxNumber: '9250262858',
    number: `VDF-2026-${Math.floor(Math.random() * 90000 + 10000)}`,
    date: '2026-08-22',
    items: [
      { id: 'tmp-1', description: 'Kurumsal Hat Bedeli', amount: 9800, itemType: 'hizmet' },
      { id: 'tmp-2', description: 'İnternet Hizmeti', amount: 4200, itemType: 'hizmet' },
    ],
  },
  abc: {
    supplierName: 'ABC Teknoloji A.Ş.',
    taxNumber: '1112223334',
    number: `ABC-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
    date: '2026-08-26',
    items: [{ id: 'tmp-3', description: 'AI Danışmanlık Hizmeti', amount: 45000, itemType: 'hizmet' }],
  },
}

export function NewInvoicePage() {
  const [step, setStep] = useState<Step>(1)
  const [source, setSource] = useState<InvoiceSource>('pdf')
  const [ocr, setOcr] = useState<'idle' | 'running' | 'done'>('idle')
  const [fileName, setFileName] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [number, setNumber] = useState('')
  const [date, setDate] = useState('')
  const [currency, setCurrency] = useState<'TRY' | 'USD' | 'EUR'>('TRY')
  const [items, setItems] = useState<SourceItem[]>([{ id: uid('si'), description: '', amount: 0, itemType: 'hizmet' }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const navigate = useNavigate()

  const total = items.reduce((s, i) => s + Number(i.amount || 0), 0)

  function startOcr(kind: Sample) {
    setOcr('running')
    window.setTimeout(() => {
      if (kind !== 'blank') {
        const data = samples[kind]
        setSupplierName(data.supplierName)
        setTaxNumber(data.taxNumber)
        setNumber(data.number)
        setDate(data.date)
        setItems(data.items.map((i) => ({ ...i, id: uid('si') })))
      }
      setOcr('done')
      setStep(2)
    }, 1100)
  }

  function validate(): boolean {
    const next: Record<string, string> = {}
    if (!supplierName) next.supplierName = 'Tedarikçi zorunlu'
    if (!taxNumber) next.taxNumber = 'VKN zorunlu'
    if (!number) next.number = 'Fatura no zorunlu'
    if (!date) next.date = 'Tarih zorunlu'
    if (items.length === 0 || items.some((i) => !i.description || i.amount <= 0)) next.items = 'En az bir geçerli kalem girin'
    const dup = app.invoices.find((i) => i.number === number && i.supplierName === supplierName)
    if (dup) next.number = 'Mükerrer fatura: aynı tedarikçi ve numara mevcut'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function save() {
    if (!user || !validate()) {
      push('Eksik veya hatalı alanlar var.', 'error')
      return
    }
    const draft: Invoice = {
      id: uid('inv'),
      number,
      supplierId: '',
      supplierName,
      taxNumber,
      cariKod: app.supplierMappings.find((s) => s.supplierName.toLocaleLowerCase('tr') === supplierName.toLocaleLowerCase('tr'))?.cariKod ?? '',
      date,
      dueDate: date,
      currency,
      total,
      source,
      status: 'Yeni',
      sourceItems: items,
      accountingItems: [],
      allocations: [],
      document: { name: fileName || 'manuel-giris', type: source === 'image' ? 'image' : source === 'manual' ? 'none' : 'pdf' },
      createdAt: new Date().toISOString(),
      mappingIssues: [],
    }
    const mapped = runMapping(draft, app)
    if (mapped.issues.length) {
      draft.status = mapped.accountingItems.length ? 'Mapping Bekliyor' : 'Manuel Fatura Kontrol'
      draft.processingType = mapped.processingType
      draft.accountingItems = mapped.accountingItems
      draft.mappingIssues = mapped.issues
    } else {
      draft.processingType = mapped.processingType
      draft.accountingItems = mapped.accountingItems
      draft.allocations = buildAllocations(mapped.accountingItems, app)
      draft.status = 'Onay Bekliyor'
    }
    app.createInvoice(draft, user.id)
    push(draft.status === 'Onay Bekliyor' ? 'Fatura oluşturuldu ve onaya düştü.' : 'Fatura oluşturuldu. Mapping kontrolü gerekli.', draft.status === 'Onay Bekliyor' ? 'success' : 'info')
    navigate(`/faturalar/${draft.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="text-xl font-bold">Yeni fatura</h1>
        <p className="text-sm text-ink-500">Belge yükleyin veya formu doldurun. OCR sonucu sizin onayınız olmadan kayıt olmaz.</p>
      </div>
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${step >= s ? 'bg-teal-600' : 'bg-ink-100'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Kaynak</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {([
              ['pdf', 'PDF', FileUp],
              ['image', 'Görsel', ImageIcon],
              ['manual', 'Manuel form', Keyboard],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSource(key)}
                className={`rounded-xl border p-4 text-left ${source === key ? 'border-teal-600 bg-teal-50' : 'border-ink-100'}`}
              >
                <Icon size={18} className="mb-2 text-navy-800" />
                <div className="text-sm font-semibold">{label}</div>
              </button>
            ))}
          </div>
          {source !== 'manual' && (
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-ink-300 bg-paper px-6 py-10 text-center">
              <FileUp className="mb-2 text-ink-500" />
              <div className="text-sm font-semibold">Dosyayı sürükleyin veya seçin</div>
              <div className="text-xs text-ink-500">PDF, JPG, PNG — prototipte örnek OCR çalışır</div>
              <input
                type="file"
                className="hidden"
                accept={source === 'pdf' ? 'application/pdf' : 'image/*'}
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? 'yuklenen-belge')}
              />
              {fileName && <div className="mt-2 text-xs font-medium text-teal-700">{fileName}</div>}
            </label>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button variant="outline" onClick={() => { setFileName('vodafone-ornek.pdf'); startOcr('vodafone') }}>
              Bilinen tedarikçi örneği
            </Button>
            <Button variant="outline" onClick={() => { setFileName('abc-ornek.pdf'); startOcr('abc') }}>
              Yeni tedarikçi örneği
            </Button>
            {source === 'manual' && (
              <Button onClick={() => { setOcr('done'); setStep(2) }}>Forma geç</Button>
            )}
          </div>
          {ocr === 'running' && (
            <div className="flex items-center gap-2 text-sm text-navy-800">
              <Loader2 className="animate-spin" size={16} /> AI OCR çalışıyor…
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold">Fatura bilgileri</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tedarikçi" required error={errors.supplierName}>
              <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </Field>
            <Field label="VKN" required error={errors.taxNumber}>
              <Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} />
            </Field>
            <Field label="Fatura no" required error={errors.number}>
              <Input value={number} onChange={(e) => setNumber(e.target.value)} />
            </Field>
            <Field label="Tarih" required error={errors.date}>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Para birimi">
              <Select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)}>
                <option>TRY</option>
                <option>USD</option>
                <option>EUR</option>
              </Select>
            </Field>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Kalemler</h3>
            {errors.items && <p className="mb-2 text-xs font-medium text-red-600">{errors.items}</p>}
            {items.map((it, idx) => (
              <div key={it.id} className="mb-2 grid gap-2 md:grid-cols-[120px_1fr_140px_80px]">
                <Select value={it.itemType ?? 'hizmet'} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, itemType: e.target.value as 'hizmet' | 'ürün' } : x)))}>
                  <option value="hizmet">Hizmet</option>
                  <option value="ürün">Ürün</option>
                </Select>
                <Input placeholder="Hizmet / ürün kalemi" value={it.description} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)))} />
                <Input type="number" placeholder="Tutar" value={it.amount || ''} onChange={(e) => setItems(items.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) } : x)))} />
                <Button variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>Sil</Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setItems([...items, { id: uid('si'), description: '', amount: 0, itemType: 'hizmet' }])}>Kalem ekle</Button>
            <p className="mt-3 text-sm font-semibold">Toplam {total.toLocaleString('tr-TR')} {currency}</p>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Geri</Button>
            <Button onClick={() => { if (validate()) setStep(3) }}>Önizleme</Button>
          </div>
        </div>
      )}

      {step === 3 && user && (
        <PreviewStep
          supplierName={supplierName}
          items={items}
          total={total}
          currency={currency}
          onBack={() => setStep(2)}
          onSave={save}
        />
      )}
    </div>
  )
}

function PreviewStep({
  supplierName,
  items,
  total,
  currency,
  onBack,
  onSave,
}: {
  supplierName: string
  items: SourceItem[]
  total: number
  currency: string
  onBack: () => void
  onSave: () => void
}) {
  const app = useApp()
  const mapped = runMapping({ supplierName, sourceItems: items }, app)
  return (
    <div className="space-y-4 rounded-2xl border border-ink-100 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold">Mapping önizlemesi</h2>
      <p className="text-sm text-ink-500">
        İşleme tipi: <b>{mapped.processingType ?? 'belirsiz'}</b> · Toplam {total.toLocaleString('tr-TR')} {currency}
      </p>
      {mapped.issues.length > 0 ? (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          Kayıt otomatik onaya düşmeyecek:
          <ul className="mt-1 list-disc pl-4">
            {mapped.issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">
          Tüm mappingler bulundu. Kaydettiğinizde dağıtım satırları otomatik oluşturulup ilgili yöneticilere atanacak.
        </div>
      )}
      {mapped.accountingItems.map((a) => (
        <div key={a.id} className="flex justify-between rounded-lg border border-ink-100 px-3 py-2 text-sm">
          <span>{a.name} → {a.department ?? 'departman yok'}</span>
          <span className="font-medium">{a.amount.toLocaleString('tr-TR')}</span>
        </div>
      ))}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>Geri</Button>
        <Button onClick={onSave}>Kaydet</Button>
      </div>
    </div>
  )
}
