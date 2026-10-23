import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {createData,createLedger,totals} from '../../src/ledger/engine.js'
import {migrateData,ORIGINAL_VESSEL_ID} from '../../src/ledger/vessels.js'
import {VERSION} from '../../src/ledger/schema.js'
import {DIRECTORY_ACTIONS,activeOn,certificateState} from '../../src/ledger/directory.js'
const seed=JSON.parse(fs.readFileSync(new URL('../../src/ledger/source.json',import.meta.url),'utf8'))
const setup=()=>{const data=createData(seed),context={role:'finance',vesselScope:[ORIGINAL_VESSEL_ID]};return {data,context,engine:createLedger(data,context,seed)}}
const save=(s,action,raw)=>s.engine.confirm(s.engine.prepare(action,raw).token)
const owner=(s,name,entityType='company')=>save(s,'owner',{name,entityType})
const crew=(s,name)=>save(s,'crew',{name,rank:'船长'})
const relation=(o,more={})=>({vesselId:ORIGINAL_VESSEL_ID,ownerId:o.id,role:'registered',startDate:'2026-10-01',...more})
const finance=s=>{const t=totals(seed,s.data);return JSON.stringify({bank:t.bank,cash:t.cash,funds:t.funds,difference:t.difference,categories:t.categories,movements:t.movements,entries:s.data.entries})}

