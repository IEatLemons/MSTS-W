import { reactive, toRaw } from 'vue'
import source from './source.json' with { type: 'json' }
import { DATABASE_NAME, VERSION } from './schema.js'
import { createData, createLedger } from './engine.js'

export const seed=source
export const context=reactive({role:'finance'})
export const data=reactive(createData(seed))
export const ledger=createLedger(data,context,seed)
export const storage=reactive({ready:false,message:'正在载入本地账本',notice:'',error:'',busy:false})
let database=null,queue=Promise.resolve()
const memoryFiles=new Map()
export async function initialize(){
  try{
    if(!globalThis.indexedDB)throw Error('浏览器未提供本地数据库')
    database=await new Promise((resolve,reject)=>{
      let settled=false
      const timer=setTimeout(()=>{settled=true;reject(Error('本地存储超时'))},2500)
      const req=indexedDB.open(DATABASE_NAME,1)
      req.onupgradeneeded=()=>{req.result.createObjectStore('state');req.result.createObjectStore('files')}
      req.onsuccess=()=>{clearTimeout(timer);if(settled)req.result.close();else{settled=true;resolve(req.result)}}
      req.onerror=()=>{clearTimeout(timer);settled=true;reject(req.error)}
      req.onblocked=()=>{clearTimeout(timer);settled=true;reject(Error('本地存储被占用'))}
    })
    const saved=await new Promise((resolve,reject)=>{
      const req=database.transaction('state').objectStore('state').get('snapshot')
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)
    })
    if(saved?.data?.version===VERSION&&saved.data.sourceSha256===seed.sourceSha256){
      Object.assign(data,saved.data)
      if(['finance','reader'].includes(saved.role))context.role=saved.role
    }
    storage.message='已保存到此浏览器'
  }catch{database=null;storage.message='仅当前会话有效 · 本地存储不可用'}
  storage.ready=true
}
async function writeSnapshot(attachments=[]){
  const snapshot={data:JSON.parse(JSON.stringify(toRaw(data))),role:context.role}
  for(const f of attachments)memoryFiles.set(f.id,f.file)
  if(!database)return
  try{
    await new Promise((resolve,reject)=>{
      const t=database.transaction(['state','files'],'readwrite')
      t.objectStore('state').put(snapshot,'snapshot')
      for(const f of attachments)t.objectStore('files').put(f.file,f.id)
      t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)
    })
    storage.message='已保存到此浏览器'
  }catch{database?.close();database=null;storage.message='保存失败 · 本次更改及附件仅当前会话有效'}
}
export function persistContext(){queue=queue.catch(()=>{}).then(()=>writeSnapshot());return queue}
export async function confirmPreview(preview,attachments=[]){
  if(storage.busy)throw Error('正在保存，请勿重复提交')
  storage.busy=true;storage.error=''
  try{
    const result=ledger.confirm(preview.token)
    queue=queue.catch(()=>{}).then(()=>writeSnapshot(attachments));await queue
    storage.notice=preview.action==='void'?'账目已作废，相关金额已更新':'已确认保存，相关分表已更新'
    return result
  }catch(error){storage.error=error.message;throw error}
  finally{storage.busy=false}
}
export async function getFile(id){
  if(memoryFiles.has(id))return memoryFiles.get(id)
  if(!database)return null
  return new Promise((resolve,reject)=>{
    const r=database.transaction('files').objectStore('files').get(id)
    r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error)
  })
}
export async function resetDemo(){
  ledger.finance();await queue;ledger.reset();memoryFiles.clear()
  if(database)await new Promise((resolve,reject)=>{
    const t=database.transaction(['state','files'],'readwrite');t.objectStore('state').clear();t.objectStore('files').clear()
    t.oncomplete=resolve;t.onerror=()=>reject(t.error)
  })
  await writeSnapshot();storage.notice='已恢复 Excel 演示底稿；旧版数据保持不变'
}
export function downloadFile(file,name){
  const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
}
