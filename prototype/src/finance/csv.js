export function csvText(headers, rows) {
  const safe = v => { let text = String(v ?? ''); if (/^[=+\-@\t\r]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = `'${text}`; return `"${text.replaceAll('"', '""')}"` }
  return '\ufeff' + [headers, ...rows].map(row => row.map(safe).join(',')).join('\r\n')
}
export function exportCsv(name, headers, rows) {
  const csv = csvText(headers, rows)
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a'); link.href = url; link.download = `${name}.csv`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function parseCsv(text) {
  const result = []; let row = []; let cell = ''; let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') { if (quoted && text[i+1] === '"') { cell += '"'; i++ } else quoted = !quoted }
    else if (c === ',' && !quoted) { row.push(cell); cell = '' }
    else if ((c === '\n' || c === '\r') && !quoted) { if (c === '\r' && text[i+1] === '\n') i++; row.push(cell); if (row.some(v => v.trim())) result.push(row); row = []; cell = '' }
    else cell += c
  }
  if (quoted) throw new Error('CSV 引号未闭合')
  row.push(cell); if (row.some(v => v.trim())) result.push(row)
  if (result[0]?.[0]) result[0][0] = result[0][0].replace(/^\ufeff/, '')
  return result
}
