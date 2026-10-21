<script setup>
import {computed,reactive,ref} from 'vue'
import {ledger,context,storage,confirmPreview,data,seed} from '../store.js'
import {inventoryValues} from '../views.js'
import {money} from '../decimal.js'
const props=defineProps({kind:String,initial:Object})
const emit=defineEmits(['close','saved'])
const draft=reactive({...props.initial}),preview=ref(null),error=ref('')
const titles={code:'维护费用编码',estimate:'维护费用估算',inventory:'维护月度现金与库存',void:'作废账目'}
const name=computed(()=>titles[props.kind])
const inventoryFields=[['openingCash','期初现金 / 基线余额'],['openingFood','上期伙食库存'],['openingStore','上期招待品库存'],['foodIncome','伙食费收入'],['foodGuestMealIncome','客饭费收入'],['foodHospitalityIncome','招待用伙食收入'],['foodCrewIncome','船员购伙收入'],['foodPurchases','手工补充购入伙食'],['foodClosing','本期伙食库存'],['storeIncome','购买招待品收入'],['storeCrewIncome','船员购买收入'],['storeCrewSpend','招待船员支出'],['storeGuestSpend','招待客人支出'],['storeSalesSpend','船员购买支出'],['storePurchases','其他招待品支出'],['storeClosing','本期招待品库存']]
const labels={namespace:'编码分组',code:'费用编码',description:props.kind==='estimate'?'估算项目':'名称',chinese_description:'中文名称',pic:'责任部门',vessel:'船名',rqa:'RQA',supplier:'供应商',po:'PO Nos',originalAmount:'原币金额',rating:'汇率除数',usd:'估算 USD',low:'Lowest',reasonable:'Reasonable',high:'Highest',catalogue:'Catalogue',agreement:'Agreement',place:'Place Factor',overtime:'O/T Factor',month:'月份',rmbRate:'RMB 换算除数',note:'备注',reason:'作废原因',id:'记录编号',...Object.fromEntries(inventoryFields)}
const rows=computed(()=>{
  if(!preview.value)return []
  const payload=preview.value.payload
  const r=Object.entries(payload).filter(([k])=>!['originalKey','isSource','sourceRef','sourceRow','updatedAt'].includes(k)).map(([key,value])=>({key,label:labels[key]||key,value:key==='namespace'?(value==='ship_management'?'Ship Management 船管':'Crew Dept 船员细项'):typeof value==='object'?JSON.stringify(value):value}))
  if(props.kind==='inventory'){
    const m=inventoryValues({...data,inventory:[...data.inventory.filter(i=>i.month!==payload.month),payload]},payload.month,seed)
    for(const [key,label] of [['cashClosing','保存后月末现金'],['foodIncomeTotal','伙食收入合计'],['foodExpense','伙食支出合计'],['foodBalance','伙食结余'],['storeIncomeTotal','招待品收入合计'],['storeExpense','招待品支出合计'],['storeBalance','招待品结余']])r.push({key,label,value:money(m[key])+' USD'})
  }
  return r
})
function prepare(){try{error.value='';preview.value=ledger.prepare(props.kind,draft)}catch(e){error.value=e.message}}
async function confirm(){try{error.value='';const result=await confirmPreview(preview.value);emit('saved',result);emit('close')}catch(e){error.value=e.message}}
</script>
<template>
 <div class="modal-backdrop" @click.self="!storage.busy&&emit('close')"><section class="dialog aux-dialog" role="dialog" aria-modal="true" :aria-label="name">
  <header class="dialog-header"><div><span class="eyebrow">{{preview?'REVIEW BEFORE SAVE':'WORKSHEET INPUT'}}</span><h2>{{name}}</h2></div><button class="icon-button" aria-label="关闭" :disabled="storage.busy" @click="emit('close')">×</button></header>
  <div class="dialog-body"><div v-if="error" class="error-message" role="alert">{{error}}</div>
   <template v-if="!preview">
    <div v-if="kind==='code'" class="form-grid">
     <label>编码分组<select aria-label="编码分组" v-model="draft.namespace" :disabled="!!draft.originalKey"><option value="ship_management">Ship Management 船管</option><option value="crew_detail">Crew Dept 船员细项</option></select></label>
     <label>费用编码<input aria-label="费用编码" v-model="draft.code" :readonly="!!draft.originalKey"></label>
     <label class="span-two">名称<input aria-label="名称" v-model="draft.description"></label><label>中文名称<input v-model="draft.chinese_description"></label><label>责任部门<input aria-label="责任部门" v-model="draft.pic"></label>
    </div>
    <template v-if="kind==='estimate'"><p class="form-help">沿用原表：原币金额 ÷ Rating 得到 USD；Lowest、Highest 引用 USD。Reasonable 可填写，地区和加班参数单独保留。</p><div class="form-grid">
     <label v-for="key in ['vessel','description','rqa','supplier','po','originalAmount','rating','catalogue','agreement','place','overtime','reasonable']" :key="key">{{labels[key]}}<input :aria-label="labels[key]" v-model="draft[key]" :type="['originalAmount','rating','place','overtime','reasonable'].includes(key)?'number':'text'" step="any" :list="key==='catalogue'?'estimate-catalogues':key==='agreement'?'estimate-agreements':undefined"></label>
    </div><datalist id="estimate-catalogues"><option v-for="v in ['Shipowner','Flag','DOC','RSO','Class','H&M','P&I','Port','Anchorage','Working','Wenked']">{{v}}</option></datalist><datalist id="estimate-agreements"><option>Take-over</option><option>OPEX</option></datalist></template>
    <template v-if="kind==='inventory'"><p class="form-help">月度金额以 USD 输入，RMB 按换算除数展示。关联的备用金收支自动带入，手工补充金额只填写尚未录入的项目。</p><div class="form-grid"><label>月份<input aria-label="月份" type="month" v-model="draft.month"></label><label>RMB 换算除数<input aria-label="RMB 换算除数" type="number" step="any" v-model="draft.rmbRate"></label><label v-for="[key,label] in inventoryFields" :key="key">{{label}} USD<input :aria-label="label" type="number" step="any" v-model="draft[key]"></label><label class="span-two">备注<textarea aria-label="备注" v-model="draft.note"></textarea></label></div></template>
    <template v-if="kind==='void'"><div class="entry-context"><strong>{{draft.id}}</strong><p>作废后，各分类和资金会撤销此笔演示记录的影响。记录及原有收付款仍可在操作记录中查看。</p></div><label class="wide-label">作废原因<textarea aria-label="作废原因" v-model="draft.reason"></textarea></label></template>
   </template>
   <template v-else><div class="preview-heading"><span class="status-tag">尚未保存</span><h3>核对修改内容</h3><p>再次确认后写入此浏览器的演示账本。</p></div><div class="preview-fields"><div v-for="r in rows" :key="r.key"><span>{{r.label}}</span><strong>{{r.value===null||r.value===''||r.value===undefined?'未填写':r.value}}</strong></div></div><div class="preview-destinations"><span>更新范围</span><strong v-for="s in preview.sheets">{{s}}</strong></div></template>
  </div><footer class="dialog-footer"><span>{{preview?'第二次确认后保存':'填写内容尚未保存'}}</span><div><button class="secondary" :disabled="storage.busy" @click="preview?preview=null:emit('close')">{{preview?'返回修改':'取消'}}</button><button v-if="!preview" class="primary" :disabled="context.role!=='finance'" @click="prepare">确认并预览</button><button v-else class="primary" :disabled="storage.busy||context.role!=='finance'" @click="confirm">{{storage.busy?'保存中…':kind==='void'?'确认作废':'确认保存'}}</button></div></footer>
 </section></div>
</template>
