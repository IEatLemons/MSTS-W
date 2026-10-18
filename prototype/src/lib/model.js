export const ROLES = [
  {
    id: 'clerk',
    name: '业务录入',
    who: '采购与船上人员',
    hint: '从业务录入进入。可以补单、验收和上传凭证。这个原型不限制你接着去看付款或报表。',
    summary: '先处理还没写清状态的费用，以及船上已经发生、单据还没附上的支出。',
    tasks: [
      { title: '补上缺失状态', detail: '总清单里有金额但状态空着的行，先认定业务类型，不要当成零。', to: '/app/expenses?sheet=Expenses%20Lists&status=blank', label: '去费用台账' },
      { title: '核对验收与发票', detail: '订单、收货、发票是三个阶段，金额可以不同，但要能解释。', to: '/app/invoices', label: '去发票' },
      { title: '登记一笔新费用', detail: '只在这次浏览里生效，不会写进 10 月 14 日的快照。', to: '/app/expenses/new', label: '新建费用' },
      { title: '船上消费凭证', detail: '船长现金花出去之后，费用只记一次，补给本身不是费用。', to: '/app/cash', label: '去备用金' },
    ],
  },
  {
    id: 'finance',
    name: '财务审核',
    who: '审核归属、发票与对账',
    hint: '从财务审核进入。先看未平差额和发现项。菜单仍然可以打开全部功能。',
    summary: '快照没有做平。审核要保留差额，逐笔解释，不能自动调账。',
    tasks: [
      { title: '资金还差 2,790.58', detail: '实收减银行、备用金和已完成费用之后的差额，保持未平。', to: '/app/reports', label: '看数据概览' },
      { title: '25 条发现', detail: '公式错误、状态空缺、重复视图和缺证分开列着。', to: '/app/audit', label: '去追溯' },
      { title: '已验收未完成的发票', detail: '旧表 Received 还不是付款完成，也不能当成船东已经回款。', to: '/app/invoices?status=Received', label: '去发票' },
      { title: '银行还没正式核销', detail: '22 条流水都还没有稳定的付款编号。', to: '/app/bank', label: '去银行' },
    ],
  },
  {
    id: 'approver',
    name: '审批人',
    who: '批准付款、拨款与更正',
    hint: '从审批人进入。这里先看到待批的付款示例和还没到账的计划拨款。批准不会锁住其他页面。',
    summary: '批准只说明可以付，银行余额要等出纳登记真实流水之后才变。',
    tasks: [
      { title: '1,000 美元分两次付', detail: '走完订单、到票、两笔付款、船东结算和回款。', to: '/app/payments/example', label: '打开示例' },
      { title: '计划拨款 155,000', detail: '5,000 × 31 天。没到账之前不增加银行，也不算实收。', to: '/app/funding', label: '看资金计划' },
      { title: '待确认事项', detail: '口径还没定的发现，不能直接改已有快照。', to: '/app/audit?class=待确认', label: '去待确认' },
      { title: '付款列表', detail: '历史 Completed 只是旧表状态，还不是逐笔银行核销。', to: '/app/payments', label: '去付款' },
    ],
  },
  {
    id: 'cashier',
    name: '出纳',
    who: '登记支付、收款和现金',
    hint: '从出纳进入。先看银行流水、收款分配和船长现金。你仍然可以打开审核和报表。',
    summary: '银行和船上现金是两本账。补给是账户之间搬家，消费才变成费用。',
    tasks: [
      { title: '22 条银行流水', detail: '最新余额 92,779.85，需要和回单逐笔匹配。', to: '/app/bank', label: '去银行' },
      { title: '收款怎么分到五个池', detail: '毛额、手续费、净额分开。计划拨款不在这里。', to: '/app/receipts', label: '去收款' },
      { title: '船长备用金 29,908', detail: '可以演练补给 1,000 和消费 100，不改历史余额。', to: '/app/cash', label: '去备用金' },
      { title: '登记付款结果', detail: '系统不直连网银。付完以后在这里留下核销。', to: '/app/payments', label: '去付款' },
    ],
  },
  {
    id: 'controller',
    name: '财务负责人',
    who: '看报表、期间和关账',
    hint: '从财务负责人进入。工作台就是这艘船在 2026-10-14 的资金快照。',
    summary: '管理报表可以先看。正式资产负债表还缺确认过的期初和会计政策。',
    tasks: [
      { title: '数据概览', detail: '对照原表第一页，用图表看总收入、银行、备用金和五类费用。', to: '/app/reports', label: '打开概览' },
      { title: '旧 SOFP 兼容视图', detail: '沿用原表结构，权益是倒算的，不当成法定报表。', to: '/app/reports/sofp', label: '看 SOFP' },
      { title: '期间', detail: '从 7 月 15 日开始，仍按自然月结算。首月到 7 月 31 日结一次。', to: '/app/periods', label: '看期间' },
      { title: '费用分类', detail: '船舶五类之外，办公室和人员薪资单独列出，不再加进五类合计。', to: '/app/reports?focus=company', label: '看分类' },
    ],
  },
  {
    id: 'admin',
    name: '管理员',
    who: '主数据、迁移与备份',
    hint: '从管理员进入。先看公司、船舶、科目和迁移遗留。管理员在这个原型里也不能改已记账金额。',
    summary: '主数据把公司和船名固定下来。旧表进系统之前先暂存、再核对。',
    tasks: [
      { title: '公司与船舶', detail: 'Speedy Pioneer 和 PIONEER LAY / LADY 的法定名称还待确认。', to: '/app/master/org', label: '去主数据' },
      { title: '192 条科目', detail: '船管编码和船员细项是两套命名空间。', to: '/app/master/accounts', label: '去科目' },
      { title: '迁移发现', detail: '导入异常留在清单里，不静默改掉。', to: '/app/audit', label: '去追溯' },
      { title: '备份还没跑过', detail: '上线前要有独立备份和一次恢复演练。', to: '/app/ops', label: '去运维' },
    ],
  },
]

export const NAV = [
  { label: '工作台', to: '/app', exact: true },
  {
    group: '基础资料',
    items: [
      { label: '公司与船舶', to: '/app/master/org' },
      { label: '往来方', to: '/app/master/parties' },
      { label: '币种与汇率', to: '/app/master/fx' },
      { label: '费用中心', to: '/app/master/centers' },
      { label: '科目字典', to: '/app/master/accounts' },
    ],
  },
  {
    group: '业务',
    items: [
      { label: '费用台账', to: '/app/expenses' },
      { label: '发票应付', to: '/app/invoices' },
      { label: '付款核销', to: '/app/payments' },
      { label: '收款分配', to: '/app/receipts' },
      { label: '银行对账', to: '/app/bank' },
      { label: '船长备用金', to: '/app/cash' },
      { label: '船东结算', to: '/app/settlements' },
      { label: '资金计划', to: '/app/funding' },
      { label: '库存月结', to: '/app/inventory' },
    ],
  },
  {
    group: '报表与治理',
    items: [
      { label: '数据概览', to: '/app/reports', exact: true },
      { label: '旧 SOFP', to: '/app/reports/sofp' },
      { label: '期间', to: '/app/periods' },
      { label: '追溯与发现', to: '/app/audit' },
      { label: '备份运维', to: '/app/ops' },
    ],
  },
]

export function roleById(id) {
  return ROLES.find((role) => role.id === id) || ROLES[0]
}
