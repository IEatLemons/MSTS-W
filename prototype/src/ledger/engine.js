import { add, sub, mul, div, sum, compare, decimal, negate } from './decimal.js'
import { CATEGORIES, PURPOSES, STATUSES, VERSION, ATTACHMENTS } from './schema.js'

const copy=value=>JSON.parse(JSON.stringify(value))
const zero=value=>value===null||value===undefined||value===''?'0':decimal(value)
const positive=(value,label,allowZero=false)=>{
  const n=zero(value)
  if(value===null||value===undefined||value===''||compare(n,'0')<(allowZero?0:1))throw Error(`${label}${allowZero?'不能为负数':'必须大于零'}`)
  return n
}
function required(value,label){if(!String(value??'').trim())throw Error(`请填写${label}`);return String(value).trim()}
function date(value,label='日期'){
  value=required(value,label)
  const d=new Date(value+'T00:00:00Z')
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error(`${label}无效`)
  return value
}
function files(list=[]){
  return list.map(f=>{
    if(!ATTACHMENTS[f.kind]||!f.name||!f.id)throw Error('附件资料不完整')
    if(f.size>10*1024*1024)throw Error('每个附件最多10 MB')
    return {id:String(f.id),name:String(f.name),kind:f.kind,size:f.size??0}
  })
}
export function createData(seed){return {version:VERSION,sourceSha256:seed.sourceSha256,revision:0,serial:0,entries:[],codes:copy(seed.codes),estimates:[],inventory:[],audit:[]}}
export function createLedger(data,context,seed){
  const previews=new Map(); let sequence=0
  const finance=()=>{if(context.role!=='finance')throw Error('仅财务身份可以录入或修改资料')}
  const find=id=>{const e=data.entries.find(e=>e.id===id);if(!e||e.voided)throw Error('账目不存在或已作废');return e}
  const paid=e=>sum(e.settlements.map(s=>s.amount))
  const pending=e=>sub(e.amount,paid(e))
  function normalizePayment(p,entry){
    const amount=positive(p.amount,'实际收付款金额')
    if(compare(amount,pending(entry))>0)throw Error('实际收付款金额不能超过剩余金额')
    if(!['bank','cash'].includes(p.wallet))throw Error('请选择付款账户')
    if(entry.kind==='transfer'&&p.wallet!=='bank')throw Error('备用金补给必须从银行支付')
    const fee=positive(p.fee??'0','手续费',true)
    if(p.wallet==='cash'&&compare(fee,'0')!==0)throw Error('现金收支不填写银行手续费')
    if(entry.direction==='in'&&compare(fee,amount)>0)throw Error('手续费不能大于收款金额')
    return {amount,fee,wallet:p.wallet,date:date(p.date,'实际收付款日期'),reference:p.reference??'',attachments:files(p.attachments)}
  }
  function normalizeEntry(raw,existing){
    const e=copy(raw)
    if(!['in','out'].includes(e.direction))throw Error('请先选择入账或出账')
    if(!PURPOSES[e.kind])throw Error('请选择记账用途')
    if((e.kind==='expense'||e.kind==='transfer')&&e.direction!=='out')throw Error('费用和备用金补给请选择出账')
    if(['receipt','refund','interest'].includes(e.kind)&&e.direction!=='in')throw Error('收款、退款和结息请选择入账')
    if(existing&&(e.direction!==existing.direction||e.kind!==existing.kind))throw Error('修改时不能改变入出账方向或记账用途，请作废后重新录入')
    e.fields=e.fields||{}
    e.fields.posting_date=date(e.fields.posting_date,'入账日期')
    e.fields.description=required(e.fields.description,'摘要 / 类型')
    e.fields.supplier_id=required(e.fields.supplier_id,'往来方')
    e.fields.original_amount=positive(e.fields.original_amount,'原币金额')
    e.fields.usd_conversion_rate=positive(e.fields.usd_conversion_rate,'Rating')
    e.fields.purchase_order_usd=mul(e.fields.original_amount,e.fields.usd_conversion_rate)
    e.amount=e.fields.invoice_usd===''||e.fields.invoice_usd===null||e.fields.invoice_usd===undefined?e.fields.purchase_order_usd:positive(e.fields.invoice_usd,'记账金额 USD')
    e.fields.invoice_usd=e.amount
    if(!STATUSES.includes(e.fields.payment_status))throw Error('请选择原表状态')
    for(const key of ['goods_received_usd','credit_note_accrual_usd','credit_note_profit_usd','profit_usd','owner_settlement_amount','owner_pending_placeholder','owner_paid_placeholder','ctm_other','ctm_food','ctm_store']){
      if(e.fields[key]!==''&&e.fields[key]!==null&&e.fields[key]!==undefined)e.fields[key]=decimal(e.fields[key])
    }
    for(const key of ['goods_received_date','invoice_date','due_date'])if(e.fields[key])e.fields[key]=date(e.fields[key])
    e.currency=e.currency||'USD'
    if(!['USD','HKD','EUR','CNY'].includes(e.currency))throw Error('请选择有效原币')
    e.allocations=(e.allocations||[]).map(a=>{
      if(!CATEGORIES.some(c=>c.id===a.category))throw Error('请选择有效分类')
      return {category:a.category,amount:positive(a.amount,'分类金额',true)}
    })
    if(['expense','receipt','refund'].includes(e.kind)){
      if(!e.allocations.length||new Set(e.allocations.map(a=>a.category)).size!==e.allocations.length)throw Error('费用分类不能为空或重复')
      if(compare(sum(e.allocations.map(a=>a.amount)),e.amount)!==0)throw Error('分类分配合计必须等于记账金额 USD')
    }else e.allocations=[]
    if(existing){e.id=existing.id;e.settlements=copy(existing.settlements);e.createdAt=existing.createdAt}
    else e.settlements=[]
    if(compare(paid(e),e.amount)>0)throw Error('修改后的金额不能小于已收付金额')
    e.attachments=files(e.attachments)
    e.voided=false
    if(!existing&&e.actual){e.settlements.push(normalizePayment({...e.payment,attachments:[]},e))}
    if(['expense','receipt','refund'].includes(e.kind)&&e.fields.payment_status==='Completed'&&compare(pending(e),'0')!==0)throw Error('Completed 需要实际收付清，请登记收付款或选择未完成状态')
    if(e.kind==='transfer'&&compare(pending(e),'0')!==0)throw Error('备用金补给请填写实际支付信息')
    if(['bank','interest'].includes(e.kind)&&compare(pending(e),'0')!==0)throw Error('银行流水与结息请填写完整的实际收付款信息')
    delete e.actual;delete e.payment;delete e.action;delete e.revision
    e.fields.payment_status=compare(pending(e),'0')===0?'Completed':compare(paid(e),'0')>0?'Paying':e.fields.payment_status
    return e
  }
  function destinations(e){
    const sheets=[]
    if(e.kind==='expense'||e.kind==='refund')sheets.push('Expenses Lists',...e.allocations.map(a=>CATEGORIES.find(c=>c.id===a.category).name))
    if(e.kind==='receipt'||e.kind==='interest')sheets.push('Shipmanagement RCVD')
    if(e.settlements.some(s=>s.wallet==='bank'))sheets.push('Bank Verification')
    if(e.kind==='transfer'||e.settlements.some(s=>s.wallet==='cash'))sheets.push('CTM Expenses List','伙食海关库房管理')
    if(!['bank','interest','transfer'].includes(e.kind))sheets.push('SOFP','Cost Checking')
    if(e.kind==='bank'||e.kind==='interest'||e.kind==='transfer')sheets.push('SOFP')
    return [...new Set(sheets)]
  }
  function prepare(action,raw){
    finance()
    let payload,before=null,sheets=[]
    if(action==='entry'||action==='edit'){
      if(action==='edit')before=copy(find(raw.id))
      payload=normalizeEntry(raw,before);sheets=destinations(payload)
    }else if(action==='payment'){
      before=copy(find(raw.entryId));payload={entryId:before.id,payment:normalizePayment(raw,before)}
      const e=copy(before);e.settlements.push(payload.payment);sheets=destinations(e)
    }else if(action==='void'){
      before=copy(find(raw.id));payload={id:before.id,reason:required(raw.reason,'作废原因')};sheets=destinations(before)
    }else if(action==='code'){
      if(!['ship_management','crew_detail'].includes(raw.namespace))throw Error('请选择编码分组')
      payload={namespace:raw.namespace,code:required(raw.code,'编码'),description:required(raw.description,'名称'),chinese_description:raw.chinese_description??'',pic:raw.pic??'',originalKey:raw.originalKey}
      if(!/^\d+$/.test(payload.code))throw Error('编码只能包含数字')
      if(data.codes.some(c=>c.namespace===payload.namespace&&c.code===payload.code&&`${c.namespace}:${c.code}`!==raw.originalKey))throw Error('同一分组下编码不能重复')
      before=data.codes.find(c=>`${c.namespace}:${c.code}`===raw.originalKey)||null
      if(before?.source_cell)payload.source_cell=before.source_cell
      if(before&&before.namespace!==payload.namespace)throw Error('已有编码的分组保持不变')
      if(before&&before.code!==payload.code)throw Error('已有编码编号保持不变，可修改名称与责任部门')
      sheets=['Account Code-2版']
    }else if(action==='estimate'){
      payload={...copy(raw),description:required(raw.description,'估算项目'),originalAmount:positive(raw.originalAmount,'原币金额',true),rating:positive(raw.rating,'汇率除数')}
      payload.usd=div(payload.originalAmount,payload.rating)
      payload.low=payload.usd;payload.high=payload.usd
      payload.reasonable=raw.reasonable===''||raw.reasonable===null||raw.reasonable===undefined?'':positive(raw.reasonable,'合理值',true)
      payload.isSource=false
      payload.place=decimal(raw.place||'0');payload.overtime=decimal(raw.overtime||'0')
      before=data.estimates.find(e=>e.id===raw.id)||null;sheets=['分析']
    }else if(action==='inventory'){
      if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(raw.month))throw Error('请选择有效月份')
      payload={month:raw.month,note:raw.note??''}
      if(raw.id)payload.id=raw.id
      for(const key of ['openingCash','openingFood','openingStore','foodIncome','foodGuestMealIncome','foodHospitalityIncome','foodCrewIncome','foodPurchases','foodClosing','storeIncome','storeCrewIncome','storeCrewSpend','storeGuestSpend','storeSalesSpend','storePurchases','storeClosing'])payload[key]=decimal(raw[key]||'0')
      payload.rmbRate=positive(raw.rmbRate??'7.3','RMB换算除数')
      before=data.inventory.find(e=>e.month===payload.month)||null
      sheets=['伙食海关库房管理']
    }else throw Error('不支持的操作')
    const token=`PREVIEW-${Date.now()}-${++sequence}`
    const preview={token,action,payload:copy(payload),before:copy(before),revision:data.revision,sheets,at:new Date().toISOString()}
    previews.set(token,{...copy(preview),used:false})
    return copy(preview)
  }
  function confirm(token){
    finance()
    const p=previews.get(token)
    if(!p||p.used)throw Error('这份预览已提交或失效，请重新确认')
    if(p.revision!==data.revision)throw Error('账本已发生变化，请返回重新预览')
    const saved=copy(data),at=new Date().toISOString();let result
    try{
      const id=prefix=>`${prefix}-${String(++data.serial).padStart(4,'0')}`
      if(['entry','edit'].includes(p.action)){
        const e=copy(p.payload);e.id=e.id||id('LED');e.updatedAt=at;e.createdAt=e.createdAt||at
        e.settlements.forEach(s=>{s.id=s.id||id('PAY');s.createdAt=s.createdAt||at})
        if(p.action==='entry')data.entries.push(e)
        else data.entries.splice(data.entries.findIndex(x=>x.id===e.id),1,e)
        result=e
      }else if(p.action==='payment'){
        const e=find(p.payload.entryId),s={...copy(p.payload.payment),id:id('PAY'),createdAt:at}
        e.settlements.push(s);e.updatedAt=at;e.fields.payment_status=compare(pending(e),'0')===0?'Completed':'Paying';result=e
      }else if(p.action==='void'){
        const e=find(p.payload.id);e.voided=true;e.voidReason=p.payload.reason;e.updatedAt=at;result=e
      }else if(p.action==='code'){
        const code=copy(p.payload);delete code.originalKey
        const i=data.codes.findIndex(c=>`${c.namespace}:${c.code}`===p.payload.originalKey)
        if(i<0)data.codes.push(code);else data.codes.splice(i,1,code)
        result=code
      }else if(p.action==='estimate'){
        const e={...copy(p.payload),id:p.payload.id||id('EST'),updatedAt:at};const i=data.estimates.findIndex(x=>x.id===e.id)
        if(i<0)data.estimates.push(e);else data.estimates.splice(i,1,e);result=e
      }else if(p.action==='inventory'){
        const e={...copy(p.payload),id:p.payload.id||id('INV'),updatedAt:at};const i=data.inventory.findIndex(x=>x.month===e.month)
        if(i<0)data.inventory.push(e);else data.inventory.splice(i,1,e);result=e
      }
      data.revision++
      data.audit.unshift({id:id('LOG'),action:p.action,entityId:result.id||result.code,at,role:'finance',before:p.before,after:copy(result),sheets:p.sheets})
      p.used=true
      return copy(result)
    }catch(error){Object.assign(data,saved);throw error}
  }
  function reset(){finance();Object.assign(data,createData(seed));previews.clear()}
  return {prepare,confirm,reset,find,paid,pending,destinations,finance}
}

