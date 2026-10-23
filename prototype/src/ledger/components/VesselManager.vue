<script setup>
import {computed,nextTick,ref,watch} from 'vue'
import {useRoute} from 'vue-router'
import {data,context,seed,storage} from '../store.js'
import {historyFor} from '../vessels.js'
import {DIRECTORY_TYPES,activeOn,relationState,certificateState,localDay} from '../directory.js'
import DirectoryEditor from './DirectoryEditor.vue'
import '../directory.css'
import {financialReturnPath} from '../navigation.js'
const route=useRoute()
const tabs=[['vessel','船舶档案','01','vessels'],['owner','船东档案','02','owners'],['ownership','船东关系','03','ownerships'],['crew','船员档案','04','crew'],['crewAssignment','上船记录','05','assignments']]
const tab=computed(()=>tabs.find(t=>t[3]===route.params.section)?.[0]||'vessel')
const returnPath=computed(()=>financialReturnPath(route.query.from))
const search=ref(''),vesselFilter=ref(''),selectedId=ref(data.vessels[0]?.id||''),detailTab=ref('overview'),editor=ref(null)
const panelMain=ref(null)
const config=computed(()=>DIRECTORY_TYPES[tab.value]),today=localDay()
const vesselName=id=>data.vessels.find(v=>v.id===id)?.name||'未知船舶'
const ownerName=id=>data.owners.find(o=>o.id===id)?.name||'未知船东'
const crewName=id=>data.crewMembers.find(c=>c.id===id)?.name||'未知船员'
const currentOwners=id=>data.ownerships.filter(r=>r.vesselId===id&&activeOn(r,today))
const currentCrew=id=>data.crewAssignments.filter(r=>r.vesselId===id&&activeOn(r,today))
const currentShips=(collection,key,id)=>[...new Set(data[collection].filter(r=>r[key]===id&&activeOn(r,today)).map(r=>r.vesselId))]
const certificateWarnings=c=>(c.certificates||[]).filter(cert=>['已过期','90天内到期'].includes(certificateState(cert,today)))
const rows=computed(()=>{
 const q=search.value.trim().toLocaleLowerCase()
 return data[config.value.collection].filter(row=>{
  if(vesselFilter.value){
   if(tab.value==='vessel'&&row.id!==vesselFilter.value)return false
   if(['ownership','crewAssignment'].includes(tab.value)&&row.vesselId!==vesselFilter.value)return false
   if(tab.value==='owner'&&!data.ownerships.some(r=>r.ownerId===row.id&&r.vesselId===vesselFilter.value))return false
   if(tab.value==='crew'&&!data.crewAssignments.some(r=>r.crewId===row.id&&r.vesselId===vesselFilter.value))return false
  }
  return !q||[JSON.stringify(row),row.vesselId?vesselName(row.vesselId):'',row.ownerId?ownerName(row.ownerId):'',row.crewId?crewName(row.crewId):''].join(' ').toLocaleLowerCase().includes(q)
 })
})
const selected=computed(()=>rows.value.find(r=>r.id===selectedId.value)||rows.value[0]||null)
watch(tab,async()=>{search.value='';selectedId.value='';detailTab.value='overview';await nextTick();panelMain.value?.scrollTo({top:0})})
const facts=computed(()=>{
 if(!selected.value)return []
 return config.value.groups.flatMap(g=>g.fields).filter(f=>!f.companyOnly||selected.value.entityType==='company').map(f=>{const value=selected.value[f.key]??f.default;return {label:f.label,value:f.options?.find(o=>o[0]===value)?.[1]||value||'未填写'}})
})
const selectedOwnerships=computed(()=>data.ownerships.filter(r=>tab.value==='vessel'?r.vesselId===selected.value?.id:r.ownerId===selected.value?.id))
const selectedAssignments=computed(()=>data.crewAssignments.filter(r=>tab.value==='vessel'?r.vesselId===selected.value?.id:r.crewId===selected.value?.id))
const recentChanges=computed(()=>data.audit.filter(log=>Object.hasOwn(DIRECTORY_TYPES,log.action)).slice(0,8))
function edit(action,initial={}){editor.value={action,initial:JSON.parse(JSON.stringify(initial))}}
function add(){const initial={};if(vesselFilter.value&&['ownership','crewAssignment'].includes(tab.value))initial.vesselId=vesselFilter.value;edit(tab.value,initial)}
function saved(result){if(editor.value.action===tab.value)selectedId.value=result.id}
function select(row){selectedId.value=row.id;detailTab.value='overview'}
const badgeClass=state=>state==='已过期'?'danger':state==='90天内到期'||state==='laid-up'?'warning':state==='已结束'||state==='inactive'?'neutral':state==='待生效'?'planned':'active'
const statusText=(action,row)=>{
 const f=DIRECTORY_TYPES[action].groups.flatMap(g=>g.fields).find(f=>f.key==='status')
 return f?.options?.find(o=>o[0]===(row.status||'active'))?.[1]||'使用中'
}
</script>
<template>
 <div class="directory-page">
  <section class="directory-workspace" aria-label="船舶与基础资料">
   <header class="directory-header"><div class="directory-heading"><span class="directory-brand" aria-hidden="true">M</span><div><span class="eyebrow">FLEET & PEOPLE</span><h2>船舶与基础资料</h2></div></div><div class="directory-header-actions"><span class="directory-save-status">{{storage.message}}</span><router-link class="secondary" :to="returnPath">← 返回财务看板</router-link></div></header>
   <div class="directory-layout">
    <aside class="directory-nav"><p>基础资料管理</p><nav aria-label="基础资料导航"><router-link v-for="[key,title,index,path] in tabs" :key="key" :to="{path:'/fleet/'+path,query:route.query}" :class="{selected:tab===key}"><small>{{index}}</small>{{title}}<span>{{data[DIRECTORY_TYPES[key].collection].length}}</span></router-link></nav><div class="directory-nav-note"><strong>资料相连，账目独立</strong><p>公司、个人和船员各自建档，关系按船舶与有效期间维护。</p></div></aside>
    <main ref="panelMain" class="directory-main">
     <div class="directory-page-heading"><div><span class="eyebrow">MASTER DATA / {{tabs.find(t=>t[0]===tab)?.[2]}}</span><h1>{{config.title}}</h1><p>{{config.description}}</p></div><button class="primary" :disabled="context.role!=='finance'" @click="add">＋ 新增{{config.noun}}</button></div>
     <div class="directory-stats"><div><span>船舶档案</span><strong>{{data.vessels.length}}<small>艘</small></strong></div><div><span>船东 · 公司 / 个人</span><strong>{{data.owners.length}}<small>位</small></strong></div><div><span>船员档案</span><strong>{{data.crewMembers.length}}<small>人</small></strong></div><div><span>当前在船</span><strong>{{new Set(data.crewAssignments.filter(r=>activeOn(r,today)).map(r=>r.crewId)).size}}<small>人</small></strong></div></div>
     <div class="directory-toolbar"><label class="directory-search"><span aria-hidden="true">⌕</span><input type="search" v-model="search" :aria-label="'搜索'+config.title" placeholder="搜索名称、编号或联系信息"></label><select aria-label="管理面板船舶筛选" v-model="vesselFilter"><option value="">全部船舶</option><option v-for="v in data.vessels" :key="v.id" :value="v.id">{{v.name}}</option></select><span>{{rows.length}} 条资料</span></div>
     <div v-if="!rows.length" class="directory-empty"><span class="directory-empty-icon" aria-hidden="true">＋</span><h2>{{search||vesselFilter?'未找到符合条件的资料':'尚未建立'+config.title}}</h2><p>{{tab==='owner'?'先添加公司或个人船东，再到“船东关系”关联船舶。':tab==='crew'?'先建立船员档案，再安排上船；证书可以随时补充。':tab==='ownership'?'请先建立船东和船舶档案，再关联双方及有效期间。':tab==='crewAssignment'?'选择已有船员和船舶，记录本次职务与上离船安排。':'可以新增船舶，或清空搜索与筛选条件。'}}</p><button class="primary" :disabled="context.role!=='finance'" @click="add">＋ 新增{{config.noun}}</button></div>
     <div v-else :class="['directory-content',{'directory-content--split':['vessel','owner','crew'].includes(tab)}]">
      <section class="directory-list" :aria-label="config.title+'列表'">
       <template v-if="['vessel','owner','crew'].includes(tab)">
        <button v-for="row in rows" :key="row.id" class="directory-card" :class="{selected:selected?.id===row.id}" :data-testid="'directory-row-'+row.id" @click="select(row)">
         <div class="directory-card-top"><strong>{{row.name}}</strong><span class="directory-badge" :class="badgeClass(row.status)">{{statusText(tab,row)}}</span></div>
         <template v-if="tab==='vessel'"><p>{{row.vesselType||'船型待完善'}} · IMO {{row.imo||'待填写'}}</p><p>{{row.company||'管理公司待填写'}}</p><div class="directory-card-foot"><span>{{currentOwners(row.id).length}} 位当前船东</span><span>{{currentCrew(row.id).length}} 位在船船员</span><span>查看档案 ↗</span></div></template>
         <template v-else-if="tab==='owner'"><p>{{row.entityType==='company'?'公司船东':'个人船东'}} · {{row.country||'国家 / 地区待填写'}}</p><p>{{row.contactName||'联系人待填写'}} · {{row.phone||row.email||'联系方式待填写'}}</p><div class="directory-card-foot"><span>当前关联 {{currentShips('ownerships','ownerId',row.id).length}} 艘船</span><span>查看档案 ↗</span></div></template>
         <template v-else><p>{{row.rank||'职务待填写'}} · {{row.nationality||'国籍待填写'}}</p><p>{{currentShips('crewAssignments','crewId',row.id).map(vesselName).join('、')||'当前未在船'}}</p><div class="directory-card-foot"><span :class="{'directory-warning-text':certificateWarnings(row).length}">{{certificateWarnings(row).length?certificateWarnings(row).length+' 项证书需关注':(row.certificates?.length||0)+' 项证书'}}</span><span>查看档案 ↗</span></div></template>
        </button>
       </template>
       <div v-else class="directory-table-wrap"><table class="directory-table"><thead><tr><th>{{tab==='ownership'?'船东':'船员'}}</th><th>船舶</th><th>{{tab==='ownership'?'关系 / 权益':'任职 / 部门'}}</th><th>{{tab==='ownership'?'有效期间':'上离船期间'}}</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="row in rows" :key="row.id"><td><strong>{{tab==='ownership'?ownerName(row.ownerId):crewName(row.crewId)}}</strong></td><td>{{vesselName(row.vesselId)}}</td><td>{{tab==='ownership'?(row.role==='registered'?'登记船东':'实际权益人'):row.rank}}<small>{{tab==='ownership'?(row.share?row.share+'%':'比例未填写'):row.department||'部门未填写'}}</small></td><td>{{row.startDate}}<small>至 {{row.endDate||'未设结束日期'}}</small><small v-if="row.plannedEndDate">预计离船 {{row.plannedEndDate}}</small></td><td><span class="directory-badge" :class="badgeClass(relationState(row,today))">{{relationState(row,today)}}</span></td><td><button class="text-button" :disabled="context.role!=='finance'" :aria-label="'维护'+(tab==='ownership'?ownerName(row.ownerId):crewName(row.crewId))+'与'+vesselName(row.vesselId)+'的记录'" @click="edit(tab,row)">维护记录</button></td></tr></tbody></table><p class="directory-table-note">起始日期计入，终止 / 实际离船日期当日起不再计为在任。历史资料保留，可通过维护记录补充结束日期。</p></div>
      </section>
      <section v-if="selected&&['vessel','owner','crew'].includes(tab)" class="directory-detail" :aria-label="selected.name+'的档案'">
       <header class="directory-detail-header"><div><span class="eyebrow">{{tab==='vessel'?'VESSEL PROFILE':tab==='owner'?'OWNER PROFILE':'CREW PROFILE'}}</span><h2>{{selected.name}}</h2><p v-if="tab==='vessel'">{{historyFor(seed,data,selected.id)?'含独立历史底稿':'独立账本，未导入历史底稿'}}</p><p v-else>{{tab==='owner'?(selected.entityType==='company'?'公司船东':'个人船东'):(selected.rank||'职务待填写')}}</p></div><button class="secondary" :disabled="context.role!=='finance'" @click="edit(tab,selected)">编辑{{config.noun}}</button></header>
       <div class="directory-detail-tabs" role="group" aria-label="档案内容"><button :class="{selected:detailTab==='overview'}" :aria-pressed="detailTab==='overview'" @click="detailTab='overview'">基本资料</button><button v-if="tab!=='crew'" :class="{selected:detailTab==='ownership'}" :aria-pressed="detailTab==='ownership'" @click="detailTab='ownership'">{{tab==='vessel'?'船东关系':'关联船舶'}} <small>{{selectedOwnerships.length}}</small></button><button v-if="tab!=='owner'" :class="{selected:detailTab==='crew'}" :aria-pressed="detailTab==='crew'" @click="detailTab='crew'">{{tab==='vessel'?'船员与任职':'任职与证书'}}</button></div>
       <div class="directory-detail-body">
        <template v-if="detailTab==='overview'"><dl class="directory-facts"><div v-for="f in facts" :key="f.label"><dt>{{f.label}}</dt><dd>{{f.value}}</dd></div></dl><p v-if="tab==='vessel'" class="directory-help">管理 / 所属公司不自动视为船东，请在“船东关系”中单独关联。</p><button v-if="tab==='crew'" class="text-button" @click="detailTab='crew'">查看任职记录和证书 →</button></template>
        <template v-if="detailTab==='ownership'"><div class="directory-section-title"><h3>{{tab==='vessel'?'船东与权益关系':'船舶关联记录'}}</h3><button class="secondary" :disabled="context.role!=='finance'" @click="edit('ownership',tab==='vessel'?{vesselId:selected.id}:{ownerId:selected.id})">＋ {{tab==='vessel'?'关联船东':'关联船舶'}}</button></div><p v-if="!selectedOwnerships.length" class="directory-help">尚未关联。请选择已有档案，填写关系类型和有效期间。</p><article v-for="r in selectedOwnerships" :key="r.id" class="directory-relation"><div><strong>{{tab==='vessel'?ownerName(r.ownerId):vesselName(r.vesselId)}}</strong><span class="directory-badge" :class="badgeClass(relationState(r,today))">{{relationState(r,today)}}</span></div><p>{{r.role==='registered'?'登记船东':'实际权益人'}} · {{r.share?r.share+'%':'比例未填写'}}</p><p>{{r.startDate}} 至 {{r.endDate||'未设结束日期'}}</p><button class="text-button" :disabled="context.role!=='finance'" @click="edit('ownership',r)">维护关系 / 结束关联 →</button></article></template>
        <template v-if="detailTab==='crew'"><div class="directory-section-title"><h3>{{tab==='vessel'?'船员上船与离船':'任职记录'}}</h3><button class="secondary" :disabled="context.role!=='finance'" @click="edit('crewAssignment',tab==='vessel'?{vesselId:selected.id}:{crewId:selected.id,rank:selected.rank,department:selected.department})">＋ 安排上船</button></div><p v-if="!selectedAssignments.length" class="directory-help">尚无任职记录，新增安排后会显示本船船员与上离船历史。</p><article v-for="r in selectedAssignments" :key="r.id" class="directory-relation"><div><strong>{{tab==='vessel'?crewName(r.crewId):vesselName(r.vesselId)}}</strong><span class="directory-badge" :class="badgeClass(relationState(r,today))">{{relationState(r,today)}}</span></div><p>{{r.rank}} · {{r.department||'部门未填写'}}</p><p>{{r.startDate}} 至 {{r.endDate||'尚未离船'}}<span v-if="r.plannedEndDate"> · 预计 {{r.plannedEndDate}}</span></p><button class="text-button" :disabled="context.role!=='finance'" @click="edit('crewAssignment',r)">维护任职 / 登记离船 →</button></article><template v-if="tab==='crew'"><div class="directory-section-title"><h3>证书与资格</h3><button class="text-button" :disabled="context.role!=='finance'" @click="edit('crew',selected)">维护证书</button></div><p v-if="!selected.certificates?.length" class="directory-help">尚未登记证书。</p><article v-for="(cert,i) in selected.certificates||[]" :key="i" class="directory-certificate"><div><strong>{{cert.name}}</strong><span class="directory-badge" :class="badgeClass(certificateState(cert,today))">{{certificateState(cert,today)}}</span></div><p>{{cert.number||'编号未填写'}} · 到期 {{cert.expiresOn||'未填写'}}</p></article></template></template>
       </div>
      </section>
     </div>
     <details class="directory-history"><summary>最近基础资料变更 <span>{{recentChanges.length}}</span></summary><p v-if="!recentChanges.length">尚无变更记录。</p><article v-for="log in recentChanges" :key="log.id"><strong>{{DIRECTORY_TYPES[log.action].title}} · {{log.after.name||vesselName(log.after.vesselId)}}</strong><span>{{log.before?'修改':'新增'}} · {{new Date(log.at).toLocaleString('zh-CN')}}</span></article></details>
    </main>
   </div>
   <footer class="directory-footer"><span>基础资料按独立编号关联 · {{today}}</span><span>返回财务看板后，原有筛选与页面位置保留。</span></footer>
  </section>
 </div>
 <DirectoryEditor v-if="editor" :action="editor.action" :initial="editor.initial" @saved="saved" @close="editor=null"/>
</template>
