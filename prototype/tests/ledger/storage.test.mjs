import test from 'node:test'
import assert from 'node:assert/strict'
import { ORIGINAL_VESSEL_ID } from '../../src/ledger/vessels.js'
import { initialize,storage,ledger,data,seed,confirmPreview,getFile,resetDemo } from '../../src/ledger/store.js'
test('无IndexedDB时明确提示当前会话、保存附件可读、重置恢复底稿',async()=>{
 await initialize();assert.match(storage.message,/仅当前会话/)
 const original=JSON.stringify(seed)
 const p=ledger.prepare('entry',{vesselId:ORIGINAL_VESSEL_ID,direction:'out',kind:'expense',fields:{posting_date:'2026-10-20',description:'附件演练',supplier_id:'Demo',original_amount:'10',usd_conversion_rate:'1',payment_status:'Received'},allocations:[{category:'shipmanagement',amount:'10'}],attachments:[{id:'BLOB-1',name:'sample.txt',kind:'invoice_attachment',size:6}]})
 assert.equal(data.entries.length,0)
 await confirmPreview(p,[{id:'BLOB-1',file:new Blob(['sample'])}])
 assert.equal(data.entries.length,1);assert.equal(await(await getFile('BLOB-1')).text(),'sample')
 await resetDemo();assert.equal(data.entries.length,0);assert.equal(await getFile('BLOB-1'),null);assert.equal(JSON.stringify(seed),original)
})
