import { createContext, createElement, useContext, useMemo, useReducer, type ReactNode } from 'react'
import { INITIAL_STATE, accountingUserIds, getUser } from '../data/mock'
import { round2, todayISO, uid } from '../lib/format'
import { isValidJiraUrl } from '../lib/jira'
import { buildAllocations, invoiceStatusFromAllocations, runMapping } from '../lib/mapping'
import type {
  AllocationLine,
  AppNotification,
  AppState,
  AuditEntry,
  Delegation,
  DeptMapping,
  Invoice,
  ItemMapping,
  NotificationKind,
  SupplierMapping,
  Template,
} from '../types'

type Action =
  | { type: 'ADD_INVOICE'; invoice: Invoice; audit: AuditEntry; notifications?: AppNotification[] }
  | { type: 'UPDATE_INVOICE'; invoice: Invoice; audit?: AuditEntry; notifications?: AppNotification[] }
  | { type: 'PATCH_INVOICE'; id: string; patch: Partial<Invoice>; audit?: AuditEntry; notifications?: AppNotification[] }
  | { type: 'ADD_SUPPLIER_MAPPING'; mapping: SupplierMapping; audit: AuditEntry }
  | { type: 'ADD_ITEM_MAPPING'; mapping: ItemMapping; audit: AuditEntry }
  | { type: 'ADD_DEPT_MAPPING'; mapping: DeptMapping; audit: AuditEntry }
  | { type: 'ADD_TEMPLATE'; template: Template; audit: AuditEntry }
  | { type: 'ADD_DELEGATION'; delegation: Delegation; audit: AuditEntry; notifications?: AppNotification[] }
  | { type: 'UPDATE_DELEGATION'; delegation: Delegation; audit: AuditEntry; notifications?: AppNotification[] }
  | { type: 'ADD_AUDIT'; audit: AuditEntry }
  | { type: 'MARK_NOTIFICATIONS'; userId: string; ids?: string[] }

function auditOf(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  detail: string,
  extra?: Partial<AuditEntry>,
): AuditEntry {
  return {
    id: uid('au'),
    at: todayISO(),
    userId,
    action,
    entity,
    entityId,
    detail,
    ...extra,
  }
}

function makeNotes(
  rows: Array<{
    userId: string
    title: string
    body: string
    kind: NotificationKind
    invoiceId?: string
  }>,
): AppNotification[] {
  return rows.map((row) => ({
    id: uid('nt'),
    at: todayISO(),
    read: false,
    ...row,
  }))
}

function mergeNotes(current: AppNotification[], extra?: AppNotification[]) {
  return extra?.length ? [...extra, ...current] : current
}

function assigneeNotes(invoice: Invoice, title: string, body: string, kind: NotificationKind) {
  const ids = [...new Set(invoice.allocations.filter((a) => a.status === 'pending').map((a) => a.assigneeId))]
  return makeNotes(ids.map((userId) => ({ userId, title, body, kind, invoiceId: invoice.id })))
}

function accountingNotes(invoice: Invoice, title: string, body: string, kind: NotificationKind) {
  return makeNotes(accountingUserIds().map((userId) => ({ userId, title, body, kind, invoiceId: invoice.id })))
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_INVOICE':
      return {
        ...state,
        invoices: [action.invoice, ...state.invoices],
        audit: [action.audit, ...state.audit],
        notifications: mergeNotes(state.notifications, action.notifications),
      }
    case 'UPDATE_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map((i) => (i.id === action.invoice.id ? action.invoice : i)),
        audit: action.audit ? [action.audit, ...state.audit] : state.audit,
        notifications: mergeNotes(state.notifications, action.notifications),
      }
    case 'PATCH_INVOICE':
      return {
        ...state,
        invoices: state.invoices.map((i) => (i.id === action.id ? { ...i, ...action.patch } : i)),
        audit: action.audit ? [action.audit, ...state.audit] : state.audit,
        notifications: mergeNotes(state.notifications, action.notifications),
      }
    case 'ADD_SUPPLIER_MAPPING':
      return {
        ...state,
        supplierMappings: [...state.supplierMappings, action.mapping],
        audit: [action.audit, ...state.audit],
      }
    case 'ADD_ITEM_MAPPING':
      return { ...state, itemMappings: [...state.itemMappings, action.mapping], audit: [action.audit, ...state.audit] }
    case 'ADD_DEPT_MAPPING':
      return { ...state, deptMappings: [...state.deptMappings, action.mapping], audit: [action.audit, ...state.audit] }
    case 'ADD_TEMPLATE':
      return { ...state, templates: [...state.templates, action.template], audit: [action.audit, ...state.audit] }
    case 'ADD_DELEGATION':
      return {
        ...state,
        delegations: [action.delegation, ...state.delegations],
        audit: [action.audit, ...state.audit],
        notifications: mergeNotes(state.notifications, action.notifications),
      }
    case 'UPDATE_DELEGATION':
      return {
        ...state,
        delegations: state.delegations.map((d) => (d.id === action.delegation.id ? action.delegation : d)),
        audit: [action.audit, ...state.audit],
        notifications: mergeNotes(state.notifications, action.notifications),
      }
    case 'ADD_AUDIT':
      return { ...state, audit: [action.audit, ...state.audit] }
    case 'MARK_NOTIFICATIONS':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.userId === action.userId && (!action.ids || action.ids.includes(n.id)) ? { ...n, read: true } : n,
        ),
      }
    default:
      return state
  }
}

