export const linkExpenses = [
  {
    id: 'REL-1',
    description: '关系示例：备件',
    supplier: '示例供应商',
    sheet: 'Expenses Lists',
    center: 'SHIPMANAGEMENT',
    date: '2026-10-14',
    poUsd: 1000,
    grnUsd: 1000,
    invoiceUsd: 1000,
    status: '部分支付',
    relation: true,
  },
  {
    id: 'REL-2',
    description: '关系示例：运费',
    supplier: '示例供应商',
    sheet: 'Expenses Lists',
    center: 'SHIPMANAGEMENT',
    date: '2026-10-14',
    poUsd: 800,
    grnUsd: 800,
    invoiceUsd: 800,
    status: '部分支付',
    relation: true,
  },
]

export const linkInvoices = [
  {
    id: 'INV-A',
    supplier: '示例供应商',
    amount: 1300,
    date: '2026-10-14',
    note: '备件的两笔款项，加上运费的一笔，公用这张发票。',
  },
  {
    id: 'INV-B',
    supplier: '示例供应商',
    amount: 500,
    date: '2026-10-14',
    note: '只覆盖运费的第二笔款项。',
  },
]

export const linkItems = [
  { id: 'K1', expenseId: 'REL-1', invoiceId: 'INV-A', amount: 400, fee: 20, status: '已付' },
  { id: 'K2', expenseId: 'REL-1', invoiceId: 'INV-A', amount: 600, fee: 0, status: '已付' },
  { id: 'K3', expenseId: 'REL-2', invoiceId: 'INV-A', amount: 300, fee: 0, status: '已付' },
  { id: 'K4', expenseId: 'REL-2', invoiceId: 'INV-B', amount: 500, fee: 0, status: '未付' },
]

export function linkedExpense(id) {
  return linkExpenses.find((row) => row.id === id)
}

export function sharesOf(invoiceId) {
  return linkItems.filter((item) => item.invoiceId === invoiceId)
}

function snapshotStatus(status) {
  if (status === 'Completed') return '已付'
  if (status === 'Accrual') return '应计'
  return '未付'
}

export function relationsOfExpense(row) {
  if (!row) return { snapshot: false, items: [], invoices: [] }
  if (row.relation) {
    const items = linkItems.filter((item) => item.expenseId === row.id)
    const invoices = [...new Set(items.map((item) => item.invoiceId))].map((id) => linkInvoices.find((invoice) => invoice.id === id))
    return { snapshot: false, items, invoices }
  }
  if (row.invoiceUsd == null) return { snapshot: true, items: [], invoices: [] }
  const invoice = {
    id: `INV-${row.id}`,
    supplier: row.supplier,
    amount: Number(row.invoiceUsd),
    date: row.invoiceDate || row.date,
    snapshot: true,
    note: '快照把发票金额写在费用行上，还没有独立发票编号。',
  }
  const item = {
    id: `K-${row.id}`,
    expenseId: row.id,
    invoiceId: invoice.id,
    amount: Number(row.invoiceUsd),
    fee: Number(row.fee) || 0,
    status: snapshotStatus(row.status),
  }
  return { snapshot: true, items: [item], invoices: [invoice] }
}

export function relationsOfInvoice(id, findRecord) {
  const example = linkInvoices.find((invoice) => invoice.id === id)
  if (example) {
    const items = sharesOf(id)
    const expenses = [...new Set(items.map((item) => item.expenseId))].map((expenseId) => linkedExpense(expenseId))
    return { invoice: example, items, expenses, snapshot: false }
  }
  if (!id.startsWith('INV-')) return null
  const row = findRecord(id.slice(4))
  if (!row || row.invoiceUsd == null) return null
  const relations = relationsOfExpense(row)
  return { invoice: relations.invoices[0], items: relations.items, expenses: [row], snapshot: true }
}
