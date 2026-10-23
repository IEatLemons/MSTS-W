import { CATEGORIES, VERSION } from './schema.js'
import { sum } from './decimal.js'

export const ORIGINAL_VESSEL_ID='vessel-pioneer-lady'
const copy=value=>JSON.parse(JSON.stringify(value))
const normalized=name=>String(name||'').trim().toLocaleLowerCase()
export function originalVessel(seed){return {id:ORIGINAL_VESSEL_ID,name:seed.vessel,imo:'',company:seed.organization||'',bankAccount:'7982933945'}}
export function emptyBaseline(){return {funds:'0',bank:'0',cash:'0',difference:'0',categories:Object.fromEntries(CATEGORIES.map(c=>[c.id,{amount:'0',completed:'0',fee:'0',receipt:'0',buckets:Array(6).fill('0')}]))}}
export function vesselById(data,id){return data.vessels.find(v=>v.id===id)}
export function selectedVessels(data,scope='all'){return data.vessels.filter(v=>scope==='all'||scope.includes(v.id))}
export function normalizeScope(data,scope){
 if(scope==='all')return 'all'
 const ids=Array.isArray(scope)?[...new Set(scope)].filter(id=>vesselById(data,id)):[]
 return ids.length?ids:'all'
}
export function scopeLabel(data,scope='all'){
 const vessels=selectedVessels(data,scope)
 return scope==='all'?`全部船舶（${vessels.length}）`:vessels.length===1?vessels[0].name:`已选 ${vessels.length} 艘船舶`
}
export function scopeData(data,scope='all'){
 const ids=new Set(selectedVessels(data,scope).map(v=>v.id))
 return {...data,entries:data.entries.filter(e=>ids.has(e.vesselId)),estimates:data.estimates.filter(e=>ids.has(e.vesselId)),inventory:data.inventory.filter(e=>ids.has(e.vesselId))}
}
// Each future history import has its own vessel key, baseline and source rows.
// New vessels deliberately have no imported history; zero is only the new-record calculation origin.
export function historyFor(seed,data,vesselId){
 if(data.histories?.[vesselId])return data.histories[vesselId]
 if(vesselId===ORIGINAL_VESSEL_ID)return {sourceSha256:seed.sourceSha256,asOf:seed.asOf,baseline:seed.baseline,records:seed.records,bank:seed.bank,cells:seed.cells}
 return null
}
export function aggregateBaseline(seed,data,scope='all'){
 const bases=selectedVessels(data,scope).map(v=>historyFor(seed,data,v.id)?.baseline||emptyBaseline())
 const result=emptyBaseline()
 for(const key of ['funds','bank','cash','difference'])result[key]=sum(bases.map(b=>b[key]))
 for(const c of CATEGORIES){
  for(const key of ['amount','completed','fee','receipt'])result.categories[c.id][key]=sum(bases.map(b=>b.categories[c.id]?.[key]))
  result.categories[c.id].buckets=Array.from({length:6},(_,i)=>sum(bases.map(b=>b.categories[c.id]?.buckets?.[i])))
 }
 return result
}
export function vesselFields(data,id){const v=vesselById(data,id);return {vesselId:id,vesselName:v?.name||'未知船舶',imo:v?.imo||'',company:v?.company||''}}
export function walletsFor(data,id){
 const v=vesselById(data,id)
 return [{id:'bank',name:`${v?.name||'所选船舶'} · 银行 · ${v?.bankAccount||'未填写账号'} · USD`},{id:'cash',name:`${v?.name||'所选船舶'} · 船长备用金 · USD`}]
}
export function migrateData(saved,seed){
 if(saved.version>VERSION)throw Error('本地账本来自更新版本，请保留数据并使用对应版本打开')
 const data=copy(saved)
 data.vessels=data.vessels?.length?data.vessels:[originalVessel(seed)]
 data.histories=data.histories||{}
 for(const key of ['owners','ownerships','crewMembers','crewAssignments'])data[key]=data[key]||[]
 if(data.version<2){
  const resolveName=name=>{
   if(!normalized(name))return ORIGINAL_VESSEL_ID
   let v=data.vessels.find(v=>normalized(v.name)===normalized(name))
   if(!v){v={id:`vessel-legacy-${data.vessels.length}`,name:String(name).trim(),imo:'',company:'',bankAccount:'',needsReview:true};data.vessels.push(v)}
   return v.id
  }
  for(const e of data.entries)e.vesselId=ORIGINAL_VESSEL_ID
  for(const e of data.inventory)e.vesselId=ORIGINAL_VESSEL_ID
  for(const e of data.estimates)e.vesselId=resolveName(e.vessel)
  const entities=new Map([...data.entries,...data.estimates,...data.inventory].map(e=>[e.id,e.vesselId]))
  for(const log of data.audit){
   log.vesselId=log.action==='code'?null:entities.get(log.entityId)||ORIGINAL_VESSEL_ID
   for(const key of ['before','after'])if(log[key]&&log.vesselId)log[key].vesselId=log.vesselId
  }
 }
 if(data.version<VERSION)data.migration={from:data.version,to:VERSION,at:new Date().toISOString()}
 data.version=VERSION
 return data
}
