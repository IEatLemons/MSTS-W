// Original workbook sheetPr/tabColor. Take-Over uses theme accent5 with -25% tint.
export const SHEETS = [
  ['sofp','SOFP','资金与费用总览','summary'],
  ['cost-checking','Cost Checking','费用分类核对','checking'],
  ['bank','Bank Verification','银行收支与余额','bank'],
  ['receipts','Shipmanagement RCVD','收款与用途分配','receipts'],
  ['expenses','Expenses Lists','全部费用清单','expenses','#FFFF00'],
  ['ctm','CTM Expenses List','船长备用金','cash','#FFFF00'],
  ['shipmanagement','Shipmanagement Cost','船管费用','category','#92D050'],
  ['owner','Owner Cost','船东费用','category','#FF0000'],
  ['takeover','Take-Over Cost','交接船费用','category','#31869B'],
  ['flag','BMA Flag Change','换旗费用','category'],
  ['drydock','DD Cost','坞修费用','category'],
  ['analysis','分析','费用估算与参数','analysis'],
  ['codes','Account Code-2版','费用编码与责任部门','codes'],
  ['inventory','伙食海关库房管理','月度现金与库存','inventory'],
].map(([id,name,label,kind,tabColor=null])=>({id,name,label,kind,tabColor}))
export const CATEGORIES = SHEETS.filter(s=>s.kind==='category')
export const STATUSES = ['Accrual','Receiving','Received','Approved','Paying','Completed']
export const BUCKETS = ['accrual_bucket','receiving_bucket','received_bucket','approved_bucket','paying_bucket','completed_bucket']
export const ALLOCATION_FIELDS = {shipmanagement:'shipmanagement_receipt',takeover:'takeover_receipt',flag:'bma_receipt',owner:'owner_receipt',drydock:'dd_receipt'}
export const PURPOSES = {expense:'费用登记',receipt:'收款',refund:'费用退款',interest:'银行结息',transfer:'银行补给备用金',bank:'其他银行流水'}
export const WALLETS = [{id:'bank',name:'银行 · 7982933945 · USD'},{id:'cash',name:'船长备用金 · USD'}]
export const ATTACHMENTS = {approval_attachment:'付款批准',invoice_attachment:'发票',credit_note_attachment:'Credit Note',bank_slip:'BankSlip',receipt_attachment:'收款回单',supplemental_attachment:'补充附件'}
export const FIELD_GROUPS = [
  {name:'基本资料',keys:['posting_date','description','requisition_no','supplier_id','purchase_order_no','account_code']},
  {name:'金额与原票',keys:['original_amount','usd_conversion_rate','purchase_order_usd','goods_received_date','goods_received_usd','invoice_usd','credit_note_accrual_usd','credit_note_profit_usd','profit_usd','invoice_date','due_date']},
  {name:'状态与船东信息',keys:['payment_status','owner_settlement_amount','owner_settlement_status','owner_pending_placeholder','owner_paid_placeholder','ctm_other','ctm_food','ctm_store']},
]
export const FIELD_LABELS = {posting_date:'入账日期',description:'摘要 / 类型',requisition_no:'RQA',supplier_id:'往来方 / Supplier',purchase_order_no:'PO Nos',account_code:'费用编码 / Account Code',original_amount:'原币金额 / PO Current',usd_conversion_rate:'Rating · 原币 × Rating = USD',purchase_order_usd:'PO Amount (USD)',goods_received_date:'GRN / Date',goods_received_usd:'GRN Amount (USD)',invoice_usd:'Invoice Amount (USD)',credit_note_accrual_usd:'C/N, Accrual',credit_note_profit_usd:'C/N Profit',profit_usd:'Profit',invoice_date:'Invoice Date',due_date:'Due Date',payment_status:'Payment Status',owner_settlement_amount:'已收金额',owner_settlement_status:'船东收取状态',owner_pending_placeholder:'待收金额',owner_paid_placeholder:'船东付',ctm_other:'Others',ctm_food:'Food',ctm_store:'Store'}
export const CALCULATED = new Set(['purchase_order_usd',...BUCKETS,'cash_direction'])
export const DATABASE_NAME = 'msts-excel-ledger-demo-v1'
export const VERSION = 3
export function sheetById(id) { return SHEETS.find(s=>s.id===id)||SHEETS[0] }
export function fieldsFor(seed,sheet) { return seed.fields.filter(f=>f.sheet===sheet) }
