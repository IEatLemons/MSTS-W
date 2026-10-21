import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createData,createLedger,totals,movements } from '../../src/ledger/engine.js'
import { add,mul,div,compare,round } from '../../src/ledger/decimal.js'
import { SHEETS,DATABASE_NAME } from '../../src/ledger/schema.js'
import { expenseRows,bankRows,receiptRows,cashRows,csv,inventoryValues } from '../../src/ledger/views.js'
const seed=JSON.parse(fs.readFileSync(new URL('../../src/ledger/source.json',import.meta.url),'utf8'))
function setup(){const data=createData(seed),context={role:'finance'},engine=createLedger(data,context,seed);return {data,context,engine}}
function draft(overrides={}){return {direction:'out',kind:'expense',currency:'USD',fields:{posting_date:'2026-10-20',description:'示例备件',supplier_id:'示例供应商',original_amount:'1000',usd_conversion_rate:'1',invoice_usd:'',payment_status:'Received'},allocations:[{category:'shipmanagement',amount:'1000'}],attachments:[],...overrides}}
function save(s,d=draft()){return s.engine.confirm(s.engine.prepare('entry',d).token)}
function pay(s,id,amount,fee='0',wallet='bank'){return s.engine.confirm(s.engine.prepare('payment',{entryId:id,amount,fee,wallet,date:'2026-10-20'}).token)}
const equal=(a,b)=>assert.equal(compare(a,b),0,`${a} != ${b}`)

