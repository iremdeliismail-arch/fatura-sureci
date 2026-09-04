import { Select } from '../ui/Field'
import { expenseCodesFor, projectCodesFor } from '../../data/codes'

export function ProjectCodeSelect({
  department,
  value,
  onChange,
  className,
}: {
  department: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const options = projectCodesFor(department, value)
  return (
    <Select className={`font-mono ${className ?? ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Proje kodu seçin</option>
      {options.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </Select>
  )
}

export function ExpenseCodeSelect({
  department,
  value,
  onChange,
  className,
}: {
  department: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const options = expenseCodesFor(department, value)
  return (
    <Select className={`font-mono ${className ?? ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Masraf kodu seçin</option>
      {options.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </Select>
  )
}
