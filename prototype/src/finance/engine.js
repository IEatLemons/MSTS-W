import { createSeed, ROLES, CATEGORIES } from './seed.js'
import { convert, sum } from './money.js'

export const TYPES = { invoice: '供应商发票', bill: '船东账单', payment: '付款申请', receipt: '收款单', reimbursement: '员工报销', loan: '员工借款', loanReturn: '员工还款', asset: '固定资产', transfer: '内部划拨', cashSpend: '现金消费', funding: '运营拨款计划', instrument: '申请单／票据' }
export const STATUS = { draft: '草稿', submitted: '待审核', approved: '已审核', executed: '已执行', void: '已作废', posted: '已过账', reversed: '已冲销', closed: '已结账', open: '未结账', active: '使用中', disposed: '已报废' }
const requireThat = (condition, message) => { if (!condition) throw new Error(message) }
const clone = value => JSON.parse(JSON.stringify(value))
const line = (account, debit = 0, credit = 0, extra = {}) => ({ account, debit, credit, ...extra })
const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date

export function createEngine(data = createSeed(), context = { companyId: 'MSTS', vesselId: '', period: '2026-10', roleId: 'demo' }) {
  const api = { data, context }
  function role() {
    const base = ROLES.find(r => r.id === context.roleId) || ROLES[0]
    return { ...base, ...(data.roleGrants?.[base.id] || {}), ...(base.id === 'demo' ? { companies: data.companies.map(c => c.id) } : {}) }
  }
  function access(right, companyId = context.companyId) {
    return role().companies.includes(companyId) && (role().rights.includes('*') || role().rights.includes(right))
  }
  function check(right, companyId = context.companyId) { requireThat(access(right, companyId), '当前角色没有此操作或账套权限，请切换授权角色') }
  function open(companyId, date = `${context.period}-01`) {
    requireThat(validDate(date), '请输入有效业务日期')
    requireThat(data.periods[companyId]?.[date.slice(0, 7)] !== 'closed', '该会计期间已结账，请先按权限反结账')
    const closed = Object.entries(data.periods[companyId] || {}).filter(([,s]) => s === 'closed').map(([p]) => p).sort().at(-1)
    requireThat(!closed || date.slice(0, 7) > closed, '不能在已结期间之前插入业务')
  }
  const id = prefix => `${prefix}-${++data.serial}`
  function audit(action, entityId, companyId, detail = '') {
    data.audit.unshift({ id: id('LOG'), action, entityId, companyId, user: role().user, role: role().name, at: new Date().toISOString(), detail })
  }
  function doc(docId) { const result = data.documents.find(d => d.id === docId); requireThat(result, '找不到单据'); return result }
  function bank(accountId) { const a = data.accounts.find(x => x.id === accountId); requireThat(a, '账户不存在'); return a }
  function scoped(rows, { allPeriods = false, companyId = context.companyId, vesselId = context.vesselId } = {}) {
    if (!role().companies.includes(companyId)) return []
    return rows.filter(r => r.companyId === companyId && (!vesselId || r.vesselId === vesselId) && (allPeriods || !r.date || r.date.slice(0, 7) === context.period))
  }
  function outstanding(document, asOf = '9999-12-31') {
    if (document.status === 'void' || !['approved', 'executed'].includes(document.status)) return 0
    const paid = sum(data.allocations.filter(a => a.docId === document.id && !a.reversed && a.date <= asOf))
    return Math.max(0, document.amount - paid)
  }
  function balance(accountId, asOf = '9999-12-31') {
    const a = bank(accountId)
    return a.opening + sum(data.movements.filter(m => m.accountId === a.id && m.date <= asOf), 'signedAmount')
  }
  function journal(companyId, sourceId, stage, description, lines, date, vesselId = '') {
    const existing = data.journals.find(j => j.companyId === companyId && j.sourceId === sourceId && j.stage === stage && j.status !== 'void')
    if (existing) return existing
    open(companyId, date)
    requireThat(sum(lines, 'debit') === sum(lines, 'credit'), '凭证借贷不平衡')
    const result = { id: id('JV'), companyId, sourceId, stage, description, lines, date, vesselId, period: date.slice(0, 7), status: 'draft', createdBy: role().user }
    data.journals.push(result)
    return result
  }
  function movement(source, accountId, signedAmount, category = 'operating', suffix = '') {
    const existing = data.movements.find(m => m.sourceId === source.id && m.suffix === suffix)
    if (existing) return existing
    const a = bank(accountId)
    const m = { id: id('MOV'), sourceId: source.id, suffix, accountId, companyId: a.companyId, vesselId: source.vesselId || a.vesselId, date: source.date, currency: a.currency, signedAmount, description: source.description, cashFlow: category }
    data.movements.push(m)
    return m
  }
  function vesselCompany(vesselId) { return data.vessels.find(v => v.id === vesselId)?.companyId }
  function currentDocument(docId, right, currentPeriod = false) {
    const d = doc(docId)
    requireThat(d.companyId === context.companyId, '请切换到单据所属账套操作')
    check(right, d.companyId)
    open(d.companyId, currentPeriod ? `${context.period}-28` : d.date)
    return d
  }
  function atomic(fn) {
    const before = clone(data)
    try { return fn() } catch (error) { Object.keys(data).forEach(k => delete data[k]); Object.assign(data, before); throw error }
  }
  function create(type, input) {
    return atomic(() => {
      check('create')
      requireThat(TYPES[type], '不支持的单据类型')
      const companyId = context.companyId
      const date = input.date || `${context.period}-15`
      open(companyId, date)
      const vesselId = input.vesselId || ''
      requireThat(!vesselId || data.vessels.some(v => v.id === vesselId), '请选择有效船舶')
      requireThat(companyId === 'MSTS' || vesselCompany(vesselId) === companyId || (type === 'payment' && input.crossCompanyId), '船舶不属于当前单船公司')
      requireThat(String(input.description || '').trim(), '请填写业务摘要')
      const amount = Number(input.amount)
      requireThat(Number.isSafeInteger(amount) && amount > 0, '金额必须大于零，且以最小货币单位保存')
      requireThat(['USD', 'CNY', 'HKD', 'EUR'].includes(input.currency || 'USD'), '请选择有效币种')
      const currency = input.currency || 'USD'
      const rate = String(input.rate || '1')
      convert(amount, rate)
      requireThat(currency !== 'USD' || rate === '1', 'USD 本位币汇率必须为 1')
      if (['invoice', 'reimbursement'].includes(type)) {
        requireThat(data.parties.some(p => p.id === input.partyId), '请选择供应商或员工')
        if (type === 'invoice') {
          requireThat(String(input.number || '').trim(), '请填写真实示例发票编号')
          requireThat(!data.documents.some(d => d.type === 'invoice' && d.companyId === companyId && d.partyId === input.partyId && d.number === input.number && d.status !== 'void'), '该主体、供应商和发票号已存在')
        }
      }
      const tax = Number(input.tax || 0)
      requireThat(Number.isSafeInteger(tax) && tax >= 0 && tax <= amount, '税额应在零与含税总额之间')
      if (type === 'receipt' && input.purposeAllocations?.length) {
        requireThat(input.purposeAllocations.every(a => CATEGORIES.some(c => c.id === a.category) && Number.isSafeInteger(a.amount) && a.amount >= 0), '请选择有效资金用途及金额')
        requireThat(sum(input.purposeAllocations) <= amount - Number(input.fee || 0), '资金用途分配不能超过净到账额；用途分配不自动冲减应收')
      }
      let lines = input.lines?.length ? clone(input.lines) : [{ description: input.description, amount, category: input.category || 'OWNER', costCenter: input.costCenter || '办公', claimable: Boolean(input.claimable), claimAmount: input.claimable ? amount : 0, tax }]
      requireThat(sum(lines) === amount, '明细合计必须等于单据总额')
      requireThat(sum(lines, 'tax') === tax, '各行税额合计必须等于单据税额')
      lines = lines.map(l => {
        requireThat(Number.isSafeInteger(l.amount) && l.amount > 0, '发票明细金额须大于零')
        requireThat(CATEGORIES.some(c => c.id === l.category), '请选择有效收费分类')
        requireThat(Number(l.claimAmount || 0) >= 0 && Number(l.claimAmount || 0) <= l.amount, '可收金额不得超过本行含税金额')
        requireThat(!l.claimable || (companyId === 'MSTS' && vesselId), '向船东收取的代垫原票应由 MSTS 承担应付并指定受益船')
        requireThat(!l.claimable || l.category !== 'MANAGEMENT', '固定管理费由合同生成，不能用实际成本替代')
        return { ...l, id: id('LINE') }
      })
      const result = { ...clone(input), id: id(type.toUpperCase()), type, companyId, vesselId, date, expenseMonth: input.expenseMonth || date.slice(0, 7), amount, tax, currency, rate, lines, status: 'draft', createdBy: role().user, attachments: [] }
      if (input.dueDate) requireThat(validDate(input.dueDate), '到期日格式错误')
      data.documents.push(result)
      audit('新建', result.id, companyId)
      return result
    })
  }
  function submit(docId) {
    const d = currentDocument(docId, 'submit')
    requireThat(d.status === 'draft', '仅草稿可以提交')
    d.status = 'submitted'
    audit('提交审核', d.id, d.companyId)
  }
  function approve(docId) {
    return atomic(() => {
      const source = doc(docId)
      const right = ['payment', 'loan', 'transfer', 'instrument'].includes(source.type) ? 'approvePayment' : 'review'
      const d = currentDocument(docId, right)
      requireThat(d.status === 'submitted', '请先提交审核，已审核单据不能重复审核')
      requireThat(context.roleId === 'demo' || d.createdBy !== role().user, '制单人与审核人必须分离')
      const base = convert(d.amount, d.rate)
      const asset = d.type === 'asset'
      if (asset) {
        requireThat(base >= data.policy.capitalThreshold, '未达到示例资本化门槛，请作为费用报销或供应商费用录入')
        requireThat(Number.isInteger(d.lifeMonths) && d.lifeMonths > 0, '折旧年限必须为正整数月')
        requireThat(Number.isSafeInteger(d.residual || 0) && (d.residual || 0) >= 0 && (d.residual || 0) < base, '残值必须小于资产本位币原值')
        d.assetStatus = 'active'
        d.depreciationStart = d.depreciationStart || '2026-10'
      }
      if (['invoice', 'reimbursement', 'asset'].includes(d.type)) {
        const debitLines = []
        let debitTotal = 0
        for (const [index, item] of d.lines.entries()) {
          const total = index === d.lines.length - 1 ? base - debitTotal : convert(item.amount, d.rate)
          debitTotal += total
          const recoverable = item.claimable ? convert(item.claimAmount, d.rate) : 0
          const vat = item.claimable ? 0 : convert(item.tax || 0, d.rate)
          if (recoverable) debitLines.push(line('1221', recoverable, 0, { partyId: vesselCompany(d.vesselId) }))
          const expense = total - recoverable - vat
          if (expense) debitLines.push(line(asset ? '1601' : d.vesselId ? '5001' : '5602', expense, 0, { department: d.department, vesselId: d.vesselId }))
          if (vat) debitLines.push(line('222101', vat))
        }
        journal(d.companyId, d.id, 'recognition', `${TYPES[d.type]}：${d.description}`, [...debitLines, line('2202', 0, base, { partyId: d.partyId })], d.date, d.vesselId)
        const claim = sum(d.lines.filter(l => l.claimable), 'claimAmount')
        if (claim) {
          const beneficiary = vesselCompany(d.vesselId)
          journal(beneficiary, d.id, 'beneficiaryCost', `MSTS 承担应付：${d.description}`, [line('5001', convert(claim, d.rate), 0, { department: d.department }), line('2241', 0, convert(claim, d.rate), { partyId: 'MSTS' })], d.date, d.vesselId)
        }
      }
      if (d.type === 'bill') {
        requireThat(d.lines.length, '账单没有可收明细')
        const fee = sum(d.lines.filter(l => l.category === 'MANAGEMENT'))
        const reimburse = d.amount - fee
        journal(d.companyId, d.id, 'billing', `船东账单：${d.description}`, [line('1122', base, 0, { partyId: d.partyId }), ...(fee ? [line('4001', 0, convert(fee, d.rate))] : []), ...(reimburse ? [line('1221', 0, base - convert(fee, d.rate), { partyId: d.partyId })] : [])], d.date, d.vesselId)
        const counterpart = [ ...(fee ? [line('5001', convert(fee, d.rate))] : []), ...(reimburse ? [line('2241', base - convert(fee, d.rate), 0, { partyId: 'MSTS' })] : []), line('2202', 0, base, { partyId: 'MSTS' }) ]
        journal(d.partyId, d.id, 'counterpartBill', `MSTS 月度账单：${d.description}`, counterpart, d.date, d.vesselId)
        if (!data.documents.some(x => x.sourceId === d.id && x.mirror)) {
          data.documents.push({ ...clone(d), id: id('AP-MIRROR'), type: 'invoice', companyId: d.partyId, partyId: 'MSTS', sourceId: d.id, mirror: true, status: 'approved', number: d.id, description: `MSTS 账单：${d.description}`, lines: d.lines.map(l => ({ ...l, claimable: false, claimAmount: 0 })) })
        }
      }
      d.status = 'approved'
      d.reviewedBy = role().user
      audit('审核通过', d.id, d.companyId, '凭证保留草稿，需另行审核过账')
      return d
    })
  }
  function reject(docId, reason) {
    const d = currentDocument(docId, 'review')
    requireThat(d.status === 'submitted' && String(reason).trim(), '仅待审核单据可退回，且需填写原因')
    d.status = 'draft'
    audit('退回', d.id, d.companyId, reason)
  }
  function voidDocument(docId, reason = '原型作废') {
    const d = currentDocument(docId, 'create')
    requireThat(['draft', 'submitted'].includes(d.status), '仅未审核单据可作废；已确认业务应通过冲销更正')
    requireThat(!d.mirror, '跨账套关联单据不能独立作废')
    d.status = 'void'
    audit('作废', d.id, d.companyId, reason)
  }
  function generateBill(contractId, { includeFee = true, sourceIds, period = context.period } = {}) {
    return atomic(() => {
      check('create', 'MSTS')
      requireThat(context.companyId === 'MSTS', '月度船东账单在 MSTS 账套生成')
      const c = data.contracts.find(c => c.id === contractId)
      requireThat(c && c.status === 'active', '合同不可用')
      const from = `${period}-01`
      const end = new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).toISOString().slice(0, 10)
      requireThat(c.start <= end && (!c.end || c.end >= from), '合同在该期间未生效')
      open('MSTS', end)
      open(c.partyId, end)
      const lines = []
      if (includeFee) {
        const duplicate = data.documents.some(d => d.type === 'bill' && d.status !== 'void' && d.vesselId === c.vesselId && d.period === period && d.lines.some(l => l.category === 'MANAGEMENT'))
        requireThat(!duplicate, '该船该月已存在固定管理费账单，可关闭固定费后生成补充账单')
        const days = Number(end.slice(8))
        const activeFrom = c.start > from ? c.start : from
        const activeTo = c.end && c.end < end ? c.end : end
        const activeDays = Math.round((Date.parse(activeTo) - Date.parse(activeFrom)) / 86400000) + 1
        const amount = c.prorate === 'actual' ? Math.round(c.monthlyFee * activeDays / days) : c.monthlyFee
        lines.push({ id: id('BILL-LINE'), description: `${period} 固定管理服务费${activeDays !== days ? `（${activeDays}/${days} 天）` : ''}`, amount, category: 'MANAGEMENT', costCenter: '管理服务', sourceId: c.id, expenseMonth: period })
      }
      const used = new Set(data.documents.filter(d => d.type === 'bill' && d.status !== 'void').flatMap(d => d.lines.map(l => l.sourceLineId).filter(Boolean)))
      for (const source of data.documents.filter(d => d.type === 'invoice' && d.companyId === 'MSTS' && d.vesselId === c.vesselId && d.status === 'approved' && d.expenseMonth <= period && !d.mirror && (!sourceIds || sourceIds.includes(d.id)))) {
        for (const item of source.lines.filter(l => l.claimable && l.claimAmount > 0 && !used.has(l.id))) {
          lines.push({ id: id('BILL-LINE'), description: item.description, amount: convert(item.claimAmount, source.rate), originalAmount: item.claimAmount, originalCurrency: source.currency, category: item.category, costCenter: item.costCenter, sourceId: source.id, sourceLineId: item.id, expenseMonth: source.expenseMonth })
          used.add(item.id)
        }
      }
      requireThat(lines.length, '本期没有未出账的可收费用')
      const result = { id: id('BILL'), type: 'bill', companyId: 'MSTS', vesselId: c.vesselId, partyId: c.partyId, contractId: c.id, period, date: end, dueDate: `${period === '2026-12' ? '2027-01' : new Date(Date.UTC(Number(period.slice(0,4)), Number(period.slice(5,7)), 15)).toISOString().slice(0,7)}-15`, description: `${period} ${data.vessels.find(v => v.id === c.vesselId).name} ${includeFee ? '月度' : '补充'}账单`, currency: c.currency, rate: c.rate, amount: sum(lines), tax: 0, lines, status: 'draft', createdBy: role().user, attachments: [] }
      data.documents.push(result)
      audit('生成船东账单', result.id, 'MSTS', '保留费用所属月；支付状态不影响符合合同的到票费用出账')
      return result
    })
  }
  function validateAllocations(source, allocations, types, maxAmount = source.amount) {
    requireThat(allocations.length, '请至少选择一笔待核销单据')
    const seen = new Set()
    for (const a of allocations) {
      const target = doc(a.docId)
      requireThat(!seen.has(a.docId), '同一单据不能重复出现在本次核销中')
      seen.add(a.docId)
      requireThat(types.includes(target.type) && ['approved', 'executed'].includes(target.status), '只能核销已审核的有效单据')
      requireThat(Number.isSafeInteger(a.amount) && a.amount > 0 && a.amount <= outstanding(target), '核销金额不得超过待收／待付余额')
      requireThat(target.currency === source.currency, '核销币种必须一致，跨币种请先换汇')
      requireThat(target.partyId === source.partyId, '核销单据往来方不一致')
      requireThat(target.vesselId === source.vesselId || !source.vesselId, '核销单据受益船不一致')
      requireThat(target.date <= source.date, '收付款日期不能早于被核销单据日期')
    }
    requireThat(sum(allocations) <= maxAmount, '分配金额超过本次可核销金额')
  }
  function execute(docId, options = {}) {
    return atomic(() => {
      const d = currentDocument(docId, 'execute', true)
      requireThat(d.status === 'approved', '必须先审核／审批，且不能重复执行')
      const documentDate = d.date
      const executionDate = options.date || (d.date.slice(0, 7) === context.period ? d.date : `${context.period}-15`)
      open(d.companyId, executionDate)
      d.date = executionDate
      const account = bank(options.accountId || d.accountId || `BANK-${d.companyId}`)
      requireThat(account.companyId === d.companyId && account.currency === d.currency, '资金账户必须属于当前付款主体，且币种一致')
      const fee = Number(options.fee ?? d.fee ?? 0)
      requireThat(Number.isSafeInteger(fee) && fee >= 0, '手续费不能为负数')
      const base = convert(d.amount, d.rate)
      const feeBase = convert(fee, d.rate)
      let jlines
      const allocs = clone(options.allocations || d.allocations || [])
      if (d.type === 'payment') {
        if (allocs.length) validateAllocations(d, allocs, ['invoice', 'reimbursement', 'asset'])
        if (d.instrumentId) {
          const instrument = doc(d.instrumentId)
          requireThat(instrument.type === 'instrument' && instrument.companyId === d.companyId && instrument.status === 'approved' && instrument.amount >= d.amount, '票据未批准、已兑付或支付额超过票面金额')
        }
        const targetCompanies = new Set(allocs.map(a => doc(a.docId).companyId))
        requireThat(targetCompanies.size <= 1, '一次付款的核销单据须属于同一应付账套')
        const targetCompany = [...targetCompanies][0] || d.companyId
        check('execute', targetCompany)
        open(targetCompany, d.date)
        const allocatedBase = convert(sum(allocs), d.rate)
        const investing = convert(sum(allocs.filter(a => doc(a.docId).type === 'asset')), d.rate)
        const operating = base + feeBase - investing
        const cashCode = account.kind === 'cash' ? '1001' : '1002'
        jlines = [...(allocatedBase ? [line(targetCompany === d.companyId ? '2202' : '1221', allocatedBase, 0, { partyId: targetCompany === d.companyId ? d.partyId : targetCompany })] : []), ...(d.amount > sum(allocs) ? [line('1221', base - allocatedBase, 0, { partyId: d.partyId, advance: true })] : []), ...(fee ? [line('5601', feeBase)] : []), ...(investing ? [line(cashCode, 0, investing, { cashFlow: 'investing' })] : []), ...(operating ? [line(cashCode, 0, operating, { cashFlow: 'operating' })] : [])]
        if (targetCompany !== d.companyId) {
          journal(targetCompany, d.id, 'crossPayment', `跨主体代付：${d.description}`, [line('2202', allocatedBase, 0, { partyId: d.partyId }), line('2241', 0, allocatedBase, { partyId: d.companyId })], d.date, d.vesselId)
        }
        // A service bill paid by the single-ship company settles MSTS receivable too.
        for (const a of allocs) {
          const target = doc(a.docId)
          if (target.mirror) {
            requireThat(target.companyId === d.companyId, '镜像账单应由对应单船公司付款')
            const original = doc(target.sourceId)
            data.allocations.push({ id: id('ALLOC'), sourceId: d.id, docId: original.id, amount: a.amount, date: d.date, companyId: 'MSTS', mirrored: true })
            const incoming = { ...d, id: `${d.id}-COUNTERPART`, companyId: 'MSTS' }
            movement(incoming, 'BANK-MSTS', a.amount, 'operating', 'counterpart')
            journal('MSTS', d.id, 'counterpartReceipt', `单船公司支付：${target.description}`, [line('1002', convert(a.amount, d.rate), 0, { cashFlow: 'operating' }), line('1122', 0, convert(a.amount, d.rate), { partyId: d.companyId })], d.date, d.vesselId)
          }
        }
      } else if (d.type === 'receipt') {
        if (allocs.length) validateAllocations(d, allocs, ['bill'])
        const allocated = sum(allocs)
        requireThat(allocs.every(a => doc(a.docId).companyId === d.companyId), '只能核销当前账套的应收')
        requireThat(fee <= d.amount, '收款手续费不得超过毛额')
        jlines = [line(account.kind === 'cash' ? '1001' : '1002', base - feeBase, 0, { cashFlow: 'operating' }), ...(fee ? [line('5601', feeBase)] : []), ...(allocated ? [line('1122', 0, convert(allocated, d.rate), { partyId: d.partyId })] : []), ...(d.amount > allocated ? [line('2241', 0, base - convert(allocated, d.rate), { partyId: d.partyId, advance: true })] : [])]
        // Mirror only the receipt allocated to an actual single-ship bill.
        for (const a of allocs) {
          const original = doc(a.docId)
          const mirror = data.documents.find(x => x.mirror && x.sourceId === original.id)
          if (mirror) {
            open(mirror.companyId, d.date)
            requireThat(balance(`BANK-${mirror.companyId}`, d.date) >= a.amount, '示例船东账户余额不足，不能同步模拟付款')
            data.allocations.push({ id: id('ALLOC'), sourceId: d.id, docId: mirror.id, amount: a.amount, date: d.date, companyId: mirror.companyId, mirrored: true })
            movement({ ...d, id: `${d.id}-${mirror.companyId}`, companyId: mirror.companyId }, `BANK-${mirror.companyId}`, -a.amount, 'operating', mirror.id)
            journal(mirror.companyId, d.id, `counterpartPayment-${mirror.id}`, `支付 MSTS 账单：${original.id}`, [line('2202', convert(a.amount, d.rate), 0, { partyId: 'MSTS' }), line('1002', 0, convert(a.amount, d.rate), { cashFlow: 'operating' })], d.date, d.vesselId)
          }
        }
        const advance = d.amount - allocated
        if (advance && d.companyId === 'MSTS' && data.companies.some(c => c.id === d.partyId)) {
          open(d.partyId, d.date)
          requireThat(d.currency === 'USD', '跨账套预收示例使用 USD')
          requireThat(balance(`BANK-${d.partyId}`, d.date) >= advance, '示例船东账户余额不足')
          movement({ ...d, id: `${d.id}-ADVANCE` }, `BANK-${d.partyId}`, -advance, 'operating', 'advance')
          journal(d.partyId, d.id, 'counterpartAdvance', '预付 MSTS 款项', [line('1221', convert(advance, d.rate), 0, { partyId: 'MSTS' }), line('1002', 0, convert(advance, d.rate), { cashFlow: 'operating' })], d.date, d.vesselId)
        }
      } else if (d.type === 'loan') {
        jlines = [line('1221', base, 0, { partyId: d.partyId }), line('1002', 0, base, { cashFlow: 'operating' })]
      } else if (d.type === 'loanReturn') {
        const loan = doc(d.loanId)
        requireThat(loan.type === 'loan' && loan.companyId === d.companyId && loan.partyId === d.partyId && loan.currency === d.currency, '借款主体、员工或币种不一致')
        requireThat(d.amount <= loanBalance(loan.id), '还款超过未冲借款')
        jlines = [line('1002', base, 0, { cashFlow: 'operating' }), line('1221', 0, base, { partyId: d.partyId })]
      } else if (d.type === 'cashSpend') {
        requireThat(account.kind === 'cash', '船上消费请选择现金账户')
        jlines = [line(d.vesselId ? '5001' : '5602', base, 0, { department: d.department }), line('1001', 0, base, { cashFlow: 'operating' })]
      } else if (d.type === 'transfer') {
        const target = bank(d.targetAccountId)
        requireThat(target.id !== account.id && target.companyId === d.companyId && target.currency === d.currency, '内部划拨须同主体同币种且账户不同')
        movement(d, target.id, d.amount, 'internal', 'in')
        jlines = [line(target.kind === 'cash' ? '1001' : '1002', base, 0, { cashFlow: 'internal' }), line(account.kind === 'cash' ? '1001' : '1002', 0, base, { cashFlow: 'internal' })]
      } else if (d.type === 'funding') {
        requireThat(d.currency === 'USD', '当前拨款示例按 USD 演示')
        jlines = [line('1002', base, 0, { cashFlow: 'financing' }), line('2241', 0, base, { partyId: d.partyId })]
      } else throw new Error('此单据不通过资金执行，请使用对应业务操作')
      const outgoing = ['payment', 'loan', 'cashSpend', 'transfer'].includes(d.type)
      const signed = outgoing ? -d.amount - (d.type === 'payment' ? fee : 0) : d.amount - (d.type === 'receipt' ? fee : 0)
      if (outgoing) requireThat(balance(account.id, d.date) >= -signed, '资金账户余额不足')
      movement(d, account.id, signed, d.type === 'transfer' ? 'internal' : d.type === 'funding' ? 'financing' : 'operating', 'main')
      journal(d.companyId, d.id, 'execution', `${TYPES[d.type]}：${d.description}`, jlines, d.date, d.vesselId)
      for (const a of allocs) data.allocations.push({ ...a, id: id('ALLOC'), sourceId: d.id, date: d.date, companyId: doc(a.docId).companyId })
      d.fee = fee
      d.accountId = account.id
      d.status = 'executed'
      d.executedBy = role().user
      if (d.type === 'payment' && d.instrumentId) doc(d.instrumentId).status = 'executed'
      if (d.type === 'payment' && options.feeClaimable && fee) {
        requireThat(d.companyId === 'MSTS' && d.vesselId, '仅 MSTS 可收代付手续费进入船东账单')
        const feeDoc = { id: id('FEE'), type: 'invoice', feeSourceId: d.id, companyId: d.companyId, vesselId: d.vesselId, partyId: 'BANK-FEE', number: `${d.id}-FEE`, description: '合同可收银行手续费', date: d.date, expenseMonth: d.date.slice(0,7), dueDate: d.date, currency: d.currency, rate: d.rate, amount: fee, tax: 0, status: 'approved', createdBy: role().user, lines: [{ id: id('LINE'), description: '银行手续费', amount: fee, category: 'OWNER', costCenter: '手续费', claimable: true, claimAmount: fee, tax: 0 }], attachments: [], settled: true }
        data.documents.push(feeDoc)
        data.allocations.push({ id: id('ALLOC'), sourceId: d.id, docId: feeDoc.id, amount: fee, date: d.date, companyId: d.companyId })
        journal(d.companyId, feeDoc.id, 'feeRecoverable', '将合同可收手续费转为船东往来', [line('1221', feeBase), line('5601', 0, feeBase)], d.date, d.vesselId)
        journal(vesselCompany(d.vesselId), feeDoc.id, 'beneficiaryFee', '船舶承担合同内银行手续费', [line('5601', feeBase), line('2241', 0, feeBase, { partyId: 'MSTS' })], d.date, d.vesselId)
      }
      audit('登记实际资金／核销', d.id, d.companyId, '批准本身不改变资金，执行后创建流水及凭证草稿')
      d.executionDate = executionDate
      d.date = documentDate
      return d
    })
  }
  function loanBalance(loanId) {
    const loan = doc(loanId)
    if (loan.status !== 'executed') return 0
    const returns = sum(data.documents.filter(d => d.type === 'loanReturn' && d.loanId === loanId && d.status === 'executed'))
    const offsets = sum(data.allocations.filter(a => a.loanId === loanId && !a.reversed))
    return Math.max(0, loan.amount - returns - offsets)
  }
  function offsetLoan(claimId, loanId, amount) {
    return atomic(() => {
      const claim = currentDocument(claimId, 'allocate')
      const loan = doc(loanId)
      requireThat(claim.type === 'reimbursement' && claim.status === 'approved', '仅已审核报销可冲借款')
      requireThat(loan.companyId === claim.companyId && loan.partyId === claim.partyId && loan.currency === claim.currency && loan.status === 'executed', '请选择同主体同员工同币种已发放借款')
      requireThat(Number.isSafeInteger(amount) && amount > 0 && amount <= outstanding(claim) && amount <= loanBalance(loanId), '冲借款金额超过报销余额或未还借款')
      data.allocations.push({ id: id('OFFSET'), sourceId: claim.id, docId: claim.id, loanId, amount, date: claim.date, companyId: claim.companyId })
      journal(claim.companyId, claim.id, `offset-${loanId}-${data.serial}`, '报销冲员工借款', [line('2202', convert(amount, claim.rate)), line('1221', 0, convert(amount, loan.rate), { partyId: loan.partyId })], claim.date, claim.vesselId)
      audit('报销冲借款', claim.id, claim.companyId, `${loanId} / ${amount}`)
    })
  }
  function allocateFunds(sourceId, allocations) {
    return atomic(() => {
      const source = currentDocument(sourceId, 'allocate', true)
      const allocationDate = new Date(Date.UTC(Number(context.period.slice(0, 4)), Number(context.period.slice(5, 7)), 0)).toISOString().slice(0, 10)
      requireThat(source.status === 'executed' && ['receipt', 'payment'].includes(source.type), '仅已执行收付款可分配余额')
      const used = sum(data.allocations.filter(a => a.sourceId === sourceId && !a.reversed && !a.mirrored && !a.loanId))
      const available = source.amount - used
      validateAllocations({ ...source, date: allocationDate }, allocations, source.type === 'receipt' ? ['bill'] : ['invoice', 'reimbursement', 'asset'], available)
      requireThat(allocations.every(a => doc(a.docId).companyId === source.companyId), '预收预付后续分配限定当前主体')
      const amount = sum(allocations)
      for (const a of allocations) {
        data.allocations.push({ ...a, id: id('ALLOC'), sourceId, date: allocationDate, companyId: source.companyId })
        if (source.type === 'receipt') {
          const mirror = data.documents.find(d => d.mirror && d.sourceId === a.docId)
          if (mirror) {
            open(mirror.companyId, allocationDate)
            data.allocations.push({ ...a, id: id('ALLOC'), sourceId, docId: mirror.id, date: allocationDate, companyId: mirror.companyId, mirrored: true })
            journal(mirror.companyId, source.id, `advanceOffset-${mirror.id}-${data.serial}`, '预付 MSTS 款项冲账', [line('2202', convert(a.amount, source.rate)), line('1221', 0, convert(a.amount, source.rate), { partyId: 'MSTS' })], allocationDate, source.vesselId)
          }
        }
      }
      journal(source.companyId, source.id, `advanceAllocation-${data.serial}`, '预收／预付后续核销', source.type === 'receipt' ? [line('2241', convert(amount, source.rate)), line('1122', 0, convert(amount, source.rate))] : [line('2202', convert(amount, source.rate)), line('1221', 0, convert(amount, source.rate))], allocationDate, source.vesselId)
      audit('余额分配', source.id, source.companyId)
    })
  }
  function createJournal(input) {
    return atomic(() => {
      check('create')
      requireThat(String(input.description || '').trim(), '请输入凭证摘要')
      requireThat(input.lines.length >= 2, '至少需要两条分录')
      for (const l of input.lines) {
        requireThat(data.chart.some(a => a.id === l.account && a.enabled), '存在无效或停用科目')
        requireThat(Number.isSafeInteger(l.debit) && Number.isSafeInteger(l.credit) && l.debit >= 0 && l.credit >= 0 && Boolean(l.debit) !== Boolean(l.credit), '每行借贷只允许一侧大于零')
      }
      requireThat(!input.lines.some(l => ['1001','1002'].includes(l.account) && !l.cashFlow), '现金／银行分录必须选择现金流量分类')
      const result = journal(context.companyId, id('MANUAL'), 'manual', input.description, clone(input.lines), input.date, input.vesselId || '')
      audit('新建手工凭证', result.id, result.companyId)
      return result
    })
  }
  function journalAction(journalId, action, reason = '') {
    return atomic(() => {
      const j = data.journals.find(j => j.id === journalId)
      requireThat(j && j.companyId === context.companyId, '请切换到凭证所属账套')
      open(j.companyId, action === 'reverse' ? `${context.period}-28` : j.date)
      if (action === 'submit') { check('submit'); requireThat(j.status === 'draft', '仅草稿可提交'); j.status = 'submitted' }
      else if (action === 'review') {
        check('journalReview'); requireThat(j.status === 'submitted', '请先提交凭证')
        requireThat(context.roleId === 'demo' || j.createdBy !== role().user, '制单人与审核人必须分离')
        requireThat(sum(j.lines, 'debit') === sum(j.lines, 'credit'), '凭证借贷不平衡')
        j.status = 'approved'; j.reviewedBy = role().user
      } else if (action === 'post') {
        check('post'); requireThat(j.status === 'approved', '仅已审核凭证可过账')
        j.status = 'posted'; j.postedBy = role().user
      } else if (action === 'void') {
        check('create'); requireThat(['draft', 'submitted'].includes(j.status) && !j.sourceId.startsWith('OPEN'), '仅未审核凭证可作废')
        requireThat(!data.documents.some(d => d.id === j.sourceId && ['approved','executed'].includes(d.status)), '业务凭证须随业务更正，不能单独作废')
        requireThat(reason.trim(), '作废需填写原因'); j.status = 'void'
      } else if (action === 'reject') {
        check('journalReview'); requireThat(j.status === 'submitted' && reason.trim(), '仅待审核凭证可退回，需填写原因'); j.status = 'draft'
      } else if (action === 'reverse') {
        check('post'); requireThat(j.status === 'posted' && reason.trim() && j.stage !== 'opening', '仅已过账非期初凭证可冲销，需填写原因')
        requireThat(!data.journals.some(r => r.reversalOf === j.id && r.status !== 'void'), '已存在冲销凭证')
        const reversal = journal(j.companyId, j.id, 'reversal', `冲销 ${j.id}：${reason}`, j.lines.map(l => ({ ...l, debit: l.credit, credit: l.debit })), `${context.period}-28`, j.vesselId)
        reversal.reversalOf = j.id
        j.correctionRequired = true
        audit('创建冲销凭证', reversal.id, j.companyId, '保留真实收付款与核销事实；冲销凭证另行审核过账')
        return reversal
      } else throw new Error('未知凭证操作')
      audit(`凭证${{submit:'提交',review:'审核',post:'过账',void:'作废',reject:'退回'}[action]}`, j.id, j.companyId, reason)
      return j
    })
  }
  function depreciated(assetId, asOf = '9999-12') {
    return data.journals.filter(j => j.sourceId === assetId && j.stage.startsWith('depreciation-') && j.status !== 'void' && j.period <= asOf).reduce((total, j) => total + sum(j.lines.filter(l => l.account === '1602'), 'credit'), 0)
  }
  function depreciate(assetId) {
    return atomic(() => {
      const a = currentDocument(assetId, 'review', true)
      requireThat(a.type === 'asset' && a.status === 'approved' && a.assetStatus === 'active', '资产未启用或已报废')
      requireThat(context.period >= a.depreciationStart, '尚未到折旧起始月')
      requireThat(!data.journals.some(j => j.sourceId === a.id && j.stage === `depreciation-${context.period}` && j.status !== 'void'), '该资产本月已经计提')
      const remaining = convert(a.amount, a.rate) - Number(a.residual || 0) - depreciated(a.id)
      requireThat(remaining > 0, '资产已折旧完毕')
      const amount = Math.min(remaining, Math.round((convert(a.amount, a.rate) - Number(a.residual || 0)) / a.lifeMonths))
      requireThat(amount > 0, '本月无可计提金额')
      const j = journal(a.companyId, a.id, `depreciation-${context.period}`, `月度折旧：${a.description}`, [line('5603', amount, 0, { department: a.department }), line('1602', 0, amount)], `${context.period}-28`, a.vesselId)
      audit('计提折旧', a.id, a.companyId, context.period)
      return j
    })
  }
  function assetAction(assetId, action, detail) {
    return atomic(() => {
      const a = currentDocument(assetId, 'review', true)
      requireThat(a.type === 'asset' && a.status === 'approved' && a.assetStatus === 'active', '请选择使用中的已审核资产')
      requireThat(String(detail).trim(), '请填写变更、盘点或报废说明')
      if (action === 'change') a.location = detail
      else if (action === 'count') a.lastCount = { period: context.period, detail, user: role().user }
      else if (action === 'dispose') {
        const cost = convert(a.amount, a.rate)
        const accumulated = depreciated(a.id)
        journal(a.companyId, a.id, 'disposal', `资产报废：${detail}`, [...(accumulated ? [line('1602', accumulated)] : []), ...(cost - accumulated ? [line('5602', cost - accumulated)] : []), line('1601', 0, cost)], `${context.period}-28`, a.vesselId)
        a.assetStatus = 'disposed'
      } else throw new Error('未知资产操作')
      audit({change:'资产变更',count:'资产盘点',dispose:'资产报废'}[action], a.id, a.companyId, detail)
    })
  }
  function importStatements(rows, accountId) {
    return atomic(() => {
      check('bank')
      const a = bank(accountId)
      requireThat(a.companyId === context.companyId && a.kind === 'bank', '请选择本账套银行账户')
      let count = 0
      for (const row of rows) {
        requireThat(validDate(row.date) && Number.isSafeInteger(row.signedAmount) && row.signedAmount !== 0 && row.reference, '银行流水必须包含日期、非零金额及外部流水号')
        open(a.companyId, row.date)
        const key = `${a.id}|${row.reference}`
        if (data.statements.some(s => s.key === key)) continue
        data.statements.push({ ...row, id: id('STMT'), key, companyId: a.companyId, vesselId: a.vesselId, accountId: a.id, currency: a.currency })
        count++
      }
      audit('导入银行对账单', a.id, a.companyId, `新增 ${count} 条；未新增资金流水`)
      return count
    })
  }
  function match(statementId, movementId, amount) {
    return atomic(() => {
      check('bank')
      const s = data.statements.find(s => s.id === statementId)
      const m = data.movements.find(m => m.id === movementId)
      requireThat(s && m && s.companyId === context.companyId && m.companyId === context.companyId, '流水所属主体不一致')
      open(s.companyId, s.date)
      requireThat(s.accountId === m.accountId && s.currency === m.currency && Math.sign(s.signedAmount) === Math.sign(m.signedAmount), '账户、币种或收支方向不一致')
      const usedS = sum(data.matches.filter(x => x.statementId === s.id))
      const usedM = sum(data.matches.filter(x => x.movementId === m.id))
      requireThat(Number.isSafeInteger(amount) && amount > 0 && amount <= Math.abs(s.signedAmount) - usedS && amount <= Math.abs(m.signedAmount) - usedM, '匹配金额超过剩余可匹配金额')
      data.matches.push({ id: id('MATCH'), statementId, movementId, amount, companyId: s.companyId, date: s.date })
      audit('确认银行匹配', s.id, s.companyId, m.id)
    })
  }
  function reconcile(accountId, period = context.period) {
    const end = `${period}-31`
    const a = bank(accountId)
    const statements = data.statements.filter(s => s.accountId === accountId && s.date <= end)
    const movements = data.movements.filter(m => m.accountId === accountId && m.date <= end)
    const unmatchedStatements = statements.map(s => ({ ...s, remaining: Math.abs(s.signedAmount) - sum(data.matches.filter(x => x.statementId === s.id && movements.some(m => m.id === x.movementId))) })).filter(s => s.remaining > 0)
    const unmatchedMovements = movements.map(m => ({ ...m, remaining: Math.abs(m.signedAmount) - sum(data.matches.filter(x => x.movementId === m.id && statements.some(s => s.id === x.statementId))) })).filter(m => m.remaining > 0)
    const statementBalance = a.opening + sum(statements, 'signedAmount')
    const bookBalance = balance(a.id, end)
    const adjustBank = unmatchedMovements.reduce((t,m) => t + Math.sign(m.signedAmount) * m.remaining, 0)
    const adjustBook = unmatchedStatements.reduce((t,s) => t + Math.sign(s.signedAmount) * s.remaining, 0)
    return { statements, movements, unmatchedStatements, unmatchedMovements, statementBalance, bookBalance, adjustedBank: statementBalance + adjustBank, adjustedBook: bookBalance + adjustBook, difference: statementBalance + adjustBank - bookBalance - adjustBook, hasStatement: statements.length > 0 }
  }
  function ledger({ companyId = context.companyId, vesselId = context.vesselId, period = context.period } = {}) {
    const entries = data.journals.filter(j => j.companyId === companyId && j.status === 'posted' && j.period <= period && (!vesselId || j.vesselId === vesselId))
    return data.chart.map(a => {
      const pairs = entries.flatMap(j => j.lines.filter(l => l.account === a.id).map(l => ({ ...l, journalId: j.id, date: j.date, description: j.description, period: j.period, sourceId: j.sourceId, stage: j.stage })))
      const opening = pairs.filter(l => l.period < period).reduce((t,l) => t + l.debit - l.credit, 0)
      const current = pairs.filter(l => l.period === period)
      return { ...a, opening, debit: sum(current,'debit'), credit: sum(current,'credit'), balance: opening + sum(current,'debit') - sum(current,'credit'), entries: pairs }
    })
  }
  function reports(options = {}) {
    const accounts = ledger(options)
    const assets = accounts.filter(a => ['asset','contraAsset'].includes(a.kind)).reduce((t,a) => t + a.balance, 0)
    const liabilities = -accounts.filter(a => a.kind === 'liability').reduce((t,a) => t + a.balance, 0) || 0
    const undistributed = -accounts.filter(a => ['income','expense'].includes(a.kind)).reduce((t,a) => t + a.balance, 0)
    const equity = -accounts.filter(a => a.kind === 'equity').reduce((t,a) => t + a.balance, 0) + undistributed
    const p = options.period || context.period
    const companyId = options.companyId || context.companyId
    const vesselId = options.vesselId ?? context.vesselId
    const current = data.journals.filter(j => j.companyId === companyId && j.status === 'posted' && j.period === p && j.stage !== 'closing' && (!vesselId || j.vesselId === vesselId))
    const revenue = current.flatMap(j => j.lines).filter(l => data.chart.find(a => a.id === l.account)?.kind === 'income').reduce((t,l) => t + l.credit - l.debit, 0)
    const expenses = current.flatMap(j => j.lines).filter(l => data.chart.find(a => a.id === l.account)?.kind === 'expense').reduce((t,l) => t + l.debit - l.credit, 0)
    const flow = { operating: 0, investing: 0, financing: 0 }
    for (const l of current.flatMap(j => j.lines)) if (['1001','1002'].includes(l.account) && Object.hasOwn(flow, l.cashFlow)) flow[l.cashFlow] += l.debit - l.credit
    return { accounts, assets, liabilities, equity, revenue, expenses, profit: revenue - expenses, flow, balanced: assets === liabilities + equity }
  }
  function periodChecks() {
    const companyId = context.companyId
    const period = context.period
    const unposted = data.journals.filter(j => j.companyId === companyId && j.period === period && !['posted','void'].includes(j.status))
    const pending = data.documents.filter(d => d.companyId === companyId && d.date.slice(0,7) === period && ['draft','submitted'].includes(d.status))
    const dueAssets = data.documents.filter(d => d.companyId === companyId && d.type === 'asset' && d.assetStatus === 'active' && d.status === 'approved' && d.depreciationStart <= period && convert(d.amount,d.rate) - (d.residual || 0) - depreciated(d.id) > 0 && !data.journals.some(j => j.sourceId === d.id && j.stage === `depreciation-${period}` && j.status !== 'void'))
    const unreconciled = data.accounts.filter(a => a.companyId === companyId && a.kind === 'bank').filter(a => {
      const r = reconcile(a.id)
      return r.movements.length && (!r.hasStatement || r.unmatchedStatements.length || r.unmatchedMovements.length || r.difference)
    })
    const closing = data.journals.filter(j => j.companyId === companyId && j.period === period && j.stage === 'closing' && j.status === 'posted').at(-1)
    const latePost = closing && data.journals.some(j => j.companyId === companyId && j.period === period && j.status === 'posted' && ['income','expense'].some(kind => j.lines.some(l => data.chart.find(a => a.id === l.account)?.kind === kind)) && data.journals.indexOf(j) > data.journals.indexOf(closing))
    return [
      { name: '待审核业务单据', count: pending.length, pass: pending.length === 0 },
      { name: '未过账凭证', count: unposted.length, pass: unposted.length === 0 },
      { name: '本月待计提折旧', count: dueAssets.length, pass: dueAssets.length === 0 },
      { name: '银行未完成对账', count: unreconciled.length, pass: unreconciled.length === 0 },
      { name: '损益已结转且未有后续损益过账', count: closing && !latePost ? 0 : 1, pass: Boolean(closing && !latePost) },
      { name: '资产负债表平衡', count: reports({vesselId:''}).balanced ? 0 : 1, pass: reports({vesselId:''}).balanced },
    ]
  }
  function closePeriod(action, reason = '') {
    return atomic(() => {
      check('close')
      requireThat(!context.vesselId, '结账按整个账套执行，请先清除船舶筛选')
      const states = data.periods[context.companyId]
      if (action === 'reopen') {
        const latest = Object.entries(states).filter(([,s]) => s === 'closed').map(([p]) => p).sort().at(-1)
        requireThat(latest === context.period && reason.trim(), '只能反结最近已结期间，且需填写原因')
        states[context.period] = 'open'
      } else if (action === 'closing') {
        open(context.companyId, `${context.period}-28`)
        requireThat(!data.journals.some(j => j.companyId === context.companyId && j.period === context.period && j.stage === 'closing' && !['void','posted'].includes(j.status)), '本期已存在待过账损益结转凭证')
        const accounts = ledger({vesselId:''}).filter(a => ['income','expense'].includes(a.kind) && a.balance)
        requireThat(accounts.length || !data.journals.some(j => j.companyId === context.companyId && j.period === context.period && j.stage === 'closing' && j.status === 'posted'), '本期损益已结转，无新增损益')
        const lines = accounts.map(a => line(a.id, a.balance < 0 ? -a.balance : 0, a.balance > 0 ? a.balance : 0))
        const gap = sum(lines,'debit') - sum(lines,'credit')
        if (gap) lines.push(line('3103', gap < 0 ? -gap : 0, gap > 0 ? gap : 0))
        const j = journal(context.companyId, `CLOSING-${context.period}-${data.serial}`, 'closing', `${context.period} 自动结转损益`, lines, `${context.period}-28`)
        audit('生成损益结转草稿', j.id, context.companyId)
        return j
      } else {
        requireThat(states[context.period] !== 'closed', '本期已经结账')
        requireThat(periodChecks().every(c => c.pass), '月结检查未通过，请处理所有阻断项')
        states[context.period] = 'closed'
      }
      audit(action === 'reopen' ? '反结账' : '结账', context.period, context.companyId, reason)
    })
  }
  function accrueTax() {
    return atomic(() => {
      check('review')
      const amount = Math.round(sum(scoped(data.documents).filter(d => d.type === 'bill' && ['approved','executed'].includes(d.status))) * Number(data.policy.taxRate) / 100)
      requireThat(amount > 0, '当前示例税率为零或本期无应计税额，请先在政策中设置示例税率')
      requireThat(!data.journals.some(j => j.companyId === context.companyId && j.stage === `tax-${context.period}` && j.status !== 'void'), '本期税金已计提')
      const j = journal(context.companyId, `TAX-${context.period}`, `tax-${context.period}`, '示例简单税金计提（非申报）', [line('5602',amount), line('2221',0,amount)], `${context.period}-28`)
      audit('税金计提', j.id, context.companyId)
      return j
    })
  }
  function saveMaster(collection, input) {
    return atomic(() => {
      check('master')
      requireThat(['companies','departments','parties','contracts','vessels','chart','accounts'].includes(collection), '不支持修改该档案')
      const existing = data[collection].find(x => x.id === input.id)
      const record = { ...(existing || {}), ...clone(input) }
      if (collection === 'contracts') {
        requireThat(context.companyId === 'MSTS' && record.monthlyFee > 0 && validDate(record.start), '合同需在 MSTS 账套维护，并有有效起始日及固定月费')
        requireThat(data.vessels.some(v => v.id === record.vesselId && v.companyId === record.partyId), '合同船舶与单船公司不一致')
        requireThat(!record.end || validDate(record.end) && record.end >= record.start, '合同终止日期不能早于生效日期')
        requireThat(['actual','full'].includes(record.prorate), '请选择首末月计费规则')
        requireThat(record.status !== 'active' || !data.contracts.some(c => c.id !== record.id && c.vesselId === record.vesselId && c.status === 'active' && c.start <= (record.end || '9999-12-31') && (c.end || '9999-12-31') >= record.start), '同一船舶不能存在生效日期重叠的管理合同')
        record.currency = 'USD'; record.rate = '1'; record.companyId = 'MSTS'
      } else requireThat(String(record.name || '').trim(), '请填写档案名称')
      if (collection === 'companies') {
        record.currency = 'USD'
        record.kind = record.kind === 'management' ? 'management' : 'vessel'
      }
      if (collection === 'vessels') {
        requireThat(record.imo && (record.imo.includes('示例') || /^\d{7}$/.test(record.imo)), 'IMO 为7位编号；演示身份须明确包含“示例”字样')
        requireThat(!data.vessels.some(v => v.id !== record.id && v.imo === record.imo), 'IMO 已存在')
      }
      if (collection === 'accounts') {
        record.companyId = context.companyId
        record.opening = existing?.opening || 0
        requireThat(!existing || !data.movements.some(m => m.accountId === existing.id) || record.currency === existing.currency && record.kind === existing.kind, '已有流水的账户不能修改币种或账户类型')
        requireThat(['bank','cash'].includes(record.kind), '请选择银行或现金账户')
      }
      if (!record.id) record.id = id('MASTER')
      if (existing) Object.assign(existing, record); else data[collection].push(record)
      if (collection === 'companies') {
        const party = data.parties.find(p => p.id === record.id)
        if (party) party.name = record.name
        else data.parties.push({ id: record.id, name: record.name, kind: record.kind === 'management' ? '管理公司' : '船东／客户' })
      }
      if (collection === 'companies' && !existing) {
        data.periods[record.id] = { [context.period]: 'open' }
        data.accounts.push({ id: `BANK-${record.id}`, companyId: record.id, vesselId: '', name: `${record.name} 银行`, kind: 'bank', currency: 'USD', opening: 0 })
        if (data.roleGrants?.admin) data.roleGrants.admin.companies.push(record.id)
      }
      audit('维护基础档案', record.id, context.companyId, collection)
      return record
    })
  }
  function saveRole(roleId, rights, companies) {
    check('master')
    requireThat(roleId !== 'demo' && ROLES.some(r => r.id === roleId), '全量演示身份不修改授权')
    const known = new Set(ROLES.flatMap(r => r.rights).filter(r => r !== '*'))
    requireThat(rights.every(r => known.has(r)) && companies.length && companies.every(c => data.companies.some(x => x.id === c)), '请选择有效权限及至少一个账套')
    data.roleGrants[roleId] = { rights: [...rights], companies: [...companies] }
    audit('修改角色授权', roleId, context.companyId)
  }
  function savePolicy(input) {
    check('master')
    requireThat(Number(input.capitalThreshold) > 0 && Number(input.assetLife) > 0 && Number(input.taxRate) >= 0 && Number(input.taxRate) <= 100, '政策参数无效')
    Object.assign(data.policy, input)
    audit('修改示例政策', 'POLICY', context.companyId)
  }
  Object.assign(api, { role, access, scoped, doc, bank, balance, outstanding, loanBalance, create, submit, approve, reject, voidDocument, generateBill, execute, offsetLoan, allocateFunds, createJournal, journalAction, depreciate, depreciated, assetAction, importStatements, match, reconcile, ledger, reports, periodChecks, closePeriod, accrueTax, saveMaster, saveRole, savePolicy, audit })
  return api
}
