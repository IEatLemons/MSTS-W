import { reactive, toRaw } from 'vue'
import { createDemo } from './demo.js'
import { createEngine } from './engine.js'

export const dbState = reactive({ ready: false, persistence: '正在载入本地演示', message: '', error: '', saving: false })
export const context = reactive({ companyId: 'MSTS', vesselId: '', period: '2026-10', roleId: 'demo' })
export const data = reactive(createDemo())
export const engine = createEngine(data, context)
let database
let queue = Promise.resolve()
const memoryFiles = new Map()
function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('浏览器未提供 IndexedDB'))
    let settled = false
    const timer = setTimeout(() => { settled = true; reject(new Error('本地存储响应超时')) }, 3000)
    const request = indexedDB.open('msts-finance-prototype-v2', 1)
    request.onupgradeneeded = () => { request.result.createObjectStore('state'); request.result.createObjectStore('files') }
    request.onsuccess = () => { clearTimeout(timer); if (settled) request.result.close(); else { settled = true; resolve(request.result) } }
    request.onerror = () => { clearTimeout(timer); settled = true; reject(request.error) }
    request.onblocked = () => { clearTimeout(timer); settled = true; reject(new Error('本地数据库被其他标签页占用')) }
  })
}
function read(key, store = 'state') {
  return new Promise((resolve, reject) => {
    const request = database.transaction(store).objectStore(store).get(key)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
function write(key, value, store = 'state') {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(store, 'readwrite')
    transaction.objectStore(store).put(value, key)
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
export async function initialize() {
  try {
    database = await openDatabase()
    const saved = await read('snapshot')
    if (saved?.data?.version === 3) {
      Object.assign(data, saved.data)
      Object.assign(context, saved.context)
    }
    dbState.persistence = '已保存至此浏览器 · 可离线使用'
  } catch {
    database = null
    dbState.persistence = '仅当前会话有效 · 浏览器本地存储不可用'
  }
  dbState.ready = true
}
export function persist() {
  if (!database) return Promise.resolve()
  const snapshot = { data: JSON.parse(JSON.stringify(toRaw(data))), context: { ...context } }
  queue = queue.catch(() => {}).then(async () => {
    dbState.saving = true
    try { await write('snapshot', snapshot) }
    catch { dbState.persistence = '保存失败 · 本次更改仅当前会话有效'; database = null }
    finally { dbState.saving = false }
  })
  return queue
}
export async function perform(fn, message = '操作已完成') {
  dbState.error = ''; dbState.message = ''
  try { const result = fn(); await persist(); dbState.message = message; return result }
  catch (error) { dbState.error = error.message; throw error }
}
export async function attach(entityId, file, kind) {
  const entity = data.documents.find(d => d.id === entityId) || data.movements.find(d => d.id === entityId)
  if (!entity || entity.companyId !== context.companyId || !engine.access('attach')) throw new Error('没有该账套附件权限')
  if (file.size > 10 * 1024 * 1024) throw new Error('原型附件上限为 10 MB')
  const attachment = { id: `ATT-${++data.serial}`, entityId, companyId: entity.companyId, name: file.name, size: file.size, kind, at: new Date().toISOString() }
  if (database) {
    try { await write(attachment.id, file, 'files') }
    catch { throw new Error('附件保存失败，请检查浏览器存储空间后重试') }
  } else memoryFiles.set(attachment.id, file)
  data.attachments.push(attachment)
  engine.audit('上传附件', entityId, entity.companyId, `${kind} / ${file.name}`)
  await persist()
}
export async function getFile(attachmentId) { return database ? read(attachmentId, 'files') : memoryFiles.get(attachmentId) }
export async function resetDemo() {
  if (!engine.access('reset')) throw new Error('当前角色不能重置演示')
  await queue
  if (database) await new Promise((resolve, reject) => {
    const t = database.transaction(['state','files'], 'readwrite')
    t.objectStore('state').clear(); t.objectStore('files').clear()
    t.oncomplete = resolve; t.onerror = () => reject(t.error)
  })
  memoryFiles.clear()
  Object.assign(data, createDemo())
  Object.assign(context, { companyId: 'MSTS', vesselId: '', period: '2026-10', roleId: 'demo' })
  await persist()
}
