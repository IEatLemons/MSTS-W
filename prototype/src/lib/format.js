const SHEETS = {
  'Expenses Lists': '费用总清单',
  'Shipmanagement Cost': '船管费用',
  'Owner Cost': '船东费用',
  'Take-Over Cost': '接船费用',
  'BMA Flag Change': '换旗费用',
  'CTM Expenses List': '船长备用金',
  'Shipmanagement RCVD': '收款',
}

export function sheetLabel(sheet) {
  return SHEETS[sheet] || sheet || '—'
}

export function money(n, digits = 2) {
  if (n === null || n === undefined || n === '') return '—'
  const v = Number(n)
  if (Number.isNaN(v)) return String(n)
  return v.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function precise(n) {
  if (n === null || n === undefined || n === '') return '—'
  const v = Number(n)
  if (Number.isNaN(v)) return String(n)
  return v.toLocaleString('en-US', { maximumFractionDigits: 12 })
}

export function signedMoney(n) {
  if (n === null || n === undefined || n === '') return '—'
  const v = Number(n)
  if (Number.isNaN(v)) return String(n)
  const body = money(Math.abs(v))
  if (v > 0) return `+${body}`
  if (v < 0) return `−${body}`
  return body
}

export function statusText(status) {
  return status || '未填'
}
