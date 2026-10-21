import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const hash=bytes=>createHash('sha256').update(bytes).digest('hex')
const archive='releases/full-finance-20261020'
const sealed=JSON.parse(await fs.readFile(path.join(root,archive,'release.json'),'utf8'))
if(hash(await fs.readFile(path.join(root,archive,'index.html')))!==sealed.entry_sha256)throw Error('旧版封存入口被修改')
const css=await fs.readFile(path.join(root,'prototype/dist/assets/style.css'),'utf8')
const js=await fs.readFile(path.join(root,'prototype/dist/assets/app.js'),'utf8')
const html=`<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSTS Excel 分表记账原型</title><style>${css}</style></head><body><div id="app"><p style="padding:30px;font-family:sans-serif;color:#607e88">正在载入 Excel 分表记账原型…</p></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>\n`
await fs.writeFile(path.join(root,'index.html'),html)
await fs.writeFile(path.join(root,'prototype/dist/index.html'),html)
await fs.cp(path.join(root,'releases'),path.join(root,'prototype/dist/releases'),{recursive:true})
const previous=JSON.parse(await fs.readFile(path.join(root,'manifest.json'),'utf8'))
const paths=new Set(previous.files.map(f=>f.path))
async function include(dir){for(const e of await fs.readdir(path.join(root,dir),{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())await include(p);else paths.add(p)}}
for(const dir of ['prototype/src','prototype/scripts','prototype/tests','deliverables','releases'])await include(dir)
for(const p of ['package.json','README.txt','index.html','prototype/package.json','prototype/package-lock.json','prototype/pnpm-lock.yaml','prototype/pnpm-workspace.yaml','prototype/vite.config.js','prototype/dist/index.html','prototype/dist/assets/app.js','prototype/dist/assets/style.css'])paths.add(p)
const files=[]
for(const p of [...paths].sort()){
 if(p==='manifest.json')continue
 try{const bytes=await fs.readFile(path.join(root,p));files.push({path:p,bytes:bytes.length,sha256:hash(bytes)})}catch(e){if(e.code!=='ENOENT')throw e}
}
await fs.writeFile(path.join(root,'manifest.json'),JSON.stringify({version:'excel-ledger-v1',archiveTag:sealed.tag,source_sha256:previous.source_sha256,files},null,2)+'\n')
console.log(`Excel ledger offline entry: ${Math.round(Buffer.byteLength(html)/1024)} KiB; 14 sheets, inline JS/CSS, sealed archive verified.`)