test('14个分表名称及顺序与工作簿一致，存储与旧版隔离',()=>{
 assert.deepEqual(SHEETS.map(s=>s.name),seed.sheets.map(s=>s.name))
 assert.equal(SHEETS.length,14);assert.equal(DATABASE_NAME,'msts-excel-ledger-demo-v1')
})
test('原始Demo余额、差额及公式异常保持原值',()=>{
 const s=setup(),t=totals(seed,s.data)
 equal(t.bank,'92779.85');equal(t.cash,'29908');equal(t.funds,'371554.52');equal(t.difference,seed.baseline.difference)
 assert.equal(seed.cells.find(c=>c.sheet==='Take-Over Cost'&&c.cell==='AE15').value,'#VALUE!')
})
test('首次确认不写入，完整预览副本不可影响提交结果；第二次才保存',()=>{
 const s=setup(),before=JSON.stringify(s.data),p=s.engine.prepare('entry',draft())
 assert.equal(JSON.stringify(s.data),before);assert.ok(p.sheets.includes('Shipmanagement Cost'))
 p.payload.fields.description='篡改预览';const e=s.engine.confirm(p.token)
 assert.equal(e.fields.description,'示例备件');assert.equal(s.data.entries.length,1)
 assert.throws(()=>s.engine.confirm(p.token),/已提交|失效/)
})
test('所有写操作校验财务权限，预览后切换为只读也不能确认',()=>{
 const s=setup(),p=s.engine.prepare('entry',draft());s.context.role='reader'
 assert.throws(()=>s.engine.confirm(p.token),/财务/)
 for(const action of ['entry','edit','payment','void','code','estimate','inventory'])assert.throws(()=>s.engine.prepare(action,{}),/财务/)
 assert.throws(()=>s.engine.reset(),/财务/)
})
test('其他操作改变账本后，旧预览必须重新生成',()=>{
 const s=setup(),p=s.engine.prepare('entry',draft());save(s)
 assert.throws(()=>s.engine.confirm(p.token),/账本已发生变化/);assert.equal(s.data.entries.length,1)
})
test('费用1000先登记，付款400/600及20手续费只更新银行一次',()=>{
 const s=setup(),e=save(s);equal(totals(seed,s.data).bank,seed.baseline.bank)
 pay(s,e.id,'400','20');equal(s.engine.pending(s.engine.find(e.id)),'600')
 equal(totals(seed,s.data).bank,add(seed.baseline.bank,'-420'))
 pay(s,e.id,'600');equal(s.engine.pending(s.engine.find(e.id)),'0')
 equal(totals(seed,s.data).bank,add(seed.baseline.bank,'-1020'))
 assert.equal(bankRows(seed,s.data).filter(r=>!r.isSource).length,2)
 equal(totals(seed,s.data).categories.shipmanagement.fee,add(seed.baseline.categories.shipmanagement.fee,'20'))
 equal(totals(seed,s.data).difference,seed.baseline.difference)
})
test('多笔账交错付款时，银行顺序与逐笔余额按实际登记顺序生成',()=>{
 const s=setup(),a=save(s),b=save(s)
 pay(s,b.id,'400');pay(s,a.id,'600')
 const rows=bankRows(seed,s.data).filter(r=>!r.isSource)
 assert.equal(rows[0].entryId,a.id);assert.equal(rows[1].entryId,b.id)
 equal(rows[0].running_balance,add(seed.baseline.bank,'-1000'))
 equal(rows[1].running_balance,add(seed.baseline.bank,'-400'))
})
test('3000拆分1000/2000，主清单一笔、分类各一笔，分摊合计守恒',()=>{
 const s=setup();save(s,draft({fields:{...draft().fields,original_amount:'3000'},allocations:[{category:'shipmanagement',amount:'1000'},{category:'takeover',amount:'2000'}]}))
 const rows=id=>expenseRows(seed,s.data,SHEETS.find(x=>x.id===id)).filter(r=>!r.isSource)
 assert.equal(rows('expenses').length,1);equal(rows('expenses')[0].invoice_usd,'3000')
 equal(rows('shipmanagement')[0].invoice_usd,'1000');equal(rows('takeover')[0].invoice_usd,'2000')
})
test('分类金额不一致、重复分类和超额付款不会改变数据',()=>{
 const s=setup(),before=JSON.stringify(s.data)
 assert.throws(()=>s.engine.prepare('entry',draft({allocations:[{category:'shipmanagement',amount:'900'}]})),/合计/)
 assert.throws(()=>s.engine.prepare('entry',draft({allocations:[{category:'shipmanagement',amount:'500'},{category:'shipmanagement',amount:'500'}]})),/重复/)
 assert.equal(JSON.stringify(s.data),before)
 const e=save(s);assert.throws(()=>pay(s,e.id,'1001'),/超过/);assert.equal(s.data.entries[0].settlements.length,0)
})
test('入账1000、手续费20，银行及五类净收款均只增加980',()=>{
 const s=setup();save(s,draft({direction:'in',kind:'receipt',actual:true,payment:{amount:'1000',fee:'20',wallet:'bank',date:'2026-10-20'}}))
 const t=totals(seed,s.data);equal(t.bank,add(seed.baseline.bank,'980'));equal(t.funds,add(seed.baseline.funds,'980'))
 const r=receiptRows(seed,s.data).find(r=>!r.isSource);equal(r.shipmanagement_receipt,'980');equal(r.receipt_fee,'20')
})
test('未到账收款不改变银行及实际收款汇总',()=>{
 const s=setup();save(s,draft({direction:'in',kind:'receipt'}))
 equal(totals(seed,s.data).bank,seed.baseline.bank);equal(totals(seed,s.data).funds,seed.baseline.funds)
})
test('备用金补给1000不增加费用；现金消费100只确认一次',()=>{
 const s=setup(),original=totals(seed,s.data)
 save(s,draft({kind:'transfer',allocations:[],actual:true,payment:{amount:'1000',fee:'0',date:'2026-10-20',wallet:'bank'}}))
 let t=totals(seed,s.data);equal(t.bank,add(original.bank,'-1000'));equal(t.cash,add(original.cash,'1000'));equal(t.completed,original.completed)
 const e=save(s,draft({fields:{...draft().fields,original_amount:'100',ctm_food:'100'},allocations:[{category:'shipmanagement',amount:'100'}]}));pay(s,e.id,'100','0','cash')
 t=totals(seed,s.data);equal(t.cash,add(original.cash,'900'));equal(t.completed,add(original.completed,'100'))
 assert.equal(cashRows(seed,s.data).filter(r=>!r.isSource).length,2)
 equal(inventoryValues(s.data,'2026-10').foodSpend,'100')
})
test('分次现金支付按比例归集伙食，明细与月度合计相同',()=>{
 const s=setup(),e=save(s,draft({fields:{...draft().fields,ctm_food:'100'}}))
 pay(s,e.id,'400','0','cash');equal(inventoryValues(s.data,'2026-10').foodSpend,'40')
 pay(s,e.id,'600','0','cash')
 const rows=cashRows(seed,s.data).filter(r=>!r.isSource)
 equal(add(rows[0].ctm_food,rows[1].ctm_food),'100')
 equal(inventoryValues(s.data,'2026-10').foodSpend,'100')
})
test('Profit沿用手填值，混合分类的C/N与Profit按比例展示',()=>{
 const s=setup(),e=save(s,draft({fields:{...draft().fields,goods_received_usd:'1200'}}))
 assert.equal(e.fields.profit_usd,undefined)
 const d=draft({fields:{...draft().fields,original_amount:'3000',credit_note_accrual_usd:'30',profit_usd:'90'},allocations:[{category:'shipmanagement',amount:'1000'},{category:'takeover',amount:'2000'}]})
 const mixed=save(s,d)
 const row=id=>expenseRows(seed,s.data,SHEETS.find(x=>x.id===id)).find(r=>r.entryId===mixed.id)
 equal(row('shipmanagement').credit_note_accrual_usd,'10');equal(row('takeover').credit_note_accrual_usd,'20')
 equal(row('shipmanagement').profit_usd,'30');equal(row('takeover').profit_usd,'60')
})
test('已录入账目修改分类与金额同步更新，作废还原资金且保留前后记录',()=>{
 const s=setup(),e=save(s);pay(s,e.id,'400','20')
 const edited={...s.engine.find(e.id),fields:{...e.fields,original_amount:'1200',invoice_usd:'1200',payment_status:'Paying'},allocations:[{category:'owner',amount:'1200'}]}
 s.engine.confirm(s.engine.prepare('edit',edited).token)
 assert.equal(expenseRows(seed,s.data,SHEETS.find(s=>s.id==='shipmanagement')).filter(r=>!r.isSource).length,0)
 equal(totals(seed,s.data).categories.owner.amount,add(seed.baseline.categories.owner.amount,'1200'))
 s.engine.confirm(s.engine.prepare('void',{id:e.id,reason:'演示更正'}).token)
 equal(totals(seed,s.data).bank,seed.baseline.bank);assert.equal(s.data.entries[0].voidReason,'演示更正')
 assert.ok(s.data.audit.some(a=>a.action==='void'&&a.before.settlements.length===1))
})
test('已付金额限制修改下限；修改不能反转历史收付款方向',()=>{
 const s=setup(),e=save(s);pay(s,e.id,'400')
 assert.throws(()=>s.engine.prepare('edit',{...s.engine.find(e.id),fields:{...e.fields,original_amount:'300',invoice_usd:'300'},allocations:[{category:'shipmanagement',amount:'300'}]}),/小于已收付/)
 assert.throws(()=>s.engine.prepare('edit',{...s.engine.find(e.id),direction:'in',kind:'receipt'}),/不能改变/)
})
test('十进制精度、费用乘法及分析除法沿用原表；零汇率阻止保存',()=>{
 equal(add('0.1','0.2'),'0.3');equal(mul('1000','0.128'),'128');equal(div('730','7.3'),'100');equal(round('-1.005'),'-1.01')
 const s=setup(),p=s.engine.prepare('estimate',{description:'估算',originalAmount:'730',rating:'7.3'});equal(p.payload.usd,'100');s.engine.confirm(p.token)
 assert.throws(()=>s.engine.prepare('estimate',{description:'估算',originalAmount:'730',rating:'0'}),/大于零/)
 assert.throws(()=>s.engine.prepare('entry',draft({fields:{...draft().fields,usd_conversion_rate:'0'}})),/大于零/)
})
test('编码分组独立、同组唯一，字典和估算不产生资金',()=>{
 const s=setup(),before=totals(seed,s.data).bank
 s.engine.confirm(s.engine.prepare('code',{namespace:'ship_management',code:'909090909',description:'演示编码',pic:'Technical'}).token)
 assert.throws(()=>s.engine.prepare('code',{namespace:'ship_management',code:'909090909',description:'重复'}),/重复/)
 s.engine.confirm(s.engine.prepare('code',{namespace:'crew_detail',code:'909090909',description:'船员细项'}).token)
 equal(totals(seed,s.data).bank,before)
})
test('月度盘点维护复用两次确认且不创建收付款',()=>{
 const s=setup(),raw={month:'2026-10',openingCash:'29908',openingFood:'100',openingStore:'20',foodIncome:'300',foodPurchases:'100',foodClosing:'50',storeIncome:'0',storePurchases:'0',storeClosing:'10',rmbRate:'7.3'}
 const p=s.engine.prepare('inventory',raw);assert.equal(s.data.inventory.length,0);s.engine.confirm(p.token)
 equal(inventoryValues(s.data,'2026-10').cashClosing,'29908');equal(inventoryValues(s.data,'2026-10').foodBalance,'150');assert.equal(movements(s.data).length,0)
})
test('Bound Store按原表SUM规则保留库存符号，修改预览不复用旧计算结果',()=>{
 const s=setup()
 s.engine.confirm(s.engine.prepare('inventory',{month:'2026-10',storeIncome:'100',openingStore:'20',storeClosing:'-10',rmbRate:'7.3'}).token)
 equal(inventoryValues(s.data,'2026-10').storeExpense,'10')
 const old=inventoryValues(s.data,'2026-10'),preview=s.engine.prepare('inventory',{...old,storeClosing:'-15'})
 equal(inventoryValues(s.data,'2026-10').storeExpense,'10');s.engine.confirm(preview.token)
 equal(inventoryValues(s.data,'2026-10').storeExpense,'5');equal(inventoryValues(s.data,'2026-10').storeBalance,'95')
})
test('附件保留类别、原始文件名与大小，不接受超大文件',()=>{
 const s=setup();const e=save(s,draft({attachments:[{id:'FILE-1',name:'发票.pdf',kind:'invoice_attachment',size:100}]}))
 assert.equal(e.attachments[0].name,'发票.pdf')
 assert.throws(()=>s.engine.prepare('entry',draft({attachments:[{id:'FILE-2',name:'大文件.pdf',kind:'invoice_attachment',size:11*1024*1024}]})),/10 MB/)
})
test('CSV保持原列顺序、换行引号及负数，文本公式受保护',()=>{
 const out=csv([{key:'a',label:'摘要'},{key:'b',label:'金额'}],[{a:'=HYPERLINK("x")',b:'-20'},{a:'a\nb',b:'0'}])
 assert.ok(out.startsWith('\ufeff'));assert.ok(out.includes("'=HYPERLINK"));assert.ok(out.includes('"-20"'));assert.ok(out.includes('a\nb'))
})
test('重置仅清除新版演示副本，不修改原始底稿',()=>{
 const before=JSON.stringify(seed),s=setup();save(s);s.engine.reset()
 assert.equal(s.data.entries.length,0);assert.equal(JSON.stringify(seed),before)
 equal(totals(seed,s.data).bank,'92779.85')
})
