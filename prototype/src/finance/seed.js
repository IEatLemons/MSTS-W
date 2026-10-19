export const CATEGORIES = [
  { id: 'MANAGEMENT', name: '预算内—船舶管理费' },
  { id: 'OWNER', name: '预算外—船东费用' },
  { id: 'TAKEOVER', name: '预算外—交接船费用' },
  { id: 'DRYDOCK', name: '预算外—坞修费用' },
  { id: 'OTHER', name: '预算外—其他' },
]
export const ACCOUNTS = [
  ['1001', '库存现金', 'asset'], ['1002', '银行存款', 'asset'],
  ['1122', '应收账款', 'asset'], ['1221', '其他应收款／代垫往来', 'asset'],
  ['1601', '固定资产', 'asset'], ['1602', '累计折旧', 'contraAsset'],
  ['2202', '应付账款', 'liability'], ['2241', '其他应付款／代管资金', 'liability'],
  ['2221', '应交税费', 'liability'], ['222101', '待确认进项税额', 'asset'],
  ['3001', '示例期初资本', 'equity'], ['3103', '留存损益', 'equity'],
  ['4001', '管理服务收入', 'income'], ['5001', '船舶运营成本', 'expense'],
  ['5601', '银行手续费', 'expense'], ['5602', '管理及办公费用', 'expense'], ['5603', '折旧费用', 'expense'],
].map(([id, name, kind]) => ({ id, name, kind, enabled: true }))
export const ROLES = [
  { id: 'demo', name: '全量演示', user: '演示身份', rights: ['*'], companies: ['MSTS', 'SHIP-A', 'SHIP-B'] },
  { id: 'clerk', name: '制单人员', user: '录入员 林', rights: ['create', 'submit', 'attach'], companies: ['MSTS', 'SHIP-A'] },
  { id: 'reviewer', name: '财务审核', user: '会计 陈', rights: ['review', 'journalReview', 'attach'], companies: ['MSTS', 'SHIP-A', 'SHIP-B'] },
  { id: 'approver', name: '审批人', user: '审批人 周', rights: ['approvePayment'], companies: ['MSTS', 'SHIP-A', 'SHIP-B'] },
  { id: 'cashier', name: '出纳', user: '出纳 黄', rights: ['execute', 'allocate', 'bank', 'attach'], companies: ['MSTS', 'SHIP-A'] },
  { id: 'controller', name: '财务负责人', user: '财务负责人 吴', rights: ['post', 'close', 'journalReview', 'review'], companies: ['MSTS', 'SHIP-A', 'SHIP-B'] },
  { id: 'admin', name: '管理员', user: '管理员 孙', rights: ['master', 'reset'], companies: ['MSTS', 'SHIP-A', 'SHIP-B'] },
]
export const NAV = [
  { id: 'home', name: '工作台', mark: '◈' },
  { id: 'gl', name: '总账', mark: '01', pages: [['journals', '凭证管理'], ['ledger', '总账与明细账'], ['reports', '三大财务报表'], ['periods', '期末与结账']] },
  { id: 'ar', name: '应收款', mark: '02', pages: [['contracts', '合同与管理费'], ['bills', '月度船东账单'], ['receipts', '收款与核销'], ['aging', '应收账龄与对账']] },
  { id: 'ap', name: '应付款', mark: '03', pages: [['invoices', '供应商发票总单'], ['payments', '付款申请与核销'], ['aging', '到期应付与对账']] },
  { id: 'treasury', name: '资金／出纳', mark: '04', pages: [['accounts', '银行与现金账户'], ['movements', '资金收支台账'], ['bank', '流水导入与对账'], ['reconciliation', '银行余额调节表'], ['cash', '船长备用金与划拨'], ['funding', '运营拨款计划'], ['instruments', '申请单与票据']] },
  { id: 'claims', name: '费用报销', mark: '05', pages: [['reimbursements', '员工报销'], ['loans', '员工借还款'], ['departments', '部门费用归集']] },
  { id: 'assets', name: '固定资产', mark: '06', pages: [['register', '资产卡片与台账'], ['depreciation', '折旧与资产处置']] },
  { id: 'tax', name: '发票与税务', mark: '07', pages: [['register', '进销项发票台账'], ['summary', '税额统计与计提']] },
  { id: 'settings', name: '基础档案与权限', mark: '08', pages: [['companies', '公司与账套'], ['organizations', '公司与船舶'], ['parties', '往来方与员工'], ['departments', '部门档案'], ['accounts', '科目与费用编码'], ['policies', '币种与计费政策'], ['permissions', '角色与授权'], ['audit', '操作日志']] },
  { id: 'history', name: '历史资料', mark: '↗', pages: [['snapshot', 'Excel 快照与旧 SOFP'], ['records', '原始业务与发现']] },
]
export function createSeed() {
  const companies = [
    { id: 'MSTS', name: 'MSTS 管理公司（示例）', currency: 'USD', kind: 'management' },
    { id: 'SHIP-A', name: 'BLUE HORIZON 单船公司（示例）', currency: 'USD', kind: 'vessel' },
    { id: 'SHIP-B', name: 'NORTH STAR 单船公司（示例）', currency: 'USD', kind: 'vessel' },
  ]
  const vessels = [
    { id: 'VESSEL-A', name: 'BLUE HORIZON', imo: '示例 A · 非真实 IMO', companyId: 'SHIP-A', ownerId: 'SHIP-A', bank: '示例船东银行 A', start: '2026-07-15' },
    { id: 'VESSEL-B', name: 'NORTH STAR', imo: '示例 B · 非真实 IMO', companyId: 'SHIP-B', ownerId: 'SHIP-B', bank: '示例船东银行 B', start: '2026-08-01' },
  ]
  const parties = [
    ...companies.map(c => ({ id: c.id, name: c.name, kind: c.id === 'MSTS' ? '管理公司' : '船东／客户' })),
    { id: 'VENDOR-1', name: 'Ocean Supply（示例供应商）', kind: '供应商' },
    { id: 'VENDOR-2', name: 'Harbor Services（示例供应商）', kind: '供应商' },
    { id: 'EMP-1', name: '林晓（示例员工）', kind: '员工', department: '机务部' },
    { id: 'EMP-2', name: '周宁（示例员工）', kind: '员工', department: '行政部' },
  ]
  const accounts = companies.flatMap(c => [
    { id: `BANK-${c.id}`, companyId: c.id, vesselId: c.id === 'MSTS' ? '' : `VESSEL-${c.id.slice(-1)}`, name: `${c.id} 美元银行`, currency: 'USD', number: `DEMO-••••-${c.id === 'MSTS' ? '1000' : c.id === 'SHIP-A' ? '2000' : '3000'}`, kind: 'bank', opening: c.id === 'MSTS' ? 20000000 : 10000000 },
    { id: `CASH-${c.id}`, companyId: c.id, vesselId: c.id === 'MSTS' ? '' : `VESSEL-${c.id.slice(-1)}`, name: c.id === 'MSTS' ? 'MSTS 办公现金' : `${c.id} 船长备用金`, currency: 'USD', kind: 'cash', opening: 0 },
  ])
  const journals = companies.map(c => ({
    id: `JV-OPEN-${c.id}`, companyId: c.id, vesselId: '', date: '2026-10-01', period: '2026-10', description: '示例期初余额（非真实公司资金）', status: 'posted', sourceId: `OPEN-${c.id}`, stage: 'opening', createdBy: '初始化', reviewedBy: '初始化',
    lines: [{ account: '1002', debit: accounts.find(a => a.companyId === c.id && a.kind === 'bank').opening, credit: 0, cashFlow: 'opening' }, { account: '3001', debit: 0, credit: accounts.find(a => a.companyId === c.id && a.kind === 'bank').opening }],
  }))
  return {
    version: 3, serial: 100,
    roleGrants: Object.fromEntries(ROLES.map(r => [r.id, { rights: [...r.rights], companies: [...r.companies] }])),
    departments: ['机务部', '海务部', '船员部', '行政部', '财务部'].map((name, i) => ({ id: `DEPT-${i + 1}`, name })),
    companies, vessels, parties, accounts, chart: structuredClone(ACCOUNTS),
    contracts: vessels.map((v, i) => ({ id: `CONTRACT-${i + 1}`, companyId: 'MSTS', vesselId: v.id, partyId: v.companyId, start: v.start, end: '', monthlyFee: i ? 800000 : 1000000, currency: 'USD', rate: '1', prorate: 'actual', status: 'active' })),
    documents: [
      { id: 'INV-DEMO-1000', type: 'invoice', companyId: 'MSTS', vesselId: 'VESSEL-A', partyId: 'VENDOR-1', date: '2026-10-05', expenseMonth: '2026-10', dueDate: '2026-10-25', description: '船东费用 · 备件采购（1,000 美元分两次付款主线）', number: 'OS-DEMO-1000', currency: 'USD', rate: '1', amount: 100000, tax: 0, status: 'draft', createdBy: '录入员 林', department: '机务部', lines: [{ id: 'LINE-1000', description: '主机备件', amount: 100000, category: 'OWNER', costCenter: '船管／备件', claimable: true, claimAmount: 100000, tax: 0 }], attachments: [] },
      { id: 'INV-DEMO-FLAG', type: 'invoice', companyId: 'MSTS', vesselId: 'VESSEL-A', partyId: 'VENDOR-2', date: '2026-10-07', expenseMonth: '2026-10', dueDate: '2026-10-28', description: '换旗文件服务', number: 'HS-DEMO-FLAG', currency: 'USD', rate: '1', amount: 25000, tax: 0, status: 'draft', createdBy: '录入员 林', department: '海务部', lines: [{ id: 'LINE-FLAG', description: '换旗／证书服务', amount: 25000, category: 'OTHER', costCenter: '换旗', claimable: true, claimAmount: 25000, tax: 0 }], attachments: [] },
      { id: 'INV-DEMO-CROSS', type: 'invoice', companyId: 'SHIP-B', vesselId: 'VESSEL-B', partyId: 'VENDOR-2', date: '2026-10-08', expenseMonth: '2026-10', dueDate: '2026-10-29', description: 'B 船检验费 · 可演练 A 船代付', number: 'HS-DEMO-CROSS', currency: 'USD', rate: '1', amount: 260000, tax: 0, status: 'draft', createdBy: '录入员 林', department: '机务部', lines: [{ id: 'LINE-CROSS', description: '检验费', amount: 260000, category: 'OWNER', costCenter: '检验', claimable: false, claimAmount: 0, tax: 0 }], attachments: [] },
    ],
    journals, movements: [], allocations: [], statements: [], matches: [], attachments: [], audit: [],
    periods: Object.fromEntries(companies.map(c => [c.id, { '2026-10': 'open' }])),
    policy: { capitalThreshold: 50000, assetLife: 36, residualPercent: 0, depreciationStart: 'nextMonth', taxRate: '0', currency: 'USD', note: '全部参数仅供流程演示，不代表真实会计政策。' },
  }
}
