const OFFICE = /办公室|办公租赁|办公费用|办公杂/
const PAYROLL = /工资|薪资/

export function companyKind(row) {
  if (!row) return ''
  if (row.companyKind === 'VESSEL') return ''
  if (row.companyKind) return row.companyKind
  const text = row.description || ''
  const office = OFFICE.test(text)
  const payroll = PAYROLL.test(text)
  if (office && payroll) return 'MIXED'
  if (office) return 'OFFICE'
  if (payroll) return 'PAYROLL'
  return ''
}

export function kindLabel(code) {
  if (code === 'OFFICE') return '办公室'
  if (code === 'PAYROLL') return '人员薪资'
  if (code === 'MIXED') return '办公室 + 薪资'
  return '船舶费用'
}

export function matchesKind(row, filter) {
  if (!filter || filter === 'all') return true
  const kind = companyKind(row)
  if (filter === 'VESSEL') return !kind
  if (filter === 'OFFICE') return kind === 'OFFICE' || kind === 'MIXED'
  if (filter === 'PAYROLL') return kind === 'PAYROLL' || kind === 'MIXED'
  return kind === filter
}

export function companyLedger(rows) {
  return rows.filter((row) => (row.sheet === 'Expenses Lists' || row.demo) && companyKind(row))
}
