import { reactive } from 'vue'
import seed from '../data/seed.json'

const KEY = 'vmfs-entry'

export const seedData = seed

export const state = reactive({
  entry: sessionStorage.getItem(KEY) || '',
  extras: [],
  invoices: [],
  payments: [],
  receipts: [],
  bank: [],
  cash: [],
  settlements: [],
  funding: [],
  inventory: [],
  paymentStep: 0,
  ctmTransfer: false,
  ctmSpend: false,
  planReceived: false,
  periodNote: '',
})

export function setEntry(id) {
  state.entry = id
  sessionStorage.setItem(KEY, id)
}

export function clearEntry() {
  state.entry = ''
  sessionStorage.removeItem(KEY)
}

let demoNo = 1

function nextId(prefix) {
  const id = `${prefix}-${String(demoNo).padStart(3, '0')}`
  demoNo += 1
  return id
}

export function addExpense(row) {
  const id = nextId('DEMO')
  state.extras.unshift({
    ...row,
    id,
    demo: true,
    sheet: 'Expenses Lists',
    date: seed.asOf,
    source: '原型会话',
  })
  return id
}

export function addCreated(bucket, row) {
  const id = nextId('DEMO')
  state[bucket].unshift({ ...row, id, demo: true, date: row.date || seed.asOf })
  return id
}

export function findRecord(id) {
  return state.extras.find((row) => row.id === id) || seed.records.find((row) => row.id === id)
}

export function expenseRows() {
  return [...state.extras, ...seed.records.filter((row) => row.sheet !== 'Shipmanagement RCVD')]
}

export function invoiceRows() {
  const base = expenseRows().filter((row) => row.sheet === 'Expenses Lists' && row.invoiceUsd !== undefined && row.invoiceUsd !== null)
  return [...state.invoices, ...base]
}

export function paymentRows() {
  const historic = invoiceRows().filter((row) => row.status === 'Completed' && !row.paymentOnly)
  return [...state.payments, ...historic]
}

export function receiptRows() {
  return [...state.receipts, ...seed.records.filter((row) => row.sheet === 'Shipmanagement RCVD')]
}

export function bankRows() {
  return [...state.bank, ...seed.bank].sort((a, b) => (b.sequence || 0) - (a.sequence || 0))
}

export function cashRows() {
  const base = seed.records.filter((row) => row.sheet === 'CTM Expenses List' && row.description)
  return [...state.cash, ...base]
}

export function settlementRows() {
  const base = seed.records.filter((row) => row.ownerStatus)
  return [...state.settlements, ...base]
}