test('v2升级保留船名、银行账号、编号、附件与账目，不将所属公司猜作船东，升级幂等',()=>{
 const s=setup(),old=JSON.parse(JSON.stringify(s.data));old.version=2
 for(const key of ['owners','ownerships','crewMembers','crewAssignments'])delete old[key]
 old.entries=[{id:'LED-OLD',vesselId:ORIGINAL_VESSEL_ID,fields:{invoice_usd:'123.4500'},attachments:[{id:'ATT-OLD',name:'invoice.pdf'}]}]
 const before=JSON.stringify(old),up=migrateData(old,seed)
 assert.equal(JSON.stringify(old),before);assert.equal(up.version,VERSION)
 assert.deepEqual(up.vessels,old.vessels);assert.deepEqual(up.entries,old.entries)
 for(const key of ['owners','ownerships','crewMembers','crewAssignments'])assert.deepEqual(up[key],[])
 assert.deepEqual(migrateData(up,seed),up)
})
test('公司和个人船东预览后才保存，可重名，个人不保留公司专属编号；修改留审计',()=>{
 const s=setup(),p=s.engine.prepare('owner',{name:'公司甲',entityType:'company',registrationNo:'REG-1',country:'中国'})
 assert.equal(s.data.owners.length,0);p.payload.name='篡改预览';const a=s.engine.confirm(p.token)
 assert.equal(a.name,'公司甲');assert.throws(()=>s.engine.confirm(p.token),/失效/)
 const b=save(s,'owner',{name:'李某',entityType:'person',registrationNo:'不应保留'})
 assert.equal(b.registrationNo,'');assert.equal(b.imoNumber,'')
 const renamed=save(s,'owner',{...a,name:'公司甲新名'})
 assert.equal(renamed.id,a.id);assert.equal(s.data.audit[0].before.name,'公司甲');assert.equal(s.data.audit[0].after.name,'公司甲新名')
 assert.throws(()=>save(s,'owner',{name:'另一个公司',entityType:'company',registrationNo:'REG-1',country:'中国'}),/已存在/)
})
test('多船东按角色和有效期间限制权益比例，结束历史后可重新关联',()=>{
 const s=setup(),a=owner(s,'甲'),b=owner(s,'乙','person')
 const first=save(s,'ownership',relation(a,{share:'60',endDate:'2026-11-01'}))
 save(s,'ownership',relation(b,{share:'40',endDate:'2026-11-01'}))
 const c=owner(s,'丙'),before=JSON.stringify(s.data)
 assert.throws(()=>save(s,'ownership',relation(c,{share:'1'})),/不能超过100/)
 assert.equal(JSON.stringify(s.data),before)
 // Existing relationships are retained even when later relationships begin.
 const next=save(s,'ownership',relation(a,{share:'100',startDate:'2026-11-01'}))
 assert.equal(activeOn(first,'2026-10-31'),true);assert.equal(activeOn(first,'2026-11-01'),false);assert.equal(activeOn(next,'2026-11-01'),true)
 assert.throws(()=>save(s,'ownership',relation(a,{startDate:'2026-11-02'})),/不能重叠/)
 save(s,'ownership',relation(b,{role:'beneficial',share:'100'}))
 assert.equal(s.data.ownerships.length,4);assert.ok(before.includes(first.id))
})
test('关系不能指向不存在的主体，已有关系不可直接换船东或船舶',()=>{
 const s=setup(),a=owner(s,'甲'),b=owner(s,'乙')
 assert.throws(()=>save(s,'ownership',{...relation(a),vesselId:'missing'}),/船舶/)
 assert.throws(()=>save(s,'ownership',{...relation(a),ownerId:'missing'}),/船东/)
 assert.throws(()=>save(s,'ownership',relation(a,{share:'-1'})),/权益比例/)
 assert.throws(()=>save(s,'ownership',relation(a,{endDate:'2026-10-01'})),/晚于/)
 const r=save(s,'ownership',relation(a))
 assert.throws(()=>save(s,'ownership',{...r,ownerId:b.id}),/不能改属/)
 save(s,'owner',{...b,status:'inactive'});assert.throws(()=>save(s,'ownership',relation(b)),/停用/)
})
test('船员档案与任职历史分离，跨船重叠任职阻止保存，同日调船不重叠',()=>{
 const s=setup(),c=crew(s,'测试船员'),v=save(s,'vessel',{name:'第二艘船'})
 const raw={crewId:c.id,vesselId:ORIGINAL_VESSEL_ID,rank:'船长',startDate:'2026-10-01'}
 const a=save(s,'crewAssignment',raw)
 assert.throws(()=>save(s,'crewAssignment',{...raw,vesselId:v.id,startDate:'2026-10-15'}),/重叠/)
 save(s,'crewAssignment',{...a,endDate:'2026-11-01'})
 const b=save(s,'crewAssignment',{...raw,vesselId:v.id,startDate:'2026-11-01'})
 assert.equal(s.data.crewAssignments.length,2);assert.equal(b.crewId,c.id)
 assert.throws(()=>save(s,'crewAssignment',{...b,crewId:'missing'}),/不能改属/)
 assert.throws(()=>save(s,'crewAssignment',{...raw,startDate:'2026-12-01',plannedEndDate:'2026-11-01'}),/预计离船/)
})
test('船员证书校验真实日期，过期与临近到期提示；人员编号唯一',()=>{
 const s=setup(),c=save(s,'crew',{name:'甲',seafarerNo:'CREW-01',certificates:[{name:'适任证书',number:'CERT-01',issuedOn:'2024-01-01',expiresOn:'2026-12-01'}]})
 assert.equal(c.certificates[0].number,'CERT-01')
 assert.equal(certificateState(c.certificates[0],'2026-10-22'),'90天内到期')
 assert.equal(certificateState({expiresOn:'2026-10-01'},'2026-10-22'),'已过期')
 assert.equal(certificateState({expiresOn:''},'2026-10-22'),'未设到期日')
 assert.throws(()=>save(s,'crew',{name:'乙',seafarerNo:'CREW-01'}),/已存在/)
 assert.throws(()=>save(s,'crew',{name:'乙',certificates:[{name:'证书',expiresOn:'2026-02-30'}]}),/无效/)
 assert.throws(()=>save(s,'crew',{name:'乙',certificates:[{name:''}]}),/名称/)
})
test('所有基础资料写入复用权限和失效预览限制',()=>{
 const s=setup();s.context.role='reader'
 for(const action of DIRECTORY_ACTIONS)assert.throws(()=>s.engine.prepare(action,{}),/财务/)
 s.context.role='finance';const p=s.engine.prepare('crew',{name:'甲'});owner(s,'资料发生改变')
 assert.throws(()=>s.engine.confirm(p.token),/重新预览/)
 const next=s.engine.prepare('crew',{name:'乙'});s.context.role='reader';assert.throws(()=>s.engine.confirm(next.token),/财务/)
})
test('基础档案、股权和船员任职不会改变看板金额、原始底稿和已有分船筛选',()=>{
 const s=setup(),baseline=finance(s),source=JSON.stringify(seed),scope=JSON.stringify(s.context.vesselScope)
 const original=s.data.vessels[0],a=owner(s,'个人船东','person'),c=crew(s,'测试船长')
 save(s,'vessel',{...original,name:original.name,flag:'Bahamas',vesselType:'散货船'})
 assert.equal(s.data.vessels[0].bankAccount,'7982933945')
 save(s,'ownership',relation(a,{share:'100'}))
 save(s,'crewAssignment',{crewId:c.id,vesselId:original.id,rank:'船长',startDate:'2026-10-01'})
 assert.equal(finance(s),baseline);assert.equal(JSON.stringify(seed),source);assert.equal(JSON.stringify(s.context.vesselScope),scope)
 assert.ok(s.data.audit.some(log=>log.action==='ownership'&&log.vesselId===original.id))
 s.engine.reset();assert.equal(s.data.owners.length,0);assert.equal(s.data.crewMembers.length,0);assert.equal(s.data.ownerships.length,0);assert.equal(s.data.crewAssignments.length,0)
})
