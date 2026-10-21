import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const read=name=>fs.readFile(path.join(root,name),'utf8').then(JSON.parse)
const [raw,bundle]=await Promise.all([read('data/workbook_raw.json'),read('data/analysis_bundle.json')])
const excel=await fs.readFile(path.join(root,'source',raw.source_name))
if(createHash('sha256').update(excel).digest('hex')!==raw.source_sha256)throw Error('Excel与已提取底稿不一致，请先重新核对提取结果')
const cells=raw.cells.map(c=>({sheet:c.sheet,cell:c.cell,row:c.row,column:c.column,value:c.value,formula:c.formula||''}))
const value=(sheet,cell)=>cells.find(c=>c.sheet===sheet&&c.cell===cell)?.value??null
const costRows={shipmanagement:6,owner:7,takeover:8,flag:9,drydock:null}
const categories=Object.fromEntries(Object.entries(costRows).map(([id,r])=>[id,{amount:r?value('Cost Checking',`C${r}`):0,completed:r?value('Cost Checking',`I${r}`):0,fee:r?value('Cost Checking',`J${r}`):0,buckets:r?['D','E','F','G','H','I'].map(col=>value('Cost Checking',`${col}${r}`)):Array(6).fill(0),receipt:{shipmanagement:value('Cost Checking','C15'),owner:value('Cost Checking','F15'),takeover:value('Cost Checking','I15'),flag:value('Cost Checking','I18'),drydock:0}[id]}]))
const result={sourceName:raw.source_name,sourceSha256:raw.source_sha256,asOf:'2026-10-14',organization:value('SOFP','I2'),vessel:value('SOFP','D3'),sheets:raw.sheets.map(s=>({name:s.name,dimension:s.dimension})),fields:bundle.fields.map(({sheet,column,source_header,field,type})=>({sheet,column,header:source_header,field,type})),records:bundle.records,bank:bundle.bank,codes:bundle.codes,cells,baseline:{funds:value('SOFP','D33'),bank:value('SOFP','D34'),cash:value('SOFP','D35'),difference:value('SOFP','D41'),categories}}
await fs.mkdir(path.join(root,'prototype/src/ledger'),{recursive:true})
await fs.writeFile(path.join(root,'prototype/src/ledger/source.json'),JSON.stringify(result)+'\n')
console.log(`Prepared ${result.sheets.length} sheets, ${result.records.length} source rows, ${result.bank.length} bank movements; source ${result.sourceSha256}`)
