import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const css=await fs.readFile(path.join(root,'prototype/dist/assets/style.css'),'utf8')
const js=await fs.readFile(path.join(root,'prototype/dist/assets/app.js'),'utf8')
const html=`<!doctype html>\n<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSTS 船舶管理财务系统 · 产品原型</title><style>${css}</style></head><body><div id="app"><p style="padding:30px;color:#557268;font-family:sans-serif">正在载入 MSTS 财务演示工作区…</p></div><script>${js.replaceAll('</script','<\\/script')}</script></body></html>\n`
await fs.writeFile(path.join(root,'index.html'),html)
// dist is independently shareable, including the read-only legacy report.
await fs.copyFile(path.join(root,'analysis-report.html'),path.join(root,'prototype/dist/analysis-report.html'))
const manifest = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8'))
const paths = new Set(manifest.files.map(file => file.path))
async function includeDirectory(directory) {
  for (const entry of await fs.readdir(path.join(root, directory), { withFileTypes: true })) {
    const relative = `${directory}/${entry.name}`
    if (entry.isDirectory()) await includeDirectory(relative)
    else paths.add(relative)
  }
}
for (const directory of ['prototype/src', 'prototype/scripts', 'prototype/tests', 'deliverables']) await includeDirectory(directory)
for (const file of ['index.html','README.txt','analysis-report.html','analysis/prototype_verification.json','prototype/package.json','prototype/vite.config.js','prototype/dist/index.html','prototype/dist/assets/app.js','prototype/dist/assets/style.css']) paths.add(file)
manifest.files = await Promise.all([...paths].sort().map(async relative => {
  const bytes = await fs.readFile(path.join(root, relative))
  return { path: relative, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') }
}))
await fs.writeFile(path.join(root,'manifest.json'), JSON.stringify(manifest,null,2)+'\n')
console.log(`Packaged root index.html (${Math.round(Buffer.byteLength(html)/1024)} KiB), no external JS/CSS.`)
