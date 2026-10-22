import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createData,createLedger,totals,movements} from '../../src/ledger/engine.js'
import {ORIGINAL_VESSEL_ID,selectedVessels,migrateData,normalizeScope,historyFor,walletsFor} from '../../src/ledger/vessels.js'
import {expenseRows,bankRows,receiptRows,cashRows,inventoryValues,estimateRows,csv} from '../../src/ledger/views.js'
import {SHEETS} from '../../src/ledger/schema.js'
import {compare,add} from '../../src/ledger/decimal.js'
const seed=JSON.parse(fs.readFileSync(new URL('../../src/ledger/source.json',import.meta.url),'utf8'))
function setup(){const data=createData(seed),context={role:'finance',vesselScope:'all'},engine=createLedger(data,context,seed);return {data,context,engine}}
const eq=(a,b)=>assert.equal(compare(a,b),0,`${a} != ${b}`)
const save=(s,action,payload)=>s.engine.confirm(s.engine.prepare(action,payload).token)
const ship=(s,name)=>save(s,'vessel',{name,imo:'',company:'Demo'})
const bill=(vesselId,amount='1000',more={})=>({vesselId,direction:'out',kind:'expense',fields:{posting_date:'2026-10-22',description:'分船费用',supplier_id:'Demo',original_amount:amount,usd_conversion_rate:'1',payment_status:'Received',...more.fields},allocations:[{category:'shipmanagement',amount}],...more})
const pay=(s,e,amount,wallet='bank',fee='0')=>save(s,'payment',{entryId:e.id,amount,wallet,fee,date:'2026-10-22'})

