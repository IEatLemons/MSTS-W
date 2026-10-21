import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { SHEETS,DATABASE_NAME } from '../src/ledger/schema.js'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const read=p=>fs.readFile(path.join(root,p),'utf8')
const [html,js,css,dist,release]=await Promise.all([read('index.html'),read('prototype/dist/assets/app.js'),read('prototype/dist/assets/style.css'),read('prototype/dist/index.html'),read('releases/full-finance-20261020/release.json').then(JSON.parse)])
assert.equal(html,dist,'root and dist entry match')
assert.ok(html.includes(`<style>${css}</style>`));assert.ok(html.includes(js.replaceAll('</script','<\\/script')))
assert.equal((html.match(/<script\b/g)||[]).length,1)
assert.ok(!/<script[^>]+src=|<link[^>]+(?:stylesheet|modulepreload)|<script[^>]+type="module"/i.test(html),'self contained offline entry')
assert.ok(!/https?:\/\//.test(css),'no external fonts or CSS resources')
for(const s of SHEETS)assert.ok(js.includes(s.name),s.name)
assert.ok(js.includes(DATABASE_NAME),'independent local database')
const sealed=await fs.readFile(path.join(root,'releases/full-finance-20261020/index.html'))
assert.equal(createHash('sha256').update(sealed).digest('hex'),release.entry_sha256)
assert.equal(await read('prototype/dist/releases/full-finance-20261020/index.html'),sealed.toString())
const excel=await fs.readFile(path.join(root,'source/MV PIONEER LAY 费用统计SOFP--20261014(1).xlsx'))
assert.equal(createHash('sha256').update(excel).digest('hex'),release.excel_sha256)
console.log('Offline checks passed: 14 sheets, independent database, root/dist synchronized, unchanged Excel and sealed version.')
