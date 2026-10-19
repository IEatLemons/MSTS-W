import fs from 'node:fs/promises'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const html=await fs.readFile(path.join(root,'index.html'),'utf8')
const js=await fs.readFile(path.join(root,'prototype/dist/assets/app.js'),'utf8')
const css=await fs.readFile(path.join(root,'prototype/dist/assets/style.css'),'utf8')
assert.ok(html.includes(`<style>${css}</style>`),'CSS matches compiled asset')
assert.ok(html.includes(js.replaceAll('</script','<\\/script')),'JS matches compiled asset')
assert.equal((html.match(/<script\b/g)||[]).length,1)
assert.ok(!/<script[^>]+src=|<link[^>]+(?:stylesheet|modulepreload)|<script[^>]+type="module"/i.test(html),'No external script/style/module dependency')
assert.ok(!/https?:\/\//.test(css),'No remote CSS fonts or resources')
for(const name of ['总账','应收款','应付款','资金／出纳','费用报销','固定资产','发票与税务','基础档案与权限'])assert.ok(js.includes(name),name)
assert.equal(await fs.readFile(path.join(root,'prototype/dist/analysis-report.html'),'utf8'),await fs.readFile(path.join(root,'analysis-report.html'),'utf8'))
console.log('Offline package checks passed: self-contained classic JS/CSS, eight modules, matching read-only history report.')
