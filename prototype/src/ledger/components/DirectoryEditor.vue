<script setup>
import {computed,nextTick,reactive,ref,useId,watch} from 'vue'
import {context,data,ledger,storage,confirmPreview} from '../store.js'
import {DIRECTORY_TYPES,directoryDraft,RANKS} from '../directory.js'
const props=defineProps({action:{type:String,required:true},initial:{type:Object,default:()=>({})}})
const emit=defineEmits(['close','saved'])
const config=DIRECTORY_TYPES[props.action],draft=reactive(directoryDraft(props.action,props.initial))
const preview=ref(null),error=ref(''),errorEl=ref(null),rankList=useId()
const groups=computed(()=>config.groups.map(g=>({...g,fields:g.fields.filter(f=>!f.companyOnly||draft.entityType==='company')})))
const locked=f=>!!props.initial.id&&['ownership','crewAssignment'].includes(props.action)&&['vesselId','ownerId','crewId'].includes(f.key)
const choices=f=>f.options||(f.type==='vessel'?data.vessels.map(v=>[v.id,v.name]):f.type==='owner'?data.owners.map(o=>[o.id,`${o.name} · ${o.entityType==='company'?'公司':'个人'}${o.status==='inactive'?' · 已停用':''}`]):f.type==='crew'?data.crewMembers.map(c=>[c.id,`${c.name}${c.seafarerNo?' · '+c.seafarerNo:''}${c.status==='inactive'?' · 已停用':''}`]):[])
const display=(f,value)=>choices(f).find(o=>o[0]===value)?.[1]||value||'未填写'
const interval=computed(()=>['ownership','crewAssignment'].includes(props.action))
watch(()=>draft.crewId,id=>{if(!props.initial.id&&props.action==='crewAssignment'){const crew=data.crewMembers.find(c=>c.id===id);if(crew){draft.rank=crew.rank||'';draft.department=crew.department||''}}})
async function report(message){error.value=message;await nextTick();errorEl.value?.scrollIntoView({block:'nearest'});errorEl.value?.focus({preventScroll:true})}
function prepare(){error.value='';try{preview.value=ledger.prepare(props.action,draft)}catch(e){report(e.message)}}
async function confirm(){error.value='';try{const result=await confirmPreview(preview.value);emit('saved',result);emit('close')}catch(e){await report(e.message)}}
function back(){preview.value=null;error.value=''}
</script>
<template>
 <div class="modal-backdrop directory-editor-backdrop" @click.self="!storage.busy&&emit('close')">
  <section class="dialog directory-editor" role="dialog" aria-modal="true" :aria-label="(initial.id?'编辑':'新增')+config.noun">
   <header class="dialog-header"><div><span class="eyebrow">{{preview?'REVIEW DETAILS':'MASTER DATA'}}</span><h2>{{preview?'核对并保存':initial.id?'编辑':'新增'}}{{config.noun}}</h2><p>{{config.description}}</p></div><button class="icon-button" aria-label="关闭资料编辑" :disabled="storage.busy" @click="emit('close')">×</button></header>
   <div class="dialog-body directory-editor-body">
    <div v-if="error" ref="errorEl" class="error-message" role="alert" tabindex="-1">{{error}}</div>
    <div v-if="preview" class="directory-review-note">请核对以下资料，再点击“确认保存”。本次只保存基础档案，不产生收付款。</div>
    <template v-if="!preview">
     <p v-if="action==='vessel'" class="directory-help">管理 / 所属公司与船东分别维护。船东可在保存船舶后通过“关联船东”添加。</p>
     <p v-if="interval" class="directory-help">结束日期可留空；终止 / 实际离船日期当日起不再计为在任。已有关系的主体保持不变，变更主体请结束原关系后新增。</p>
     <section v-for="g in groups" :key="g.title" class="directory-form-section"><h3>{{g.title}}</h3><div class="directory-form-grid">
      <label v-for="f in g.fields" :key="f.key" :class="{'directory-wide':f.type==='textarea'}"><span>{{f.label}} <b v-if="f.required" class="directory-required">*</b></span>
       <textarea v-if="f.type==='textarea'" :aria-label="f.label" v-model="draft[f.key]" :disabled="context.role!=='finance'"/>
       <select v-else-if="f.options||['vessel','owner','crew'].includes(f.type)" :aria-label="f.label" v-model="draft[f.key]" :disabled="locked(f)||context.role!=='finance'"><option value="">请选择</option><option v-for="[value,label] in choices(f)" :key="value" :value="value">{{label}}</option></select>
       <input v-else :aria-label="f.label" v-model="draft[f.key]" :type="f.type==='rank'?'text':f.type" :list="f.type==='rank'?rankList:undefined" :step="f.type==='number'?'any':undefined" :disabled="context.role!=='finance'">
      </label>
     </div></section>
     <datalist :id="rankList"><option v-for="rank in RANKS" :key="rank">{{rank}}</option></datalist>
     <section v-if="action==='crew'" class="directory-form-section">
      <div class="directory-section-title"><div><h3>证书与资格</h3><p>可记录适任证书、海员证、培训及其他证书的有效期。</p></div><button class="secondary" :disabled="context.role!=='finance'" @click="draft.certificates.push({name:'',number:'',issuedOn:'',expiresOn:''})">＋ 添加证书</button></div>
      <p v-if="!draft.certificates.length" class="directory-help">尚未添加证书，可在资料齐备后补充。</p>
      <div v-for="(cert,i) in draft.certificates" :key="i" class="directory-certificate-form"><div class="directory-form-grid"><label>证书名称 *<input :aria-label="'证书名称'+(i+1)" v-model="cert.name" :disabled="context.role!=='finance'"></label><label>证书编号<input :aria-label="'证书编号'+(i+1)" v-model="cert.number" :disabled="context.role!=='finance'"></label><label>签发日期<input type="date" :aria-label="'证书签发日期'+(i+1)" v-model="cert.issuedOn" :disabled="context.role!=='finance'"></label><label>到期日期<input type="date" :aria-label="'证书到期日期'+(i+1)" v-model="cert.expiresOn" :disabled="context.role!=='finance'"></label></div><button class="text-button" :aria-label="'移除证书'+(i+1)" :disabled="context.role!=='finance'" @click="draft.certificates.splice(i,1)">移除此证书</button></div>
     </section>
    </template>
    <template v-else>
     <section v-for="g in groups" :key="g.title" class="directory-form-section"><h3>{{g.title}}</h3><dl class="directory-facts"><div v-for="f in g.fields" :key="f.key"><dt>{{f.label}}</dt><dd>{{display(f,preview.payload[f.key])}}</dd></div></dl></section>
     <section v-if="action==='crew'" class="directory-form-section"><h3>证书与资格</h3><p v-if="!preview.payload.certificates.length">未添加证书</p><article v-for="(cert,i) in preview.payload.certificates" :key="i" class="directory-certificate"><strong>{{cert.name}}</strong><p>{{cert.number||'编号未填写'}} · {{cert.issuedOn||'签发日期未填写'}} 至 {{cert.expiresOn||'到期日期未填写'}}</p></article></section>
    </template>
   </div>
   <footer class="dialog-footer"><span>{{preview?'再次确认后保存':'尚未保存'}}</span><div><button class="secondary" :disabled="storage.busy" @click="preview?back():emit('close')">{{preview?'返回修改':'取消'}}</button><button v-if="!preview" class="primary" :disabled="context.role!=='finance'" @click="prepare">确认并预览</button><button v-else class="primary" :disabled="storage.busy||context.role!=='finance'" @click="confirm">{{storage.busy?'保存中…':'确认保存'}}</button></div></footer>
  </section>
 </div>
</template>
