import { createEngine } from './engine.js'
export function createDemo() {
  const e = createEngine()
  for (const key of ['INV-DEMO-FLAG']) { e.submit(key); e.approve(key) }
  const bill = e.generateBill('CONTRACT-1', { includeFee: true, sourceIds: [] })
  e.submit(bill.id); e.approve(bill.id)
  const claim = e.create('reimbursement', { description: '机务现场交通与办公支出', partyId: 'EMP-1', amount: 18500, department: '机务部', date: '2026-10-10' })
  e.submit(claim.id)
  const loan = e.create('loan', { description: '员工差旅备用借款', partyId: 'EMP-1', amount: 100000, date: '2026-10-10' })
  e.submit(loan.id); e.approve(loan.id)
  const asset = e.create('asset', { description: '办公电脑（折旧示例）', partyId: 'VENDOR-1', amount: 360000, date: '2026-10-01', lifeMonths: 36, residual: 0, depreciationStart: '2026-10', location: 'MSTS 办公室', department: '行政部' })
  e.submit(asset.id); e.approve(asset.id)
  const funding = e.create('funding', { description: '运营拨款计划 · 5,000 × 31 天', partyId: 'SHIP-A', vesselId: 'VESSEL-A', amount: 15500000, date: '2026-10-15' })
  e.submit(funding.id)
  e.context.companyId = 'SHIP-B'
  e.submit('INV-DEMO-CROSS'); e.approve('INV-DEMO-CROSS')
  for (const j of e.data.journals) { j.status = 'posted'; j.reviewedBy = '示例初始化'; j.postedBy = '示例初始化' }
  e.data.audit = [{ id: 'INIT', action: '初始化演示账套', entityId: 'DEMO', companyId: 'MSTS', user: '示例初始化', role: '全量演示', at: '2026-10-19T00:00:00Z', detail: '所有船舶、期初、合同及会计参数均为虚构流程示例；真实快照另存。' }]
  return e.data
}