interface AppContextValue extends AppState {
  getInvoice: (id: string) => Invoice | undefined
  createInvoice: (invoice: Invoice, userId: string) => Invoice
  saveDraft: (invoice: Invoice, userId: string) => void
  applyMappingAndInclude: (invoiceId: string, userId: string) => { ok: boolean; message: string }
  saveAllocations: (invoiceId: string, accountingItemId: string, lines: AllocationLine[], userId: string) => { ok: boolean; message: string }
  sendToApproval: (invoiceId: string, userId: string) => { ok: boolean; message: string }
  approveLine: (
    invoiceId: string,
    lineId: string,
    userId: string,
    codes?: { projectCode?: string; expenseCode?: string; jiraLink?: string },
  ) => { ok: boolean; message: string }
  saveJiraLink: (invoiceId: string, lineId: string, jiraLink: string, userId: string) => { ok: boolean; message: string }
  updateLineCodes: (
    invoiceId: string,
    lineId: string,
    codes: { projectCode: string; expenseCode: string },
    userId: string,
  ) => { ok: boolean; message: string }
  rejectLine: (invoiceId: string, lineId: string, reason: string, userId: string) => { ok: boolean; message: string }
  sendToRevision: (invoiceId: string, lineId: string, reason: string, userId: string) => { ok: boolean; message: string }
  markWaitingSupplier: (invoiceId: string, note: string, userId: string) => { ok: boolean; message: string }
  saveAccountingNote: (invoiceId: string, note: string, userId: string) => { ok: boolean; message: string }
  uploadCorrectedDocument: (invoiceId: string, userId: string) => { ok: boolean; message: string }
  resubmitAfterRevision: (invoiceId: string, note: string, userId: string) => { ok: boolean; message: string }
  resubmitRejected: (invoiceId: string, lineId: string, userId: string) => { ok: boolean; message: string }
  accountingApprove: (invoiceId: string, userId: string) => { ok: boolean; message: string }
  transferElogo: (invoiceId: string, userId: string, fail?: boolean) => { ok: boolean; message: string }
  addSupplierMapping: (mapping: Omit<SupplierMapping, 'id'>, userId: string) => void
  addItemMapping: (mapping: Omit<ItemMapping, 'id'>, userId: string) => void
  addDeptMapping: (mapping: Omit<DeptMapping, 'id'>, userId: string) => void
  addTemplate: (template: Omit<Template, 'id'>, userId: string) => void
  addDelegation: (delegation: Omit<Delegation, 'id' | 'createdAt' | 'status'>, userId: string) => Delegation
  cancelDelegation: (id: string, userId: string) => void
  markNotificationsRead: (userId: string, ids?: string[]) => void
}

const AppContext = createContext<AppContextValue | null>(null)

