import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { DEPARTMENTS, getUser } from '../data/mock'
import { ExpenseCodeSelect, ProjectCodeSelect } from '../components/invoice/CodeSelects'

type Tab = 'supplier' | 'item' | 'dept' | 'template'

export function MappingsPage() {
  const [tab, setTab] = useState<Tab>('supplier')
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Tanımlar</h1>
        <p className="text-sm text-ink-500">Otomatik yönlendirme zinciri: tedarikçi → kalem → departman → şablon.</p>
      </div>
      <div className="flex gap-1 rounded-xl bg-white p-1 shadow-sm">
        {([
          ['supplier', 'Tedarikçi'],
          ['item', 'Kaynak kalem'],
          ['dept', 'Departman'],
          ['template', 'Şablonlar'],
        ] as const).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === k ? 'bg-navy-800 text-white' : 'text-ink-500'}`}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'supplier' && <SupplierTab />}
      {tab === 'item' && <ItemTab />}
      {tab === 'dept' && <DeptTab />}
      {tab === 'template' && <TemplateTab />}
    </div>
  )
}

function SupplierTab() {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [cariKod, setCariKod] = useState('')
  const [processingType, setProcessingType] = useState<'Komisyon' | 'Standart'>('Standart')
  return (
    <Panel
      title="Tedarikçi → işleme tipi"
      onAdd={() => setOpen(true)}
      headers={['Cari kod', 'Cari ismi', 'VKN', 'İşleme tipi']}
      rows={app.supplierMappings.map((s) => [s.cariKod, s.supplierName, s.taxNumber, s.processingType])}
    >
      <Modal open={open} title="Tedarikçi mapping" onClose={() => setOpen(false)} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={() => { if (!user || !supplierName) return; app.addSupplierMapping({ supplierName, taxNumber, cariKod, processingType }, user.id); push('Mapping eklendi'); setOpen(false) }}>Kaydet</Button>
        </>
      }>
        <div className="space-y-3">
          <Field label="Cari ismi" required><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></Field>
          <Field label="Cari kod" required><Input value={cariKod} onChange={(e) => setCariKod(e.target.value)} placeholder="320.01.0001" /></Field>
          <Field label="VKN"><Input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} /></Field>
          <Field label="İşleme tipi"><Select value={processingType} onChange={(e) => setProcessingType(e.target.value as 'Komisyon' | 'Standart')}><option>Standart</option><option>Komisyon</option></Select></Field>
        </div>
      </Modal>
    </Panel>
  )
}

function ItemTab() {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [sourceItem, setSourceItem] = useState('')
  const [accountingItem, setAccountingItem] = useState('')
  return (
    <Panel title="Kaynak kalem → muhasebe kalemi" onAdd={() => setOpen(true)} headers={['Kaynak kalem', 'Muhasebe kalemi']} rows={app.itemMappings.map((s) => [s.sourceItem, s.accountingItem])}>
      <Modal open={open} title="Kalem mapping" onClose={() => setOpen(false)} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={() => { if (!user || !sourceItem || !accountingItem) return; app.addItemMapping({ sourceItem, accountingItem }, user.id); push('Mapping eklendi'); setOpen(false) }}>Kaydet</Button>
        </>
      }>
        <div className="space-y-3">
          <Field label="Kaynak kalem" required><Input value={sourceItem} onChange={(e) => setSourceItem(e.target.value)} /></Field>
          <Field label="Muhasebe kalemi" required><Input value={accountingItem} onChange={(e) => setAccountingItem(e.target.value)} /></Field>
        </div>
      </Modal>
    </Panel>
  )
}

function DeptTab() {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [accountingItem, setAccountingItem] = useState('')
  const [department, setDepartment] = useState('Satış')
  return (
    <Panel
      title="Muhasebe kalemi → departman / yönetici"
      onAdd={() => setOpen(true)}
      headers={['Muhasebe kalemi', 'Departman', 'LDAP yönetici']}
      rows={app.deptMappings.map((s) => {
        const mgr = app.deptManagers.find((d) => d.department === s.department)
        return [s.accountingItem, s.department, getUser(mgr?.managerId ?? '')?.name ?? 'LDAP kaydı yok → manuel kontrol']
      })}
    >
      <Modal open={open} title="Departman mapping" onClose={() => setOpen(false)} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={() => { if (!user || !accountingItem) return; app.addDeptMapping({ accountingItem, department }, user.id); push('Mapping eklendi'); setOpen(false) }}>Kaydet</Button>
        </>
      }>
        <div className="space-y-3">
          <Field label="Muhasebe kalemi" required><Input value={accountingItem} onChange={(e) => setAccountingItem(e.target.value)} /></Field>
          <Field label="Departman"><Select value={department} onChange={(e) => setDepartment(e.target.value)}>{DEPARTMENTS.filter((d) => d !== 'Muhasebe').map((d) => <option key={d}>{d}</option>)}</Select></Field>
        </div>
      </Modal>
    </Panel>
  )
}

function TemplateTab() {
  const app = useApp()
  const { user } = useAuth()
  const { push } = useToast()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('Satış')
  const [accountCode, setAccountCode] = useState('')
  const [projectCode, setProjectCode] = useState('')
  const [expenseCode, setExpenseCode] = useState('')
  return (
    <Panel title="Muhasebeleştirme şablonları" onAdd={() => setOpen(true)} headers={['Şablon', 'Departman', 'Hesap', 'Proje', 'Masraf']} rows={app.templates.map((t) => [t.name, t.department, t.accountCode, t.projectCode, t.expenseCode])}>
      <Modal open={open} title="Yeni şablon" onClose={() => setOpen(false)} footer={
        <>
          <Button variant="outline" onClick={() => setOpen(false)}>Vazgeç</Button>
          <Button onClick={() => { if (!user || !name || !accountCode || !expenseCode) return; app.addTemplate({ name, department, accountCode, projectCode, expenseCode }, user.id); push('Şablon eklendi'); setOpen(false) }}>Kaydet</Button>
        </>
      }>
        <div className="grid gap-3">
          <Field label="Ad" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Departman">
            <Select
              value={department}
              onChange={(e) => {
                const next = e.target.value
                setDepartment(next)
                setProjectCode('')
                setExpenseCode(next === 'IT' ? '4001' : '')
              }}
            >
              {DEPARTMENTS.filter((d) => d !== 'Muhasebe').map((d) => <option key={d}>{d}</option>)}
            </Select>
          </Field>
          <Field label="Hesap kodu" required><Input value={accountCode} onChange={(e) => setAccountCode(e.target.value)} /></Field>
          <Field label="Proje kodu"><ProjectCodeSelect department={department} value={projectCode} onChange={setProjectCode} /></Field>
          <Field label="Masraf kodu" required><ExpenseCodeSelect department={department} value={expenseCode} onChange={setExpenseCode} /></Field>
        </div>
      </Modal>
    </Panel>
  )
}

function Panel({
  title,
  headers,
  rows,
  onAdd,
  children,
}: {
  title: string
  headers: string[]
  rows: string[][]
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{title}</h2>
        <Button onClick={onAdd}>Yeni</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-ink-500">
            <tr>{headers.map((h) => <th key={h} className="pb-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-ink-100">
                {r.map((c, j) => <td key={j} className="py-2">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {children}
    </div>
  )
}
