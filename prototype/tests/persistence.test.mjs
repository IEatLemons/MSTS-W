import test from 'node:test'
import assert from 'node:assert/strict'
import { initialize, engine, data, dbState, context, perform, attach, getFile, resetDemo } from '../src/finance/store.js'
test('无IndexedDB时明确回退当前会话，附件可读，重置不留业务残片',async()=>{
 await initialize()
 assert.match(dbState.persistence,/当前会话/)
 const d=await perform(()=>engine.create('invoice',{description:'附件测试',number:'ATT-QA',partyId:'VENDOR-1',amount:10000}),'已保存')
 const file=new File(['fictional BankSlip'],'bankslip-demo.txt',{type:'text/plain'})
 await attach(d.id,file,'BankSlip')
 const a=data.attachments.find(a=>a.entityId===d.id)
 assert.ok(a)
 assert.equal(await (await getFile(a.id)).text(),'fictional BankSlip')
 context.roleId='clerk'
 await assert.rejects(()=>resetDemo())
 context.roleId='demo'
 await resetDemo()
 assert.equal(data.attachments.length,0)
 assert.equal(data.documents.some(x=>x.id===d.id),false)
 assert.equal(await getFile(a.id),undefined)
})
