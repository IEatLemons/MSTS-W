<script setup>
import { computed,nextTick,reactive,ref,watch } from 'vue'
import { ATTACHMENTS,CATEGORIES,FIELD_GROUPS,FIELD_LABELS,CALCULATED,PURPOSES,STATUSES } from '../schema.js'
import { decimal,mul,sub,sum,money,compare,div } from '../decimal.js'
import { blankDraft,entryToDraft,sourceToDraft,entryFields } from '../views.js'
import { context,data,ledger,seed,storage,confirmPreview,singleVesselId } from '../store.js'
import { totals } from '../engine.js'
import VesselField from './VesselField.vue'
import {vesselById,walletsFor} from '../vessels.js'
import AttachmentPicker from './AttachmentPicker.vue'

const props=defineProps({sheet:Object,entry:Object,sourceRow:Object,paymentEntry:Object})
const emit=defineEmits(['close','saved'])
const paymentMode=!!props.paymentEntry
const draft=reactive(props.entry?entryToDraft(props.entry):props.sourceRow?sourceToDraft(props.sourceRow,props.sheet):blankDraft(props.sheet))
if(!props.entry&&!props.sourceRow)draft.vesselId=singleVesselId.value
const walletOptions=computed(()=>walletsFor(data,props.paymentEntry?.vesselId||draft.vesselId))
const vesselName=computed(()=>vesselById(data,props.paymentEntry?.vesselId||draft.vesselId)?.name||'未选择船舶')
const phase=ref(paymentMode?2:props.entry?2:1),error=ref(''),preview=ref(null),selectedFiles=ref([])
const errorAlert=ref(null)
const vesselInvalid=computed(()=>error.value==='请选择有效的所属船舶'&&!paymentMode)
watch(()=>draft.vesselId,()=>{if(error.value==='请选择有效的所属船舶')error.value=''})
const paymentManual=ref(false)
const payment=reactive({entryId:props.paymentEntry?.id,amount:props.paymentEntry?ledger.pending(props.paymentEntry):'',fee:'0',wallet:props.sheet?.kind==='cash'?'cash':'bank',date:blankDraft(props.sheet).fields.posting_date,reference:'',attachments:[]})
const title=computed(()=>paymentMode?'补充实际收付款':props.entry?'修改账目':'记一笔账')
const amount=computed(()=>{try{return draft.fields.invoice_usd!==''&&draft.fields.invoice_usd!==undefined?decimal(draft.fields.invoice_usd):mul(draft.fields.original_amount||'0',draft.fields.usd_conversion_rate||'1')}catch{return '0'}})
const poUsd=computed(()=>{try{return mul(draft.fields.original_amount||'0',draft.fields.usd_conversion_rate||'1')}catch{return '—'}})
const allocationTotal=computed(()=>sum(draft.allocations.map(a=>{try{return decimal(a.amount||'0')}catch{return '0'}})))
const hasAllocations=computed(()=>['expense','receipt','refund'].includes(draft.kind))
const schemaSheet=computed(()=>draft.direction==='in'&&draft.kind==='receipt'?'Shipmanagement RCVD':props.sheet?.kind==='cash'?'CTM Expenses List':['summary','checking','expenses','bank'].includes(props.sheet?.kind)?'Expenses Lists':CATEGORIES.find(c=>c.id===draft.allocations[0]?.category)?.name||'Expenses Lists')
const sourceFields=computed(()=>{
  const names=[schemaSheet.value]
  if(draft.direction==='out'&&draft.allocations.length>1)names.push(...draft.allocations.map(a=>CATEGORIES.find(c=>c.id===a.category)?.name))
  const seen=new Set(),fields=[]
  for(const name of names)for(const f of seed.fields.filter(f=>f.sheet===name))if(!seen.has(f.field)){seen.add(f.field);fields.push(f)}
  return fields
})
const fieldKeys=computed(()=>new Set(sourceFields.value.map(f=>f.field)))
const fieldGroups=computed(()=>FIELD_GROUPS.map(g=>({...g,keys:g.keys.filter(key=>fieldKeys.value.has(key)||['posting_date','description','supplier_id','original_amount','usd_conversion_rate','invoice_usd','payment_status'].includes(key))})))
const types=Object.fromEntries(seed.fields.map(f=>[f.field,f.type]))
const attachmentKinds=computed(()=>{
  const keys=sourceFields.value.filter(f=>f.type==='attachment').map(f=>f.field)
  return [...new Set([...keys,draft.direction==='in'?'receipt_attachment':'bank_slip'])].filter(k=>ATTACHMENTS[k])
})
const options=computed(()=>draft.direction==='in'?['receipt','refund','interest','bank']:['expense','transfer','bank'])
watch(amount,value=>{if(draft.allocations.length===1)draft.allocations[0].amount=value;if(draft.actual&&!paymentManual.value)draft.payment.amount=value},{immediate:true})
watch(()=>draft.allocations.length,len=>{if(len===1)draft.allocations[0].amount=amount.value})
watch(()=>draft.actual,actual=>{if(actual&&!draft.payment.amount)draft.payment.amount=amount.value})
watch(()=>draft.kind,kind=>{
  if(['transfer','bank','interest'].includes(kind)){draft.actual=true;draft.payment.wallet='bank';draft.payment.amount=amount.value}
  if(kind==='transfer')draft.fields.supplier_id=draft.fields.supplier_id||'船长备用金'
})
const previewEntry=computed(()=>{
  if(preview.value?.action!=='payment')return preview.value?.payload
  const e=JSON.parse(JSON.stringify(preview.value.before));e.settlements.push(preview.value.payload.payment)
  e.fields.payment_status=compare(ledger.pending(e),'0')===0?'Completed':'Paying'
  return e
})
const previewEffects=computed(()=>{
  if(!preview.value)return null
  const before=totals(seed,data,context.vesselScope),e=previewEntry.value
  const entries=preview.value.action==='entry'?[...data.entries,e]:data.entries.map(x=>x.id===e.id?e:x)
  const after=totals(seed,{...data,entries},context.vesselScope)
  return {bank:after.bank,cash:after.cash,bankChange:sub(after.bank,before.bank),cashChange:sub(after.cash,before.cash)}
})
const fullPreviewFields=computed(()=>{
  if(!previewEntry.value)return []
  const e=previewEntry.value,f=entryFields(e)
  if(schemaSheet.value==='Shipmanagement RCVD'){
    Object.assign(f,{receipt_type:e.fields.description,receipt_party:e.fields.supplier_id,receipt_status:e.fields.payment_status,receipt_original_amount:e.fields.original_amount,receipt_date:e.settlements.at(-1)?.date||'',receipt_fee:sum(e.settlements.map(s=>s.fee)),receipt_attachment:e.attachments.filter(a=>a.kind==='receipt_attachment').map(a=>a.name).join('；')})
    const keys={shipmanagement:'shipmanagement_receipt',owner:'owner_receipt',takeover:'takeover_receipt',flag:'bma_receipt',drydock:'dd_receipt'}
    const net=sub(sum(e.settlements.map(s=>s.amount)),sum(e.settlements.map(s=>s.fee)));let assigned='0'
    e.allocations.forEach((a,i)=>{const v=i===e.allocations.length-1?sub(net,assigned):mul(net,div(a.amount,e.amount,18));f[keys[a.category]]=v;assigned=sum([assigned,v])})
  }
  return sourceFields.value.map(col=>({label:col.header+' · '+col.column,value:f[col.field]??'',type:col.type}))
})
function pickDirection(direction){draft.direction=direction;draft.kind=props.sheet?.kind==='bank'?'bank':direction==='in'?'receipt':'expense';if(props.sheet?.kind==='bank')draft.actual=true;phase.value=2}
function inputType(key){return types[key]==='date'?'date':types[key]==='decimal'?'number':'text'}
function calculated(key){if(key==='purchase_order_usd')return poUsd.value;return ''}
function addAllocation(){const category=CATEGORIES.find(c=>!draft.allocations.some(a=>a.category===c.id));if(category)draft.allocations.push({category:category.id,amount:'0'})}
async function reportError(message){
  error.value=message
  await nextTick()
  errorAlert.value?.scrollIntoView({block:'nearest'})
  errorAlert.value?.focus({preventScroll:true})
}
function fileChanged(event,kind){
  error.value=''
  for(const file of event.target.files){
    if(file.size>10*1024*1024){reportError('每个附件最多10 MB');continue}
    const meta={id:crypto.randomUUID(),name:file.name,size:file.size,kind}
    if(paymentMode)payment.attachments.push(meta);else draft.attachments.push(meta)
    selectedFiles.value.push({id:meta.id,file})
  }
  event.target.value=''
}
function removeFile(id){
  const arr=paymentMode?payment.attachments:draft.attachments;const index=arr.findIndex(f=>f.id===id)
  if(index>=0)arr.splice(index,1);selectedFiles.value=selectedFiles.value.filter(f=>f.id!==id)
}
function prepare(){
  error.value=''
  try{
    if(!paymentMode&&draft.allocations.length===1)draft.allocations[0].amount=amount.value
    preview.value=ledger.prepare(paymentMode?'payment':props.entry?'edit':'entry',paymentMode?payment:draft)
    phase.value=3
  }catch(e){reportError(e.message)}
}
async function confirm(){
  error.value=''
  try{const result=await confirmPreview(preview.value,selectedFiles.value);emit('saved',result);emit('close')}
  catch(e){await reportError(e.message)}
}
function back(){preview.value=null;phase.value=2;error.value=''}
const format=(value,type)=>value===null||value===undefined||value===''?'未填写':type==='decimal'?money(value):type==='date'?String(value).slice(0,10):String(value)
</script>
<template>
  <div class="modal-backdrop" @click.self="!storage.busy&&emit('close')">
    <section class="dialog entry-dialog" role="dialog" aria-modal="true" :aria-label="title">
      <header class="dialog-header"><div><span class="eyebrow">NEW LEDGER ENTRY</span><h2>{{title}}</h2></div><button class="icon-button" aria-label="关闭" :disabled="storage.busy" @click="emit('close')">×</button></header>
      <div class="dialog-steps"><span :class="{active:phase===1}">01 选择入出账</span><span :class="{active:phase===2}">02 填写完整资料</span><span :class="{active:phase===3}">03 核对并录入</span></div>
      <div class="dialog-body">
        <div v-if="error" ref="errorAlert" class="error-message" role="alert" aria-atomic="true" tabindex="-1"><strong class="error-title">未能继续，请检查填写内容</strong><span>{{error}}</span></div>
        <div v-if="context.role!=='finance'" class="error-message" role="alert">当前是只读身份，不能确认录入。</div>
        <div v-if="phase===1" class="direction-picker">
          <button @click="pickDirection('in')" data-testid="direction-in"><span class="direction-icon in">↙</span><strong>入账</strong><p>登记收款、费用退款或银行结息</p><span>选择入账 →</span></button>
          <button @click="pickDirection('out')" data-testid="direction-out"><span class="direction-icon out">↗</span><strong>出账</strong><p>登记费用、付款或备用金补给</p><span>选择出账 →</span></button>
        </div>
        <template v-else-if="phase===2">
          <template v-if="paymentMode">
            <div class="entry-identity"><div class="identity-vessel"><span class="identity-label">所属船舶</span><strong>{{vesselName}}</strong></div><div class="entry-direction"><span class="identity-label">记账方向</span><span class="direction-pill" :class="props.paymentEntry.direction"><span aria-hidden="true">{{props.paymentEntry.direction==='in'?'↙':'↗'}}</span>{{props.paymentEntry.direction==='in'?'入账':'出账'}}</span></div></div>
            <div class="entry-context"><span>{{props.paymentEntry.id}}</span><h3>{{props.paymentEntry.fields.description}}</h3><p>记账金额 {{money(props.paymentEntry.amount)}} USD · 已收付 {{money(ledger.paid(props.paymentEntry))}} · 剩余 {{money(ledger.pending(props.paymentEntry))}}</p></div>
            <div class="form-grid">
              <label>实际收付款金额 USD<input aria-label="实际收付款金额 USD" type="number" step="any" v-model="payment.amount" data-testid="payment-amount"></label>
              <label>实际收付款日期<input aria-label="实际收付款日期" type="date" v-model="payment.date"></label>
              <label>账户<select aria-label="账户" v-model="payment.wallet"><option v-for="w in walletOptions" :value="w.id">{{w.name}}</option></select></label>
              <label>Bank Charge USD<input aria-label="Bank Charge USD" type="number" step="any" v-model="payment.fee" data-testid="payment-fee"></label>
              <label class="span-two">付款参考号 / 备注<input v-model="payment.reference"></label>
            </div>
            <AttachmentPicker kind="bank_slip" label="BankSlip / 实际收付款回单" :files="payment.attachments" :disabled="context.role!=='finance'" @add="fileChanged" @remove="removeFile"/>
          </template>
          <template v-else>
            <div class="entry-identity">
              <VesselField v-model="draft.vesselId" :disabled="!!entry" :invalid="vesselInvalid"/>
              <div class="entry-direction"><span class="identity-label">记账方向</span><span class="direction-pill" :class="draft.direction"><span aria-hidden="true">{{draft.direction==='in'?'↙':'↗'}}</span>{{draft.direction==='in'?'入账':'出账'}}</span><button v-if="!entry" class="text-button" @click="phase=1;error=''">重新选择方向</button></div>
            </div>
            <div class="entry-purpose"><label>记账用途<select aria-label="记账用途" v-model="draft.kind" :disabled="!!entry"><option v-for="kind in options" :value="kind">{{PURPOSES[kind]}}</option></select></label><label>原币<select aria-label="原币" v-model="draft.currency"><option>USD</option><option>HKD</option><option>EUR</option><option>CNY</option></select></label></div>
            <section v-for="group in fieldGroups" :key="group.name" class="form-section">
              <h3>{{group.name}}</h3>
              <div class="form-grid">
                <label v-for="key in group.keys" :key="key" :class="{'span-two':key==='description'}">{{FIELD_LABELS[key]}}
                  <output v-if="CALCULATED.has(key)" class="calculated-field">{{money(calculated(key))}}<small>自动计算</small></output>
                  <select v-else-if="key==='payment_status'" :aria-label="FIELD_LABELS[key]" v-model="draft.fields[key]"><option v-for="s in STATUSES">{{s}}</option></select>
                  <select v-else-if="key==='owner_settlement_status'" :aria-label="FIELD_LABELS[key]" v-model="draft.fields[key]"><option value="">未填写</option><option>已收</option><option>已开票</option><option>待收</option><option>船东付</option></select>
                  <select v-else-if="key==='account_code'" :aria-label="FIELD_LABELS[key]" v-model="draft.fields[key]"><option value="">未选择</option><option v-for="code in data.codes.filter(c=>/^\d+$/.test(c.code))" :key="code.namespace+code.code" :value="code.code">{{code.code}} · {{code.chinese_description||code.description}}</option></select>
                  <input v-else :aria-label="FIELD_LABELS[key]" :data-testid="'entry-'+key" :type="inputType(key)" step="any" v-model="draft.fields[key]" :list="key==='supplier_id'?'ledger-parties':undefined" :placeholder="key==='invoice_usd'?'留空时采用 PO Amount (USD)':''">
                </label>
              </div>
            </section>
            <datalist id="ledger-parties"><option v-for="party in [...new Set(seed.records.map(r=>r.supplier_id||r.receipt_party).filter(Boolean))]">{{party}}</option></datalist>
            <section v-if="hasAllocations" class="form-section">
              <div class="section-heading"><h3>{{draft.kind==='receipt'?'收款用途分配':'费用分类分配'}}</h3><button class="text-button" :disabled="draft.allocations.length>=5" @click="addAllocation">＋ 添加分类</button></div>
              <div v-for="(a,i) in draft.allocations" :key="i" class="allocation-row"><select :aria-label="'分类'+(i+1)" :data-testid="'allocation-category-'+i" v-model="a.category"><option v-for="c in CATEGORIES" :value="c.id">{{c.name}} · {{c.label}}</option></select><label><input :aria-label="'分类金额'+(i+1)" type="number" step="any" :readonly="draft.allocations.length===1" v-model="a.amount" :data-testid="'allocation-amount-'+i"><span>USD</span></label><button class="icon-button" aria-label="移除分类" :disabled="draft.allocations.length===1" @click="draft.allocations.splice(i,1)">×</button></div>
              <p class="form-help">分配合计 {{money(allocationTotal)}} / 记账金额 {{money(amount)}} USD。收款时，手续费从实际到账额扣除后再按此比例分配。</p>
            </section>
            <section class="form-section">
              <h3>实际收付款</h3>
              <template v-if="entry"><p>已收付 {{money(ledger.paid(entry))}} USD，剩余 {{money(ledger.pending(entry))}} USD。付款在账目详情中逐笔登记，修改表单保留已有收付款。</p></template>
              <template v-else>
                <label class="checkbox-row"><input type="checkbox" v-model="draft.actual" :disabled="['transfer','bank','interest'].includes(draft.kind)" data-testid="entry-actual">{{draft.direction==='in'?'本次已实际到账':'本次已实际支付'}}<small>未勾选时仅登记账目，不改变银行及现金余额。</small></label>
                <div v-if="draft.actual" class="form-grid payment-fields">
                  <label>实际金额 USD<input aria-label="实际金额 USD" type="number" step="any" v-model="draft.payment.amount" @input="paymentManual=true"></label>
                  <label>实际日期<input aria-label="实际日期" type="date" v-model="draft.payment.date"></label>
                  <label>支付 / 收款账户<select aria-label="支付 / 收款账户" v-model="draft.payment.wallet" :disabled="draft.kind==='transfer'"><option v-for="w in walletOptions" :value="w.id">{{w.name}}</option></select></label>
                  <label>Bank Charge USD<input aria-label="Bank Charge USD" type="number" step="any" v-model="draft.payment.fee"></label>
                  <label class="span-two">参考号 / 备注<input v-model="draft.payment.reference"></label>
                </div>
              </template>
            </section>
            <section class="form-section"><h3>附件</h3><div class="attachment-grid"><AttachmentPicker v-for="kind in attachmentKinds" :key="kind" :kind="kind" :files="draft.attachments.filter(f=>f.kind===kind)" :disabled="context.role!=='finance'" @add="fileChanged" @remove="removeFile"/></div><p class="form-help">每类附件可选择多个文件，也可继续追加或单独移除。单个文件最多 10 MB，第二次确认时一起保存。</p></section>
          </template>
        </template>
        <template v-else-if="phase===3&&preview">
          <div class="preview-heading"><span class="status-tag">尚未录入</span><h3>请核对这份完整信息</h3><p>再次点击“{{paymentMode?'确认保存收付款':entry?'确认保存修改':'确认录入'}}”后，才会改变账本。</p></div>
          <div class="entry-identity"><div class="identity-vessel"><span class="identity-label">所属船舶</span><strong>{{vesselName}}</strong></div><div class="entry-direction"><span class="identity-label">记账方向</span><span class="direction-pill" :class="previewEntry.direction"><span aria-hidden="true">{{previewEntry.direction==='in'?'↙':'↗'}}</span>{{previewEntry.direction==='in'?'入账':'出账'}}</span></div></div><div class="preview-summary"><div><small>摘要 / 类型</small><strong>{{previewEntry.fields.description}}</strong><span>{{previewEntry.fields.posting_date}} · {{previewEntry.fields.supplier_id}}</span></div><div class="preview-amount"><small>{{PURPOSES[previewEntry.kind]}} · {{previewEntry.direction==='in'?'入账':'出账'}}</small><strong>{{money(previewEntry.amount)}} <em>USD</em></strong></div></div>
          <div v-if="paymentMode" class="payment-preview"><strong>本次{{previewEntry.direction==='in'?'收款':'付款'}} {{money(preview.payload.payment.amount)}} USD</strong><p>{{preview.payload.payment.date}} · {{walletOptions.find(w=>w.id===preview.payload.payment.wallet)?.name}} · 手续费 {{money(preview.payload.payment.fee)}} USD</p></div>
          <div class="preview-destinations"><span>保存后同步展示</span><strong v-for="s in preview.sheets" :key="s">{{s}}</strong></div>
          <div v-if="previewEffects" class="payment-preview"><strong>保存后银行 {{money(previewEffects.bank)}} USD · 本次变化 {{money(previewEffects.bankChange)}}</strong><p>保存后备用金 {{money(previewEffects.cash)}} USD · 本次变化 {{money(previewEffects.cashChange)}}</p><p>此笔已收付 {{money(ledger.paid(previewEntry))}} USD · 剩余 {{money(ledger.pending(previewEntry))}} USD</p></div>
          <div class="preview-fields"><div v-for="(f,i) in fullPreviewFields" :key="i"><span>{{f.label}}</span><strong>{{format(f.value,f.type)}}</strong></div></div>
          <h4>分类与金额</h4><div class="preview-fields"><div v-for="a in previewEntry.allocations" :key="a.category"><span>{{CATEGORIES.find(c=>c.id===a.category)?.name}}</span><strong>{{money(a.amount)}} USD</strong></div><div v-if="!previewEntry.allocations.length"><span>用途</span><strong>{{PURPOSES[previewEntry.kind]}}</strong></div></div>
          <h4>实际收付款</h4><p v-if="!paymentMode&&!previewEntry.settlements.length" class="muted">尚无实际收付款，本次不会改变银行及现金余额。</p><div v-for="s in previewEntry.settlements" class="payment-preview"><strong>{{money(s.amount)}} USD · {{walletOptions.find(w=>w.id===s.wallet)?.name}}</strong><p>{{s.date}} · 手续费 {{money(s.fee)}} USD · {{s.reference||'未填写参考号'}}</p></div>
          <h4>附件清单</h4><div class="file-list"><span v-for="f in [...(previewEntry.attachments||[]),...(paymentMode?preview.payload.payment.attachments:[])]" :key="f.id">{{ATTACHMENTS[f.kind]}} · {{f.name}}</span><small v-if="!previewEntry.attachments?.length&&!preview.payload.payment?.attachments?.length">未添加附件</small></div>
        </template>
      </div>
      <footer class="dialog-footer"><span>{{phase===3?'第二次确认将保存账目':'当前填写尚未保存'}}</span><div><button class="secondary" :disabled="storage.busy" @click="phase===3?back():emit('close')">{{phase===3?'返回修改':'取消'}}</button><button v-if="phase===2" class="primary" :disabled="context.role!=='finance'" @click="prepare" data-testid="prepare-entry">确认并预览</button><button v-if="phase===3" class="primary" :disabled="storage.busy||context.role!=='finance'" @click="confirm" data-testid="confirm-entry">{{storage.busy?'保存中…':paymentMode?'确认保存收付款':entry?'确认保存修改':'确认录入'}}</button></div></footer>
    </section>
  </div>
</template>