const REVISION_BLOCK = ['Revizyonda', 'Tedarikçi Düzeltmesi Bekleniyor'] as const

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const value = useMemo<AppContextValue>(() => {
    const getInvoice = (id: string) => state.invoices.find((i) => i.id === id)

    const createInvoice = (invoice: Invoice, userId: string) => {
      dispatch({
        type: 'ADD_INVOICE',
        invoice,
        audit: auditOf(userId, 'Fatura oluşturma', 'Fatura', invoice.id, `${invoice.number} oluşturuldu (${invoice.source})`),
      })
      return invoice
    }

    const saveDraft = (invoice: Invoice, userId: string) => {
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice,
        audit: auditOf(userId, 'Fatura güncelleme', 'Fatura', invoice.id, `${invoice.number} kaydedildi`),
      })
    }

    const applyMappingAndInclude = (invoiceId: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const mapped = runMapping(invoice, state)
      if (mapped.issues.length > 0) {
        const next: Invoice = {
          ...invoice,
          processingType: mapped.processingType,
          accountingItems: mapped.accountingItems,
          mappingIssues: mapped.issues,
          status: mapped.accountingItems.length === 0 ? 'Manuel Fatura Kontrol' : 'Mapping Bekliyor',
        }
        dispatch({
          type: 'UPDATE_INVOICE',
          invoice: next,
          audit: auditOf(userId, 'Mapping kontrolü', 'Fatura', invoice.id, mapped.issues.join('; ')),
          notifications: accountingNotes(
            next,
            'Manuel kontrol / mapping',
            `${next.number} mapping kaydı eksik; fatura manuel kontrole alındı.`,
            'mapping',
          ),
        })
        return { ok: false, message: 'Eksik mapping var. Kayıt manuel kontrole alındı.' }
      }
      const allocations = buildAllocations(mapped.accountingItems, state)
      const next: Invoice = {
        ...invoice,
        processingType: mapped.processingType,
        accountingItems: mapped.accountingItems,
        allocations,
        mappingIssues: [],
        status: invoiceStatusFromAllocations(allocations),
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Sürece dahil et', 'Fatura', invoice.id, `${invoice.number} onay sürecine alındı`),
        notifications: assigneeNotes(
          next,
          'Yeni onay görevi',
          `${next.number} onayınıza düştü. Onay için Jira satın alma talebi linki zorunludur.`,
          'approval',
        ),
      })
      return { ok: true, message: 'Fatura onay sürecine dahil edildi.' }
    }

    const saveAllocations = (
      invoiceId: string,
      accountingItemId: string,
      lines: AllocationLine[],
      userId: string,
    ) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const item = invoice.accountingItems.find((a) => a.id === accountingItemId)
      if (!item) return { ok: false, message: 'Muhasebe kalemi bulunamadı' }
      const total = round2(lines.reduce((s, l) => s + l.amount, 0))
      if (lines.some((l) => l.amount <= 0)) return { ok: false, message: 'Dağıtım tutarı sıfır veya negatif olamaz.' }
      if (total > item.amount) return { ok: false, message: 'Dağıtım toplamı muhasebe kalemi tutarını aşamaz.' }
      if (total !== item.amount) return { ok: false, message: 'Dağıtım satırları toplamı muhasebe kalemi tutarına eşit olmalıdır.' }
      const others = invoice.allocations.filter((a) => a.accountingItemId !== accountingItemId)
      const nextAlloc = [...others, ...lines]
      const next: Invoice = {
        ...invoice,
        allocations: nextAlloc,
        status: invoiceStatusFromAllocations(nextAlloc, invoice),
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Split Allocation', 'Fatura', invoice.id, `${item.name} ${lines.length} satıra bölündü`),
      })
      return { ok: true, message: 'Dağıtım satırları kaydedildi.' }
    }

    const sendToApproval = (invoiceId: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (invoice.accountingItems.length === 0) return { ok: false, message: 'En az bir muhasebe kalemi gerekli.' }
      if (invoice.accountingItems.some((a) => !a.department)) return { ok: false, message: 'Departmana bağlanmayan kalem onaya gönderilemez.' }
      for (const item of invoice.accountingItems) {
        const lines = invoice.allocations.filter((a) => a.accountingItemId === item.id)
        const total = round2(lines.reduce((s, l) => s + l.amount, 0))
        if (lines.length === 0 || total !== item.amount) {
          return { ok: false, message: `${item.name} için dağıtım tamamlanmadan onaya gönderilemez.` }
        }
      }
      const next: Invoice = { ...invoice, status: invoiceStatusFromAllocations(invoice.allocations, invoice) }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Onaya gönder', 'Fatura', invoice.id, `${invoice.number} departman onayına gönderildi`),
        notifications: assigneeNotes(
          next,
          'Yeni onay görevi',
          `${next.number} onayınıza düştü. Onay için Jira satın alma talebi linki zorunludur.`,
          'approval',
        ),
      })
      return { ok: true, message: 'Fatura departman onayına gönderildi.' }
    }

    const approveLine = (
      invoiceId: string,
      lineId: string,
      userId: string,
      codes?: { projectCode?: string; expenseCode?: string; jiraLink?: string },
    ) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const line = invoice.allocations.find((a) => a.id === lineId)
      if (!line) return { ok: false, message: 'Satır bulunamadı' }
      if (line.assigneeId !== userId) return { ok: false, message: 'Bu satır size atanmamış.' }
      const jiraLink = (codes?.jiraLink ?? line.jiraLink ?? '').trim()
      if (!isValidJiraUrl(jiraLink)) {
        return { ok: false, message: 'Onay için Jira satın alma talebi linki (URL) zorunludur.' }
      }
      const template =
        state.templates.find((t) => t.id === line.templateId) ??
        state.templates.find((t) => t.department === line.department)
      const accountCode = (line.accountCode || template?.accountCode || '').trim()
      if (!accountCode) return { ok: false, message: 'Bu satır için hesap kodu tanımlı değil.' }
      const projectCode = (codes?.projectCode ?? line.projectCode ?? template?.projectCode ?? '').trim()
      const expenseCode = (codes?.expenseCode ?? line.expenseCode ?? template?.expenseCode ?? '').trim()
      if (!expenseCode) return { ok: false, message: 'Masraf kodu zorunludur.' }
      const nextAlloc = invoice.allocations.map((a) =>
        a.id === lineId
          ? {
              ...a,
              status: 'approved' as const,
              templateId: template?.id ?? line.templateId,
              accountCode,
              projectCode,
              expenseCode,
              jiraLink,
              approvedAt: todayISO(),
              rejectedAt: undefined,
              rejectReason: undefined,
              revisionReason: undefined,
            }
          : a,
      )
      const next: Invoice = {
        ...invoice,
        allocations: nextAlloc,
        status: invoiceStatusFromAllocations(nextAlloc, invoice),
        resubmittedAfterRevision: nextAlloc.some((a) => a.status === 'pending')
          ? invoice.resubmittedAfterRevision
          : undefined,
      }
      const allApproved = nextAlloc.every((a) => a.status === 'approved')
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(
          userId,
          line.isDelegate ? 'Vekaleten onay' : 'Onay',
          'Dağıtım satırı',
          lineId,
          `${invoice.number} onaylandı (hesap ${accountCode}, proje ${projectCode || '—'}, masraf ${expenseCode}, Jira ${jiraLink})`,
          { isDelegate: line.isDelegate, principalId: line.originalAssigneeId },
        ),
        notifications: allApproved
          ? accountingNotes(
              next,
              'Muhasebe son kontrol',
              `${next.number} tüm satırları onaylandı. ERP aktarımından önce son kontrol sizin kuyruğunuzda.`,
              'accounting',
            )
          : undefined,
      })
      return { ok: true, message: 'Satır onaylandı.' }
    }

    const saveJiraLink = (invoiceId: string, lineId: string, jiraLink: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const line = invoice.allocations.find((a) => a.id === lineId)
      if (!line) return { ok: false, message: 'Satır bulunamadı' }
      const actor = getUser(userId)
      const allowed =
        line.assigneeId === userId || actor?.role === 'accounting' || actor?.role === 'admin'
      if (!allowed) return { ok: false, message: 'Bu satırı düzenleyemezsiniz.' }
      if (line.status !== 'pending') return { ok: false, message: 'Yalnızca onay bekleyen satırda Jira linki girilebilir.' }
      const nextLink = jiraLink.trim()
      if (nextLink && !isValidJiraUrl(nextLink)) {
        return { ok: false, message: 'Jira satın alma talebi geçerli bir URL olmalıdır.' }
      }
      if ((line.jiraLink ?? '') === nextLink) return { ok: true, message: '' }
      const nextAlloc = invoice.allocations.map((a) => (a.id === lineId ? { ...a, jiraLink: nextLink || undefined } : a))
      const next: Invoice = {
        ...invoice,
        allocations: nextAlloc,
        status: invoiceStatusFromAllocations(nextAlloc, invoice),
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Jira referansı', 'Dağıtım satırı', lineId, `${invoice.number} Jira: ${nextLink || '—'}`),
      })
      return { ok: true, message: nextLink ? 'Jira satın alma talebi kaydedildi.' : 'Jira linki temizlendi.' }
    }

    const updateLineCodes = (
      invoiceId: string,
      lineId: string,
      codes: { projectCode: string; expenseCode: string },
      userId: string,
    ) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const line = invoice.allocations.find((a) => a.id === lineId)
      if (!line) return { ok: false, message: 'Satır bulunamadı' }
      const actor = getUser(userId)
      const allowed =
        line.assigneeId === userId || actor?.role === 'accounting' || actor?.role === 'admin'
      if (!allowed) return { ok: false, message: 'Bu satırı düzenleyemezsiniz.' }
      if (line.status !== 'pending') return { ok: false, message: 'Yalnızca onay bekleyen satırda kod değiştirilebilir.' }
      const projectCode = codes.projectCode.trim()
      const expenseCode = codes.expenseCode.trim()
      if (line.projectCode === projectCode && line.expenseCode === expenseCode) {
        return { ok: true, message: '' }
      }
      const nextAlloc = invoice.allocations.map((a) =>
        a.id === lineId ? { ...a, projectCode, expenseCode } : a,
      )
      const next: Invoice = { ...invoice, allocations: nextAlloc }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(
          userId,
          'Kod güncelleme',
          'Dağıtım satırı',
          lineId,
          `${invoice.number} proje ${projectCode || '—'}, masraf ${expenseCode || '—'}`,
        ),
      })
      return { ok: true, message: 'Proje ve masraf kodu kaydedildi.' }
    }

    const rejectLine = (invoiceId: string, lineId: string, reason: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (!reason.trim()) return { ok: false, message: 'Red açıklaması zorunludur.' }
      const line = invoice.allocations.find((a) => a.id === lineId)
      if (!line) return { ok: false, message: 'Satır bulunamadı' }
      if (line.assigneeId !== userId) return { ok: false, message: 'Bu satır size atanmamış.' }
      const nextAlloc = invoice.allocations.map((a) =>
        a.id === lineId
          ? { ...a, status: 'rejected' as const, rejectedAt: todayISO(), rejectReason: reason.trim() }
          : a,
      )
      const next: Invoice = { ...invoice, allocations: nextAlloc, status: 'Kısmi Red' }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(
          userId,
          line.isDelegate ? 'Vekaleten red' : 'Red',
          'Dağıtım satırı',
          lineId,
          `${invoice.number} reddedildi: ${reason.trim()}`,
          { isDelegate: line.isDelegate, principalId: line.originalAssigneeId },
        ),
        notifications: accountingNotes(
          next,
          'Kısmi red',
          `${next.number} satırı reddedildi: ${reason.trim()}`,
          'revision',
        ),
      })
      return { ok: true, message: 'Satır reddedildi. Diğer satırlar etkilenmedi.' }
    }

    const sendToRevision = (invoiceId: string, lineId: string, reason: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (!reason.trim()) return { ok: false, message: 'Revizyon gerekçesi zorunludur.' }
      const line = invoice.allocations.find((a) => a.id === lineId)
      if (!line) return { ok: false, message: 'Satır bulunamadı' }
      if (line.assigneeId !== userId) return { ok: false, message: 'Bu satır size atanmamış.' }
      const nextAlloc = invoice.allocations.map((a) =>
        a.id === lineId
          ? {
              ...a,
              status: 'revision' as const,
              revisionReason: reason.trim(),
              revisionAt: todayISO(),
            }
          : a,
      )
      const next: Invoice = {
        ...invoice,
        allocations: nextAlloc,
        revisionStage: 'accounting',
        revisionReason: reason.trim(),
        revisionAt: todayISO(),
        revisionById: userId,
        resubmittedAfterRevision: undefined,
        status: invoiceStatusFromAllocations(nextAlloc, { revisionStage: 'accounting' }),
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(
          userId,
          line.isDelegate ? 'Vekaleten revizyon' : 'Revizyona gönder',
          'Dağıtım satırı',
          lineId,
          `${invoice.number} revizyona gönderildi: ${reason.trim()}`,
          { isDelegate: line.isDelegate, principalId: line.originalAssigneeId },
        ),
        notifications: accountingNotes(
          next,
          'Revizyon talebi',
          `${next.number} departman tarafından revizyona gönderildi. Tedarikçi görüşmesi ve düzeltme kararı sizde. Bu kayıt E-LOGO’ya aktarılmamalı.`,
          'revision',
        ),
      })
      return { ok: true, message: 'Satır muhasebeye revizyona gönderildi.' }
    }

    const markWaitingSupplier = (invoiceId: string, note: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (!invoice.allocations.some((a) => a.status === 'revision')) {
        return { ok: false, message: 'Revizyondaki faturalarda tedarikçi düzeltmesi işaretlenebilir.' }
      }
      const next: Invoice = {
        ...invoice,
        revisionStage: 'supplier',
        accountingNote: note.trim() || invoice.accountingNote,
        status: 'Tedarikçi Düzeltmesi Bekleniyor',
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Tedarikçi görüşmesi', 'Fatura', invoice.id, `${invoice.number} tedarikçi düzeltmesi bekleniyor`),
      })
      return { ok: true, message: 'Tedarikçi düzeltmesi bekleniyor olarak işaretlendi. E-LOGO aktarımı kapalı.' }
    }

    const saveAccountingNote = (invoiceId: string, note: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (!note.trim()) return { ok: false, message: 'Muhasebe notu boş olamaz.' }
      dispatch({
        type: 'PATCH_INVOICE',
        id: invoiceId,
        patch: { accountingNote: note.trim() },
        audit: auditOf(userId, 'Muhasebe notu', 'Fatura', invoice.id, note.trim()),
      })
      return { ok: true, message: 'Muhasebe notu kaydedildi.' }
    }

    const uploadCorrectedDocument = (invoiceId: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const base = invoice.document.name.replace(/\.[^.]+$/, '')
      const ext = invoice.document.name.includes('.') ? invoice.document.name.slice(invoice.document.name.lastIndexOf('.')) : '.pdf'
      const nextName = `${base}-duzeltilmis${ext}`
      dispatch({
        type: 'PATCH_INVOICE',
        id: invoiceId,
        patch: {
          document: { ...invoice.document, name: nextName },
          correctedDocumentUploaded: true,
        },
        audit: auditOf(userId, 'Düzeltilmiş belge', 'Fatura', invoice.id, `${invoice.number} belgesi güncellendi: ${nextName}`),
      })
      return { ok: true, message: `Düzeltilmiş belge yüklendi (${nextName}).` }
    }

    const resubmitAfterRevision = (invoiceId: string, note: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const nextAlloc = invoice.allocations.map((a) =>
        a.status === 'revision'
          ? { ...a, status: 'pending' as const, revisionReason: a.revisionReason, revisionAt: undefined }
          : a,
      )
      const next: Invoice = {
        ...invoice,
        allocations: nextAlloc,
        revisionStage: undefined,
        accountingNote: note.trim() || invoice.accountingNote,
        resubmittedAfterRevision: true,
        status: invoiceStatusFromAllocations(nextAlloc, { resubmittedAfterRevision: true }),
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(
          userId,
          'Yeniden onaya gönder',
          'Fatura',
          invoice.id,
          `${invoice.number} revizyon sonrası departmana geri gönderildi`,
        ),
        notifications: assigneeNotes(
          next,
          'Yeniden onay',
          `${next.number} düzeltilerek onayınıza geri gönderildi.`,
          'resubmit',
        ),
      })
      return { ok: true, message: 'Fatura departmana yeniden onaya gönderildi. E-LOGO aktarımı yapılmadı.' }
    }

    const resubmitRejected = (invoiceId: string, lineId: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      const nextAlloc = invoice.allocations.map((a) =>
        a.id === lineId
          ? { ...a, status: 'pending' as const, rejectReason: undefined, rejectedAt: undefined, templateId: undefined }
          : a,
      )
      const next: Invoice = { ...invoice, allocations: nextAlloc, status: invoiceStatusFromAllocations(nextAlloc, invoice) }
      const line = next.allocations.find((a) => a.id === lineId)
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Yeniden onaya gönder', 'Dağıtım satırı', lineId, `${invoice.number} reddedilen satır güncellenerek onaya gönderildi`),
        notifications: line
          ? makeNotes([
              {
                userId: line.assigneeId,
                title: 'Yeniden onay',
                body: `${invoice.number} reddedilen satır tekrar onayınıza düştü.`,
                kind: 'resubmit',
                invoiceId: invoice.id,
              },
            ])
          : undefined,
      })
      return { ok: true, message: 'Satır yeniden onaya gönderildi.' }
    }

    const accountingApprove = (invoiceId: string, userId: string) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (REVISION_BLOCK.includes(invoice.status as (typeof REVISION_BLOCK)[number])) {
        return { ok: false, message: 'Revizyondaki fatura E-LOGO’ya gönderilemez. Önce düzeltip departmana iade edin.' }
      }
      if (invoice.allocations.some((a) => a.status !== 'approved')) {
        return { ok: false, message: 'Tüm dağıtım satırları onaylanmadan muhasebe onayı verilemez.' }
      }
      const next: Invoice = {
        ...invoice,
        status: 'E-LOGO Aktarım Bekliyor',
        accountingReviewedAt: todayISO(),
        accountingReviewerId: userId,
      }
      dispatch({
        type: 'UPDATE_INVOICE',
        invoice: next,
        audit: auditOf(userId, 'Muhasebe son kontrol', 'Fatura', invoice.id, `${invoice.number} muhasebe onayı verildi`),
      })
      return { ok: true, message: 'Muhasebe onayı verildi. E-LOGO aktarımına hazır.' }
    }

    const transferElogo = (invoiceId: string, userId: string, fail = false) => {
      const invoice = getInvoice(invoiceId)
      if (!invoice) return { ok: false, message: 'Fatura bulunamadı' }
      if (REVISION_BLOCK.includes(invoice.status as (typeof REVISION_BLOCK)[number]) || invoice.allocations.some((a) => a.status === 'revision')) {
        return { ok: false, message: 'Revize edilen fatura E-LOGO’ya aktarılamaz.' }
      }
      if (fail) {
        dispatch({
          type: 'PATCH_INVOICE',
          id: invoiceId,
          patch: { status: 'Entegrasyon Hatası', transferError: 'E-LOGO bağlantı hatası (simülasyon).' },
          audit: auditOf(userId, 'E-LOGO aktarım hatası', 'Fatura', invoice.id, 'Aktarım başarısız'),
          notifications: accountingNotes(
            invoice,
            'E-LOGO aktarım hatası',
            `${invoice.number} aktarımı başarısız. Kayıt yeniden denenebilir.`,
            'elogo',
          ),
        })
        return { ok: false, message: 'Aktarım başarısız. Daha sonra yeniden deneyebilirsiniz.' }
      }
      dispatch({
        type: 'PATCH_INVOICE',
        id: invoiceId,
        patch: { status: 'Tamamlandı', transferredAt: todayISO(), transferError: undefined },
        audit: auditOf(userId, 'E-LOGO aktarımı', 'Fatura', invoice.id, `${invoice.number} E-LOGO'ya aktarıldı`),
      })
      return { ok: true, message: 'Fatura E-LOGO\'ya aktarıldı.' }
    }

    const addSupplierMapping = (mapping: Omit<SupplierMapping, 'id'>, userId: string) => {
      const row = { ...mapping, id: uid('sm') }
      dispatch({
        type: 'ADD_SUPPLIER_MAPPING',
        mapping: row,
        audit: auditOf(userId, 'Mapping oluşturma', 'Tedarikçi mapping', row.id, `${row.supplierName} → ${row.processingType}`),
      })
    }
    const addItemMapping = (mapping: Omit<ItemMapping, 'id'>, userId: string) => {
      const row = { ...mapping, id: uid('im') }
      dispatch({
        type: 'ADD_ITEM_MAPPING',
        mapping: row,
        audit: auditOf(userId, 'Mapping oluşturma', 'Kalem mapping', row.id, `${row.sourceItem} → ${row.accountingItem}`),
      })
    }
    const addDeptMapping = (mapping: Omit<DeptMapping, 'id'>, userId: string) => {
      const row = { ...mapping, id: uid('dm') }
      dispatch({
        type: 'ADD_DEPT_MAPPING',
        mapping: row,
        audit: auditOf(userId, 'Mapping oluşturma', 'Departman mapping', row.id, `${row.accountingItem} → ${row.department}`),
      })
    }
    const addTemplate = (template: Omit<Template, 'id'>, userId: string) => {
      const row = { ...template, id: uid('t') }
      dispatch({
        type: 'ADD_TEMPLATE',
        template: row,
        audit: auditOf(userId, 'Şablon oluşturma', 'Muhasebeleştirme şablonu', row.id, row.name),
      })
    }
    const addDelegation = (delegation: Omit<Delegation, 'id' | 'createdAt' | 'status'>, userId: string) => {
      const today = todayISO().slice(0, 10)
      let status: Delegation['status'] = 'scheduled'
      if (delegation.endDate < today) status = 'expired'
      else if (delegation.startDate <= today) status = 'active'
      const row: Delegation = { ...delegation, id: uid('del'), createdAt: todayISO(), createdBy: userId, status }
      const fromName = getUser(row.fromUserId)?.name ?? 'Yönetici'
      const toName = getUser(row.toUserId)?.name ?? 'Vekil'
      dispatch({
        type: 'ADD_DELEGATION',
        delegation: row,
        audit: auditOf(userId, 'Vekalet oluşturma', 'Vekalet', row.id, `${row.department} ${row.startDate} – ${row.endDate}`),
        notifications: makeNotes([
          {
            userId: row.toUserId,
            title: row.status === 'active' ? 'Vekalet başladı' : 'Vekalet planlandı',
            body: `${fromName} / ${row.department} vekaleti ${row.startDate} – ${row.endDate} için size tanımlandı.`,
            kind: 'delegation',
          },
          {
            userId: row.fromUserId,
            title: 'Vekalet tanımlandı',
            body: `${row.department} onaylarınız ${row.endDate} tarihine kadar ${toName} adlı vekile aktarılır.`,
            kind: 'delegation',
          },
        ]),
      })
      if (row.status === 'active' && row.transferPending) {
        const invoices = state.invoices.map((inv) => ({
          ...inv,
          allocations: inv.allocations.map((a) =>
            a.originalAssigneeId === row.fromUserId && a.status === 'pending'
              ? { ...a, assigneeId: row.toUserId, isDelegate: true }
              : a,
          ),
        }))
        invoices.forEach((inv) => {
          const orig = state.invoices.find((i) => i.id === inv.id)
          if (orig && orig !== inv) {
            dispatch({ type: 'UPDATE_INVOICE', invoice: inv })
          }
        })
      }
      return row
    }
    const cancelDelegation = (id: string, userId: string) => {
      const current = state.delegations.find((d) => d.id === id)
      if (!current) return
      const next = { ...current, status: 'cancelled' as const }
      dispatch({
        type: 'UPDATE_DELEGATION',
        delegation: next,
        audit: auditOf(userId, 'Vekalet iptali', 'Vekalet', id, `${current.department} vekaleti iptal edildi`),
        notifications: makeNotes([
          {
            userId: current.toUserId,
            title: 'Vekalet sona erdi',
            body: `${current.department} vekaleti iptal edildi. Yeni görevler asıl yöneticiye düşer.`,
            kind: 'delegation',
          },
          {
            userId: current.fromUserId,
            title: 'Vekalet iptal edildi',
            body: `${current.department} vekaletiniz iptal edildi.`,
            kind: 'delegation',
          },
        ]),
      })
    }

    const markNotificationsRead = (userId: string, ids?: string[]) => {
      dispatch({ type: 'MARK_NOTIFICATIONS', userId, ids })
    }

    return {
      ...state,
      getInvoice,
      createInvoice,
      saveDraft,
      applyMappingAndInclude,
      saveAllocations,
      sendToApproval,
      approveLine,
      saveJiraLink,
      updateLineCodes,
      rejectLine,
      sendToRevision,
      markWaitingSupplier,
      saveAccountingNote,
      uploadCorrectedDocument,
      resubmitAfterRevision,
      resubmitRejected,
      accountingApprove,
      transferElogo,
      addSupplierMapping,
      addItemMapping,
      addDeptMapping,
      addTemplate,
      addDelegation,
      cancelDelegation,
      markNotificationsRead,
    }
  }, [state])

  return createElement(AppContext.Provider, { value }, children)
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('AppProvider missing')
  return ctx
}
