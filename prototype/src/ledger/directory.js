import { compare, decimal, sum } from './decimal.js'

const field=(key,label,type='text',extra={})=>({key,label,type,...extra})
const group=(title,fields)=>({title,fields})
const options=(...items)=>items.map(item=>Array.isArray(item)?item:[item,item])
export const RANKS=['船长','大副','二副','三副','轮机长','大管轮','二管轮','三管轮','电子电气员','水手长','水手','机工','厨师','实习生','其他']
export const DEPARTMENTS=options('甲板部','轮机部','事务部','其他')
export const DIRECTORY_TYPES={
 vessel:{collection:'vessels',prefix:'SHIP',title:'船舶档案',noun:'船舶',description:'维护船舶识别、登记、管理和账户资料，账目始终引用原船舶编号。',groups:[
  group('船舶识别',[field('name','船名','text',{required:true}),field('imo','IMO'),field('englishName','英文 / 曾用名称'),field('vesselType','船舶类型','select',{options:options('散货船','集装箱船','油轮','化学品船','杂货船','客船','拖轮','其他')}),field('mmsi','MMSI'),field('callSign','呼号')]),
  group('登记与技术资料',[field('flag','船旗 / 船籍国'),field('registryPort','船籍港'),field('classificationSociety','船级社'),field('builtYear','建造年份'),field('grossTonnage','总吨 GT','number'),field('deadweight','载重吨 DWT','number')]),
  group('管理资料',[field('company','管理 / 所属公司'),field('status','管理状态','select',{required:true,options:options(['active','在管'],['laid-up','停航'],['inactive','结束管理']),default:'active'}),field('managementStart','管理开始日期','date'),field('managementEnd','管理结束日期','date'),field('bankAccount','银行账号'),field('notes','备注','textarea')])]},
 owner:{collection:'owners',prefix:'OWNER',title:'船东档案',noun:'船东',description:'公司或个人独立建档，可关联多艘船；登记船东与实际权益人分别记录。',groups:[
  group('主体信息',[field('entityType','船东类型','select',{required:true,options:options(['company','公司'],['person','个人']),default:'company'}),field('name','船东名称 / 姓名','text',{required:true}),field('shortName','简称'),field('country','国家 / 地区'),field('registrationNo','公司注册编号','text',{companyOnly:true}),field('imoNumber','IMO 公司 / 船东编号','text',{companyOnly:true}),field('status','档案状态','select',{required:true,options:options(['active','使用中'],['inactive','停用']),default:'active'})]),
  group('联系资料',[field('contactName','联系人'),field('phone','电话'),field('email','电子邮箱','email'),field('address','联系地址','textarea'),field('notes','备注','textarea')])]},
 ownership:{collection:'ownerships',prefix:'OWNREL',title:'船东关系',noun:'船东关系',description:'一船可关联多个船东，一个船东可关联多船；按生效日期保留变更历史。',groups:[
  group('关联主体',[field('vesselId','所属船舶','vessel',{required:true}),field('ownerId','船东','owner',{required:true}),field('role','关系类型','select',{required:true,options:options(['registered','登记船东'],['beneficial','实际权益人']),default:'registered'}),field('share','权益比例 %','number')]),
  group('有效期间',[field('startDate','生效日期','date',{required:true}),field('endDate','终止日期','date'),field('notes','备注','textarea')])]},
 crew:{collection:'crewMembers',prefix:'CREW',title:'船员档案',noun:'船员',description:'人员资料独立于船舶，任职和调船通过上船记录维护，证书保存在个人档案中。',groups:[
  group('人员资料',[field('name','船员姓名','text',{required:true}),field('englishName','英文姓名'),field('nationality','国籍'),field('birthDate','出生日期','date'),field('seafarerNo','海员证 / 人员编号'),field('rank','常任职务','rank'),field('department','部门','select',{options:DEPARTMENTS}),field('status','人员状态','select',{required:true,options:options(['active','可安排'],['inactive','停用']),default:'active'})]),
  group('联系资料',[field('phone','联系电话'),field('email','电子邮箱','email'),field('emergencyContact','紧急联系人'),field('emergencyPhone','紧急联系电话'),field('notes','备注','textarea')])]},
 crewAssignment:{collection:'crewAssignments',prefix:'ASSIGN',title:'上船记录',noun:'上船记录',description:'记录船员在哪艘船、担任何种职务以及上离船日期，调船保留原任职历史。',groups:[
  group('任职信息',[field('crewId','船员','crew',{required:true}),field('vesselId','任职船舶','vessel',{required:true}),field('rank','本次任职','rank',{required:true}),field('department','本次任职部门','select',{options:DEPARTMENTS})]),
  group('上离船安排',[field('startDate','上船日期','date',{required:true}),field('plannedEndDate','预计离船日期','date'),field('endDate','实际离船日期','date'),field('contractNo','合同 / 派遣编号'),field('notes','备注','textarea')])]}
}
export const DIRECTORY_ACTIONS=Object.keys(DIRECTORY_TYPES)
export const localDay=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export const activeOn=(row,day=localDay())=>row.startDate<=day&&(!row.endDate||row.endDate>day)
export const relationState=(row,day=localDay())=>row.startDate>day?'待生效':row.endDate&&row.endDate<=day?'已结束':'生效中'
export function certificateState(cert,day=localDay()){
 if(!cert.expiresOn)return '未设到期日'
 const days=(Date.parse(cert.expiresOn+'T00:00:00Z')-Date.parse(day+'T00:00:00Z'))/86400000
 return days<0?'已过期':days<=90?'90天内到期':'有效'
}
export function directoryDraft(action,initial={}){
 const defaults=Object.fromEntries(DIRECTORY_TYPES[action].groups.flatMap(g=>g.fields.map(f=>[f.key,f.default??''])))
 if(action==='ownership'||action==='crewAssignment')defaults.startDate=localDay()
 if(action==='crew')defaults.certificates=[]
 return {...defaults,...JSON.parse(JSON.stringify(initial))}
}
const text=value=>String(value??'').trim()
function validDate(value,label){
 if(!value)return ''
 const d=new Date(value+'T00:00:00Z')
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error(`${label}无效`)
 return value
}
const overlaps=(a,b)=>a.startDate<(b.endDate||'9999-12-31')&&b.startDate<(a.endDate||'9999-12-31')
function period(row){if(row.endDate&&row.endDate<=row.startDate)throw Error('终止 / 离船日期必须晚于开始日期；当日起不再计为在任')}
function ref(data,collection,id,label){const item=data[collection].find(x=>x.id===id);if(!item)throw Error(`请选择有效的${label}`);return item}
export function normalizeDirectory(action,raw,data){
 const config=DIRECTORY_TYPES[action]
 const before=raw.id?ref(data,config.collection,raw.id,config.noun):null
 const payload={...(before||{})}
 for(const f of config.groups.flatMap(g=>g.fields)){
  const value=text(raw[f.key]??before?.[f.key]??f.default)
  if(f.required&&!value)throw Error(`请填写${f.label}`)
  if(f.type==='date')validDate(value,f.label)
  if(f.options&&value&&!f.options.some(o=>o[0]===value))throw Error(`请选择有效的${f.label}`)
  if(f.type==='email'&&value&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))throw Error('电子邮箱格式无效')
  payload[f.key]=value
 }
 if(action==='vessel'){
  if(payload.imo&&!/^\d{7,8}$/.test(payload.imo))throw Error('IMO 需填写7位或8位数字，或留空')
  if(payload.mmsi&&!/^\d{9}$/.test(payload.mmsi))throw Error('MMSI 需填写9位数字，或留空')
  if(payload.builtYear&&!/^(18|19|20|21)\d{2}$/.test(payload.builtYear))throw Error('建造年份需填写有效的4位年份')
  for(const key of ['grossTonnage','deadweight'])if(payload[key]){payload[key]=decimal(payload[key]);if(compare(payload[key],'0')<0)throw Error('吨位不能为负数')}
  if(payload.managementStart&&payload.managementEnd&&payload.managementEnd<payload.managementStart)throw Error('管理结束日期不能早于开始日期')
  if(data.vessels.some(v=>v.id!==before?.id&&(v.name.toLocaleLowerCase()===payload.name.toLocaleLowerCase()||(payload.imo&&v.imo===payload.imo))))throw Error('船名或 IMO 已存在')
  payload.needsReview=false
 }else if(action==='owner'){
  if(payload.entityType==='person'){payload.registrationNo='';payload.imoNumber=''}
  if(payload.imoNumber&&!/^\d{7,8}$/.test(payload.imoNumber))throw Error('IMO 公司 / 船东编号需填写7位或8位数字')
  if(payload.imoNumber&&data.owners.some(o=>o.id!==before?.id&&o.imoNumber===payload.imoNumber))throw Error('IMO 公司 / 船东编号已存在')
  if(payload.registrationNo&&data.owners.some(o=>o.id!==before?.id&&o.entityType==='company'&&o.country===payload.country&&o.registrationNo===payload.registrationNo))throw Error('同一国家 / 地区的公司注册编号已存在')
 }else if(action==='crew'){
  if(payload.seafarerNo&&data.crewMembers.some(c=>c.id!==before?.id&&c.seafarerNo===payload.seafarerNo))throw Error('海员证 / 人员编号已存在')
  payload.certificates=(raw.certificates??before?.certificates??[]).map(cert=>{
   if(!text(cert.name))throw Error('请填写每项证书名称，或移除空白证书')
   const item=Object.fromEntries(['name','number','issuedOn','expiresOn'].map(k=>[k,text(cert[k])]))
   validDate(item.issuedOn,'证书签发日期');validDate(item.expiresOn,'证书到期日期')
   if(item.issuedOn&&item.expiresOn&&item.expiresOn<item.issuedOn)throw Error('证书到期日期不能早于签发日期')
   return item
  })
 }else{
  ref(data,'vessels',payload.vesselId,'船舶');period(payload)
  if(before&&(payload.vesselId!==before.vesselId||(action==='ownership'?payload.ownerId!==before.ownerId:payload.crewId!==before.crewId)))throw Error('已有关系不能改属其他主体，请结束原关系后新增记录')
  if(action==='ownership'){
   const owner=ref(data,'owners',payload.ownerId,'船东')
   if(!before&&owner.status==='inactive')throw Error('停用船东不能建立新关系')
   const others=data.ownerships.filter(r=>r.id!==before?.id&&r.vesselId===payload.vesselId&&r.role===payload.role)
   if(others.some(r=>r.ownerId===payload.ownerId&&overlaps(r,payload)))throw Error('同一船东的同类关系有效期不能重叠')
   if(payload.share){payload.share=decimal(payload.share);if(compare(payload.share,'0')<=0||compare(payload.share,'100')>0)throw Error('权益比例须大于0且不超过100%')}
   const rows=[...others,payload],days=[...new Set(rows.flatMap(r=>[r.startDate,r.endDate].filter(Boolean)))]
   if(days.some(day=>compare(sum(rows.filter(r=>activeOn(r,day)).map(r=>r.share||'0')),'100')>0))throw Error('同船同类船东在任一有效期间的权益比例合计不能超过100%')
  }else{
   const crew=ref(data,'crewMembers',payload.crewId,'船员')
   if(!before&&crew.status==='inactive')throw Error('停用船员不能新增上船安排')
   if(payload.plannedEndDate&&payload.plannedEndDate<payload.startDate)throw Error('预计离船日期不能早于上船日期')
   if(data.crewAssignments.some(r=>r.id!==before?.id&&r.crewId===payload.crewId&&overlaps(r,payload)))throw Error('此船员已有重叠的上船记录，请先填写原记录的实际离船日期')
  }
 }
 return {payload,before,sheets:[config.title]}
}