test('船舶两次确认与权限、名称IMO校验；全部选择动态包含新增船',()=>{
 const s=setup(),p=s.engine.prepare('vessel',{name:'A船',company:'Demo'})
 assert.equal(s.data.vessels.length,1);const a=s.engine.confirm(p.token)
 assert.equal(selectedVessels(s.data).length,2)
 const b=ship(s,'B船');assert.equal(selectedVessels(s.data,[a.id]).length,1)
 assert.deepEqual(normalizeScope(s.data,[a.id,'unknown',a.id]),[a.id]);assert.equal(normalizeScope(s.data,[]),'all')
 assert.throws(()=>s.engine.prepare('vessel',{name:'A船'}),/已存在/)
 assert.throws(()=>s.engine.prepare('vessel',{name:'C船',imo:'123'}),/7位/)
 const p2=s.engine.prepare('vessel',{name:'C船'});s.context.role='reader'
 assert.throws(()=>s.engine.confirm(p2.token),/财务/);assert.throws(()=>s.engine.prepare('vessel',{id:b.id,name:'B船修改'}),/财务/)
})
test('空账本不复制原船历史，1000/2000按单船、多船及全部守恒',()=>{
 const s=setup(),a=ship(s,'A船'),b=ship(s,'B船')
 assert.equal(historyFor(seed,s.data,a.id),null)
 eq(totals(seed,s.data,[a.id]).bank,'0');eq(totals(seed,s.data,[a.id]).cash,'0')
 assert.equal(totals(seed,s.data,[a.id]).hasUnimported,true)
 save(s,'entry',bill(a.id));save(s,'entry',bill(b.id,'2000'))
 eq(totals(seed,s.data,[a.id]).categories.shipmanagement.amount,'1000')
 eq(totals(seed,s.data,[b.id]).categories.shipmanagement.amount,'2000')
 eq(totals(seed,s.data,[a.id,b.id]).categories.shipmanagement.amount,'3000')
 eq(totals(seed,s.data).categories.shipmanagement.amount,add(seed.baseline.categories.shipmanagement.amount,'3000'))
 const expenses=SHEETS.find(s=>s.id==='expenses')
 assert.equal(expenseRows(seed,s.data,expenses,[a.id]).length,1)
 assert.equal(expenseRows(seed,s.data,expenses,[a.id,b.id]).length,2)
 assert.ok(expenseRows(seed,s.data,expenses,[a.id,b.id]).every(r=>r.vesselName&&r.vesselId))
 const exported=csv([{key:'vesselName',label:'船名'},{key:'invoice_usd',label:'金额'}],expenseRows(seed,s.data,expenses,[b.id]))
 assert.ok(exported.includes('B船'));assert.ok(!exported.includes('A船'))
 eq(totals(seed,s.data,[ORIGINAL_VESSEL_ID]).bank,'92779.85');eq(totals(seed,s.data,[ORIGINAL_VESSEL_ID]).difference,seed.baseline.difference)
})
test('各船银行余额、账号和待付独立；补登付款继承原船',()=>{
 const s=setup(),a=ship(s,'A船'),b=ship(s,'B船'),ea=save(s,'entry',bill(a.id)),eb=save(s,'entry',bill(b.id,'2000'))
 pay(s,ea,'400','bank','20');pay(s,eb,'200')
 eq(totals(seed,s.data,[a.id]).bank,'-420');eq(totals(seed,s.data,[b.id]).bank,'-200')
 eq(totals(seed,s.data,[a.id]).pending,'600');eq(totals(seed,s.data,[b.id]).pending,'1800')
 pay(s,ea,'600')
 const rows=bankRows(seed,s.data,[a.id,b.id]);eq(rows.find(r=>r.entryId===ea.id).running_balance,'-1020');eq(rows.find(r=>r.entryId===eb.id).running_balance,'-200')
 assert.ok(rows.every(r=>r.account==='未填写账号'))
 assert.ok(walletsFor(s.data,a.id)[0].name.includes('A船'));assert.ok(!walletsFor(s.data,a.id)[0].name.includes('7982933945'))
 assert.throws(()=>s.engine.prepare('payment',{entryId:eb.id,vesselId:a.id,amount:'1',wallet:'bank',date:'2026-10-22'}),/原账目/)
 assert.ok(movements(s.data).every(m=>m.vesselId))
})
test('按船收款及备用金隔离，分类和月度消费不串船',()=>{
 const s=setup(),a=ship(s,'A船'),b=ship(s,'B船')
 save(s,'entry',bill(a.id,'1000',{direction:'in',kind:'receipt',actual:true,payment:{amount:'1000',fee:'20',wallet:'bank',date:'2026-10-22'}}))
 eq(totals(seed,s.data,[a.id]).funds,'980');eq(totals(seed,s.data,[b.id]).funds,'0');assert.equal(receiptRows(seed,s.data,[b.id]).length,0)
 save(s,'entry',bill(a.id,'1000',{kind:'transfer',actual:true,payment:{amount:'1000',fee:'0',wallet:'bank',date:'2026-10-22'}}))
 const e=save(s,'entry',bill(a.id,'100',{fields:{...bill(a.id,'100').fields,ctm_food:'100'}}));pay(s,e,'100','cash')
 eq(totals(seed,s.data,[a.id]).cash,'900');eq(totals(seed,s.data,[b.id]).cash,'0')
 eq(inventoryValues(s.data,'2026-10',seed,a.id).foodSpend,'100');eq(inventoryValues(s.data,'2026-10',seed,b.id).foodSpend,'0')
 assert.equal(cashRows(seed,s.data,[b.id]).length,0)
})
test('同月两船月度资料可独立新增和修改，分析亦按船筛选',()=>{
 const s=setup(),a=ship(s,'A船'),b=ship(s,'B船')
 const ia=save(s,'inventory',{vesselId:a.id,month:'2026-10',foodIncome:'100',rmbRate:'7.3'})
 save(s,'inventory',{vesselId:b.id,month:'2026-10',foodIncome:'200',rmbRate:'7.1'})
 save(s,'inventory',{...ia,foodIncome:'150'})
 assert.equal(s.data.inventory.length,2);eq(inventoryValues(s.data,'2026-10',seed,a.id).foodBalance,'150');eq(inventoryValues(s.data,'2026-10',seed,b.id).foodBalance,'200')
 save(s,'estimate',{vesselId:b.id,description:'B船估算',originalAmount:'730',rating:'7.3'})
 assert.equal(estimateRows(seed,s.data,[a.id]).length,0);assert.equal(estimateRows(seed,s.data,[b.id]).length,1)
})
test('必选船舶，改名不移动账目，不能将已有账目直接改属另一船',()=>{
 const s=setup(),a=ship(s,'A船'),b=ship(s,'B船')
 assert.throws(()=>s.engine.prepare('entry',bill('')),/船舶/)
 const e=save(s,'entry',bill(a.id))
 save(s,'vessel',{...a,name:'A船新名'})
 assert.equal(expenseRows(seed,s.data,SHEETS.find(x=>x.id==='expenses'),[a.id])[0].vesselName,'A船新名')
 assert.throws(()=>s.engine.prepare('edit',{...e,vesselId:b.id}),/不能变更船舶/)
 const p=s.engine.prepare('entry',bill(b.id));s.context.role='reader';assert.throws(()=>s.engine.confirm(p.token),/财务/)
})
test('v1升级保留编号、附件、审计及原始值，其他船名估算独立建档且升级幂等',()=>{
 const s=setup(),e=save(s,'entry',bill(ORIGINAL_VESSEL_ID,'10',{attachments:[{id:'FILE-X',name:'旧发票.pdf',kind:'invoice_attachment',size:100}]}))
 const legacy=JSON.parse(JSON.stringify(s.data));legacy.version=1;delete legacy.vessels;delete legacy.histories
 for(const e of legacy.entries)delete e.vesselId
 legacy.estimates=[{id:'EST-OLD',vessel:'原先填写的其他船',description:'旧估算',usd:'100'}]
 legacy.inventory=[{id:'INV-OLD',month:'2026-10',openingCash:'123'}]
 for(const log of legacy.audit){delete log.vesselId;delete log.after.vesselId}
 const before=JSON.stringify(legacy),up=migrateData(legacy,seed)
 assert.equal(JSON.stringify(legacy),before);assert.equal(up.entries[0].id,e.id);assert.equal(up.entries[0].attachments[0].id,'FILE-X')
 assert.equal(up.entries[0].vesselId,ORIGINAL_VESSEL_ID);assert.equal(up.inventory[0].vesselId,ORIGINAL_VESSEL_ID)
 assert.notEqual(up.estimates[0].vesselId,ORIGINAL_VESSEL_ID);assert.equal(up.vessels.length,2)
 assert.equal(up.audit[0].vesselId,ORIGINAL_VESSEL_ID);eq(totals(seed,up,[ORIGINAL_VESSEL_ID]).bank,'92779.85')
 assert.deepEqual(migrateData(up,seed),up)
})
