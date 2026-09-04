import { PROCESS_STEPS, processStepIndex } from '../../lib/status'
import type { InvoiceStatus } from '../../types'

export function ProcessStepper({ status }: { status: InvoiceStatus }) {
  const idx = processStepIndex(status)
  const failed = status === 'Entegrasyon Hatası' || status === 'Kısmi Red'
  const revision = status === 'Revizyonda' || status === 'Tedarikçi Düzeltmesi Bekleniyor'
  return (
    <ol className="grid grid-cols-2 gap-2 md:grid-cols-6">
      {PROCESS_STEPS.map((step, i) => {
        const done = i < idx
        const current = i === idx || (idx >= PROCESS_STEPS.length && i === PROCESS_STEPS.length - 1)
        return (
          <li
            key={step}
            className={`rounded-xl border px-3 py-2 text-xs font-medium ${
              done
                ? 'border-teal-200 bg-teal-50 text-teal-800'
                : current
                  ? failed
                    ? 'border-rose-200 bg-rose-50 text-rose-800'
                    : revision
                      ? 'border-orange-200 bg-orange-50 text-orange-800'
                      : 'border-navy-200 bg-navy-50 text-navy-800'
                  : 'border-ink-100 bg-white text-ink-500'
            }`}
          >
            <span className="mb-1 block text-[10px] uppercase tracking-wide opacity-70">Adım {i + 1}</span>
            {step}
          </li>
        )
      })}
    </ol>
  )
}
