import { CATEGORIES, STATUSES, BUCKETS, ALLOCATION_FIELDS, SHEETS } from './schema.js'
import { sum, add, sub, mul, div, negate, compare } from './decimal.js'
import { movements, totals } from './engine.js'
import { ORIGINAL_VESSEL_ID,selectedVessels,scopeData,historyFor,vesselFields,vesselById } from './vessels.js'

export const sourceValue=(seed,sheet,cell)=>seed.cells.find(c=>c.sheet===sheet&&c.cell===cell)?.value??null
export const isMoney=key=>/amount|usd|fee|gross|balance|movement|bucket|receipt|ctm_|profit|placeholder|change|opening|closing/i.test(key)
const date=v=>String(v??'').slice(0,10)
const clone=v=>JSON.parse(JSON.stringify(v))
export function fieldsForView(seed,sheet){
  if(sheet.kind==='bank')return [
    ['sequence','序号'],['date','日期'],['currency','币种'],['account','账户'],['direction','入账 / 出账'],['gross_amount','数额'],['fee','Bank Charge'],['net_movement_amount','本笔变动'],['running_balance','账户余额 / 本次登记净额'],['memo','备注'],
  ].map(([key,label])=>({key,label,type:['date'].includes(key)?'date':isMoney(key)?'decimal':'text'}))
  return seed.fields.filter(f=>f.sheet===sheet.name).map(f=>({key:f.field,label:f.header,column:f.column,type:f.type}))
}
function sourceRecord(r,data,vesselId){return {...r,...vesselFields(data,vesselId),id:vesselId+':'+r.record_id,isSource:true,date:date(r.posting_date),sourceRef:`${r.sheet}!${r.row}`,sourceRefs:[`${r.sheet}!${r.row}`]}}
export function entryFields(e,amount=e.amount){
  const f={...e.fields},sign=e.kind==='refund'?-1:1
  f.cash_direction=e.kind==='transfer'?'in':e.direction
  for(const key of ['original_amount','purchase_order_usd','goods_received_usd','invoice_usd','credit_note_accrual_usd','credit_note_profit_usd','profit_usd','owner_settlement_amount','owner_pending_placeholder','owner_paid_placeholder','ctm_other','ctm_food','ctm_store']){
    if(f[key]!==undefined&&f[key]!==null&&f[key]!=='')f[key]=compare(e.amount,'0')===0?'0':div(mul(f[key],amount),e.amount,18)
  }
  f.invoice_usd=sign===1?amount:negate(amount)
  if(sign<0)for(const key of ['original_amount','purchase_order_usd','goods_received_usd'])if(f[key])f[key]=negate(f[key])
  BUCKETS.forEach((key,i)=>f[key]=f.payment_status===STATUSES[i]?f.invoice_usd:'')
  f.bank_fee_usd=compare(e.amount,'0')===0?'0':div(mul(sum(e.settlements.map(s=>s.fee)),amount),e.amount,18)
  for(const a of e.attachments||[])f[a.kind]=[f[a.kind],a.name].filter(Boolean).join('；')
  for(const a of e.settlements.flatMap(s=>s.attachments||[]))f[a.kind]=[f[a.kind],a.name].filter(Boolean).join('；')
  return f
}
export function expenseRows(seed,data,sheet,scope='all'){
  const base=selectedVessels(data,scope).flatMap(v=>(historyFor(seed,data,v.id)?.records||[]).filter(r=>r.sheet===sheet.name).map(r=>sourceRecord(r,data,v.id)))
  const selected=scopeData(data,scope)
  const category=CATEGORIES.find(c=>c.id===sheet.id)
  const extra=[]
  for(const e of selected.entries.filter(e=>!e.voided&&['expense','refund'].includes(e.kind))){
    const allocations=category?e.allocations.filter(a=>a.category===category.id):[{amount:e.amount}]
    for(const a of allocations)extra.push({...entryFields(e,a.amount),...vesselFields(data,e.vesselId),id:e.id+(category?'-'+category.id:''),entryId:e.id,isSource:false,date:e.fields.posting_date,sourceRef:e.id,sourceRefs:e.allocations.map(a=>CATEGORIES.find(c=>c.id===a.category)?.name),paid:sum(e.settlements.map(s=>s.amount)),pending:sub(e.amount,sum(e.settlements.map(s=>s.amount)))})
  }
  return [...extra.reverse(),...base]
}
export function bankRows(seed,data,scope='all'){
  const base=[],extra=[]
  for(const v of selectedVessels(data,scope)){
    const history=historyFor(seed,data,v.id)
    const original=(history?.bank||[]).map(b=>({...b,...vesselFields(data,v.id),id:v.id+':BANK-'+b.source_row,isSource:true,sourceRef:`Bank Verification!${b.source_row}`,date:date(b.date)}))
    base.push(...original)
    let balance=String(history?.baseline.bank||'0'),sequence=Math.max(0,...original.map(b=>Number(b.sequence)))
    for(const m of movements(data).filter(m=>m.wallet==='bank'&&m.vesselId===v.id)){
      balance=add(balance,m.change)
      extra.push({...vesselFields(data,v.id),id:m.id,entryId:m.entryId,isSource:false,sourceRef:m.entryId,sequence:++sequence,date:m.date,currency:'美元',account:m.account||v.bankAccount||'未填写账号',direction:m.kind==='interest'?'结息':m.direction==='in'?'入账':'出账',gross_amount:m.amount,fee:m.fee,net_movement_amount:m.change,running_balance:balance,balanceKind:history?'账户余额':'本次登记净额',memo:m.description,attachments:m.attachments,createdAt:m.createdAt})
    }
  }
  extra.sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')||b.id.localeCompare(a.id,undefined,{numeric:true}))
  return [...extra,...base]
}
export function receiptRows(seed,data,scope='all'){
  const base=selectedVessels(data,scope).flatMap(v=>(historyFor(seed,data,v.id)?.records||[]).filter(r=>r.sheet==='Shipmanagement RCVD').map(r=>sourceRecord(r,data,v.id)))
  const extra=scopeData(data,scope).entries.filter(e=>!e.voided&&['receipt','interest'].includes(e.kind)).map(e=>{
    const settled=sum(e.settlements.map(s=>s.amount)),fee=sum(e.settlements.map(s=>s.fee)),net=sub(settled,fee)
    const r={...entryFields(e),...vesselFields(data,e.vesselId),id:e.id,entryId:e.id,sourceRef:e.id,date:e.fields.posting_date,posting_date:e.fields.posting_date,receipt_type:e.fields.description,receipt_status:e.fields.payment_status,receipt_party:e.fields.supplier_id,receipt_original_amount:e.fields.original_amount,receipt_date:e.settlements.at(-1)?.date||'',receipt_fee:fee,receipt_attachment:e.attachments.filter(a=>a.kind==='receipt_attachment').map(a=>a.name).join('；')}
    let assigned='0'
    for(const [i,a] of e.allocations.entries()){
      const amount=i===e.allocations.length-1?sub(net,assigned):div(mul(net,a.amount),e.amount,18)
      r[ALLOCATION_FIELDS[a.category]]=amount;assigned=add(assigned,amount)
    }
    return r
  })
  return [...extra.reverse(),...base]
}
export function cashRows(seed,data,scope='all'){
  const base=selectedVessels(data,scope).flatMap(v=>(historyFor(seed,data,v.id)?.records||[]).filter(r=>r.sheet==='CTM Expenses List').map(r=>sourceRecord(r,data,v.id)))
  const extra=movements(scopeData(data,scope)).filter(m=>m.wallet==='cash').map(m=>{
    const e=data.entries.find(e=>e.id===m.entryId)
    return {...entryFields(e,m.amount),...vesselFields(data,e.vesselId),id:m.id,entryId:e.id,sourceRef:e.id,posting_date:m.date,date:m.date,description:m.description,cash_direction:m.direction,original_amount:m.change,purchase_order_usd:m.change,goods_received_usd:m.change,invoice_usd:m.change,payment_status:'Completed',completed_bucket:m.change,bank_fee_usd:'0'}
  })
  return [...extra.reverse(),...base]
}
export function rowsForSheet(seed,data,sheet,scope='all'){
  if(sheet.kind==='bank')return bankRows(seed,data,scope)
  if(sheet.kind==='receipts')return receiptRows(seed,data,scope)
  if(sheet.kind==='cash')return cashRows(seed,data,scope)
  return expenseRows(seed,data,sheet,scope)
}
export function entryToDraft(e){return {...clone(e),actual:false,payment:{amount:'',fee:'0',date:'',wallet:'bank'},attachments:clone(e.attachments||[])}}
export function blankDraft(sheet){
  const category=CATEGORIES.find(c=>c.id===sheet?.id)?.id||'shipmanagement'
  return {vesselId:'',direction:'',kind:'expense',currency:'USD',fields:{posting_date:new Date().toLocaleDateString('en-CA'),description:'',supplier_id:'',original_amount:'',usd_conversion_rate:'1',invoice_usd:'',goods_received_usd:'',payment_status:'Received'},allocations:[{category,amount:''}],attachments:[],actual:false,payment:{wallet:sheet?.kind==='cash'?'cash':'bank',date:new Date().toLocaleDateString('en-CA'),amount:'',fee:'0',reference:''}}
}
export function sourceToDraft(row,sheet){
  const d=blankDraft(sheet)
  d.vesselId=row.vesselId||''
  for(const f of ['posting_date','description','supplier_id','requisition_no','purchase_order_no','account_code','original_amount','usd_conversion_rate','goods_received_date','goods_received_usd','invoice_usd','credit_note_accrual_usd','credit_note_profit_usd','profit_usd','invoice_date','due_date','owner_settlement_amount','owner_settlement_status','owner_pending_placeholder','owner_paid_placeholder','ctm_other','ctm_food','ctm_store']){
    if(row[f]!==undefined&&row[f]!==null)d.fields[f]=typeof row[f]==='string'&&row[f].includes('T00:00')?date(row[f]):String(row[f])
  }
  d.fields.payment_status='Received'
  if(sheet?.kind==='receipts'){
    d.fields.description=row.receipt_type||'';d.fields.supplier_id=row.receipt_party||'';d.fields.original_amount=String(row.receipt_original_amount??'')
    d.fields.invoice_usd=''
  }
  if(sheet?.kind==='bank'){
    d.fields.posting_date=date(row.date);d.fields.description=row.memo||'银行收支';d.fields.supplier_id=row.memo||'银行';d.fields.original_amount=String(row.gross_amount??'');d.fields.invoice_usd='';d.payment.fee=String(row.fee??'0')
  }
  for(const key of ['original_amount','invoice_usd','goods_received_usd'])if(compare(d.fields[key]||'0','0')<0)d.fields[key]=negate(d.fields[key])
  d.allocations[0].amount=d.fields.invoice_usd||''
  return d
}
export function rawTable(seed,sheet,start=1,end=200){
  const cells=seed.cells.filter(c=>c.sheet===sheet&&c.row>=start&&c.row<=end)
  const cols=[...new Set(cells.map(c=>c.column))].sort((a,b)=>a-b)
  const letter=n=>{let x='';while(n){n--;x=String.fromCharCode(65+n%26)+x;n=Math.floor(n/26)}return x}
  const rows=[...new Set(cells.map(c=>c.row))].sort((a,b)=>a-b).map(row=>{
    const r={id:`${sheet}-${row}`,sourceRef:`${sheet}!${row}`,isSource:true,row}
    for(const c of cells.filter(c=>c.row===row))r[letter(c.column)]=c.value
    return r
  })
  return {columns:[{key:'row',label:'原表行',type:'text'},...cols.map(n=>({key:letter(n),label:letter(n),type:'mixed'}))],rows}
}
export function summaryRows(seed,data,scope='all'){
  const t=totals(seed,data,scope)
  return CATEGORIES.map(c=>{const x=t.categories[c.id];return {id:c.id,name:c.label,sheet:c.name,...x,paidWithFee:add(x.completed,x.fee),balance:sub(x.receipt,x.amount)}})
}
export function estimateRows(seed,data,scope='all'){
  const original=[]
  for(const v of selectedVessels(data,scope)){
    const cells=historyFor(seed,data,v.id)?.cells
    if(!cells)continue
    for(let row=4;row<=66;row++){
      const get=col=>cells.find(c=>c.sheet==='分析'&&c.cell===`${col}${row}`)?.value??null
      original.push({...vesselFields(data,v.id),id:`EST-SOURCE-${v.id}-${row}`,sourceRow:row,isSource:true,sourceRef:`分析!${row}`,vessel:v.name,description:get('B')||`估算项目 ${row-3}`,rqa:get('C'),supplier:get('D'),po:get('E'),originalAmount:get('F'),rating:get('G'),usd:get('H'),catalogue:get('I'),agreement:get('J'),place:get('K'),overtime:get('L'),low:get('M'),reasonable:get('N'),high:get('O')})
    }
  }
  const estimates=scopeData(data,scope).estimates
  const modified=new Set(estimates.filter(e=>e.sourceRow).map(e=>`${e.vesselId}:${e.sourceRow}`))
  return [...estimates.map(e=>({...e,...vesselFields(data,e.vesselId),vessel:vesselById(data,e.vesselId)?.name,sourceRef:e.sourceRow?`分析!${e.sourceRow} · 演练修改`:e.id})),...original.filter(e=>!modified.has(`${e.vesselId}:${e.sourceRow}`))]
}
export function inventoryMonths(seed,data,scope='all'){
  const includesOriginal=selectedVessels(data,scope).some(v=>v.id===ORIGINAL_VESSEL_ID)
  data=scopeData(data,scope)
  const months=new Set([...(includesOriginal?['2026-07','2026-08']:[]),...data.inventory.map(x=>x.month),...movements(data).filter(m=>m.wallet==='cash').map(m=>m.date.slice(0,7))])
  return [...months].sort().reverse()
}
export function inventoryValues(data,month,seed,vesselId=ORIGINAL_VESSEL_ID){
  const history=seed?historyFor(seed,data,vesselId):null
  const allCash=movements(data).filter(m=>m.wallet==='cash'&&m.vesselId===vesselId)
  const opening=add(history&&month>=history.asOf.slice(0,7)?history.baseline.cash:'0',sum(allCash.filter(m=>m.date.slice(0,7)<month).map(m=>m.change)))
  const base={vesselId,month,openingCash:opening,openingFood:'0',openingStore:'0',foodIncome:'0',foodGuestMealIncome:'0',foodHospitalityIncome:'0',foodCrewIncome:'0',foodPurchases:'0',foodClosing:'0',storeIncome:'0',storeCrewIncome:'0',storeCrewSpend:'0',storeGuestSpend:'0',storeSalesSpend:'0',storePurchases:'0',storeClosing:'0',rmbRate:'7.3',note:'',...data.inventory.find(x=>x.month===month&&x.vesselId===vesselId)}
  const cash=allCash.filter(m=>m.date.startsWith(month)).map(m=>({...m,...vesselFields(data,vesselId)}))
  const foodSpend=sum(cash.filter(m=>m.kind==='expense').map(m=>{
    const e=data.entries.find(e=>e.id===m.entryId);return div(mul(e.fields.ctm_food||'0',m.amount),e.amount,18)
  }))
  const storeSpend=sum(cash.filter(m=>m.kind==='expense').map(m=>{
    const e=data.entries.find(e=>e.id===m.entryId);return div(mul(e.fields.ctm_store||'0',m.amount),e.amount,18)
  }))
  const foodIncome=sum([base.foodIncome,base.foodGuestMealIncome,base.foodHospitalityIncome,base.foodCrewIncome])
  const foodExpense=sub(sum([base.foodPurchases,base.openingFood,foodSpend]),base.foodClosing)
  const storeIncome=sum([base.storeIncome,base.storeCrewIncome])
  // Original U27 = SUM(U19:U23), including the entered sign of the closing inventory.
  const storeExpense=sum([base.storeCrewSpend,base.storeGuestSpend,base.storeSalesSpend,base.storePurchases,base.openingStore,base.storeClosing,storeSpend])
  return {...base,cash,cashClosing:add(base.openingCash,sum(cash.map(m=>m.change))),foodSpend,storeSpend,foodIncomeTotal:foodIncome,foodExpense,storeIncomeTotal:storeIncome,storeExpense,foodBalance:sub(foodIncome,foodExpense),storeBalance:sub(storeIncome,storeExpense)}
}
export function csv(columns,rows){
  const escape=value=>{
    let s=String(value??'');if(/^[=+@]/.test(s)||/^-[^\d.]/.test(s))s="'"+s
    return '"'+s.replaceAll('"','""')+'"'
  }
  return '\ufeff'+[columns.map(c=>escape(c.label)).join(','),...rows.map(row=>columns.map(c=>escape(row[c.key])).join(','))].join('\r\n')
}