export function movements(data){
  const result=[]
  for(const entry of data.entries.filter(e=>!e.voided))for(const s of entry.settlements){
    const sign=entry.direction==='in'?1:-1
    const amount=sign===1?sub(s.amount,s.fee):negate(add(s.amount,s.fee))
    result.push({...copy(s),entryId:entry.id,description:entry.fields.description,party:entry.fields.supplier_id,direction:entry.direction,kind:entry.kind,change:amount,wallet:s.wallet,currency:'USD',allocations:entry.allocations})
    if(entry.kind==='transfer')result.push({...copy(s),id:s.id+'-CTM',entryId:entry.id,description:entry.fields.description,party:entry.fields.supplier_id,direction:'in',kind:'transfer',change:s.amount,fee:'0',wallet:'cash',currency:'USD',allocations:[]})
  }
  return result.sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')||a.id.localeCompare(b.id,undefined,{numeric:true}))
}

export function totals(seed,data){
  const move=movements(data)
  const categories=Object.fromEntries(CATEGORIES.map(c=>[c.id,{...copy(seed.baseline.categories[c.id]),amount:zero(seed.baseline.categories[c.id].amount),completed:zero(seed.baseline.categories[c.id].completed),fee:zero(seed.baseline.categories[c.id].fee),receipt:zero(seed.baseline.categories[c.id].receipt),buckets:seed.baseline.categories[c.id].buckets.map(zero)}]))
  let fee='0',otherBank='0',cashExpenses='0'
  for(const e of data.entries.filter(e=>!e.voided)){
    const settled=sum(e.settlements.map(s=>s.amount)),fees=sum(e.settlements.map(s=>s.fee))
    fee=add(fee,fees)
    if(e.kind==='expense'||e.kind==='refund'){
      const sign=e.kind==='refund'?-1:1
      const statusIndex=STATUSES.indexOf(e.fields.payment_status)
      let allocatedFees='0',allocatedPaid='0'
      e.allocations.forEach((a,i)=>{
        const c=categories[a.category],last=i===e.allocations.length-1
        const f=last?sub(fees,allocatedFees):div(mul(fees,a.amount),e.amount,18)
        const paid=last?sub(settled,allocatedPaid):div(mul(a.amount,settled),e.amount,18)
        allocatedFees=add(allocatedFees,f);allocatedPaid=add(allocatedPaid,paid)
        c.amount=add(c.amount,sign===1?a.amount:negate(a.amount))
        c.completed=add(c.completed,sign===1?paid:negate(paid))
        c.fee=add(c.fee,f)
        if(statusIndex>=0)c.buckets[statusIndex]=add(c.buckets[statusIndex],sign===1?a.amount:negate(a.amount))
      })
      if(e.settlements.some(s=>s.wallet==='cash'))cashExpenses=add(cashExpenses,settled)
    }else if(e.kind==='receipt'){
      // Allocate net receipts once; a partially received entry contributes only cash received.
      const net=sub(settled,fees);let assigned='0'
      e.allocations.forEach((a,i)=>{
        const amount=i===e.allocations.length-1?sub(net,assigned):div(mul(net,a.amount),e.amount,18)
        categories[a.category].receipt=add(categories[a.category].receipt,amount);assigned=add(assigned,amount)
      })
    }else if(e.kind==='bank'||e.kind==='interest')otherBank=add(otherBank,sum(move.filter(m=>m.entryId===e.id&&m.wallet==='bank').map(m=>m.change)))
  }
  const bankChange=sum(move.filter(m=>m.wallet==='bank').map(m=>m.change)),cashChange=sum(move.filter(m=>m.wallet==='cash').map(m=>m.change))
  const funds=sum(Object.values(categories).map(c=>c.receipt))
  const completed=sum(Object.values(categories).map(c=>add(c.completed,c.fee)))
  const baseCompleted=sum(Object.values(seed.baseline.categories).map(c=>add(c.completed??0,c.fee??0)))
  const fundsDelta=sub(funds,seed.baseline.funds)
  // Keep the original unreconciled difference; only the new movement/expense deltas alter it.
  const difference=add(seed.baseline.difference,sub(sub(sub(fundsDelta,bankChange),cashChange),sub(completed,baseCompleted)))
  return {categories,bank:add(seed.baseline.bank,bankChange),cash:add(seed.baseline.cash,cashChange),bankChange,cashChange,funds,completed,difference,fee,otherBank,cashExpenses,pending:sum(data.entries.filter(e=>!e.voided&&e.kind==='expense').map(e=>sub(e.amount,sum(e.settlements.map(s=>s.amount))))),movements:move}
}
