<script setup>
import {computed,ref} from 'vue'
import {data,context,ledger,getFile,downloadFile} from '../store.js'
import {ATTACHMENTS,CATEGORIES,PURPOSES,WALLETS,FIELD_LABELS} from '../schema.js'
import {money} from '../decimal.js'
const props=defineProps({row:Object,columns:Array})
const emit=defineEmits(['close','edit','payment','void','copy'])
const entry=computed(()=>data.entries.find(e=>e.id===(props.row.entryId||props.row.id)))
const logs=computed(()=>data.audit.filter(a=>a.entityId===entry.value?.id))
const canCopy=computed(()=>props.columns.some(c=>['invoice_usd','gross_amount','receipt_original_amount'].includes(c.key)))
const error=ref('')
async function openFile(a){try{const blob=await getFile(a.id);if(!blob)throw Error('此文件在当前浏览器中不可用');downloadFile(blob,a.name)}catch(e){error.value=e.message}}
const format=(v,type)=>v===null||v===undefined||v===''?'未填写':type==='decimal'?money(v):type==='date'?String(v).slice(0,10):String(v)
</script>
<template>
 <div class="modal-backdrop" @click.self="emit('close')"><section class="dialog detail-dialog" role="dialog" aria-modal="true" aria-label="账目详情">
  <header class="dialog-header"><div><span class="eyebrow">{{row.isSource?'EXCEL DEMO RECORD':'LEDGER RECORD'}}</span><h2>{{entry?.fields.description||row.description||row.receipt_type||row.memo||'分表记录'}}</h2><p>{{row.sourceRef}}</p></div><button class="icon-button" aria-label="关闭" @click="emit('close')">×</button></header>
  <div class="dialog-body"><div v-if="error" class="error-message">{{error}}</div>
   <div v-if="entry" class="record-overview"><span class="direction-pill" :class="entry.direction">{{entry.direction==='in'?'入账':'出账'}}</span><strong>{{money(entry.amount)}} USD</strong><span>{{PURPOSES[entry.kind]}}</span><span class="status-tag">{{entry.voided?'已作废':entry.fields.payment_status}}</span></div>
   <div v-if="row.isSource" class="source-note">Excel 演示底稿 · 原始行保持只读。可以使用“以此新增”练习录入，原表不会被改写。</div>
   <div class="preview-fields"><div v-for="col in columns" :key="col.key"><span>{{col.label}}<small v-if="col.column"> · {{col.column}}</small></span><strong :class="{'formula-error':String(row[col.key]).startsWith('#')}">{{format(row[col.key],col.type)}}</strong></div></div>
   <template v-if="entry"><h3>分类分配</h3><div class="preview-fields"><div v-for="a in entry.allocations" :key="a.category"><span>{{CATEGORIES.find(c=>c.id===a.category)?.name}}</span><strong>{{money(a.amount)}} USD</strong></div></div><h3>实际收付款</h3><p>已收付 {{money(ledger.paid(entry))}} USD · 剩余 {{money(ledger.pending(entry))}} USD</p><div class="settlement-row" v-for="s in entry.settlements" :key="s.id"><div><strong>{{s.id}} · {{money(s.amount)}} USD</strong><p>{{s.date}} · {{WALLETS.find(w=>w.id===s.wallet)?.name}} · 手续费 {{money(s.fee)}} USD</p><small>{{s.reference}}</small></div><button v-for="a in s.attachments" class="text-button" @click="openFile(a)">{{a.name}}</button></div><p v-if="!entry.settlements.length" class="muted">尚未发生实际收付款。</p><h3>附件</h3><div class="file-list"><button v-for="a in entry.attachments" :key="a.id" class="secondary" @click="openFile(a)">{{ATTACHMENTS[a.kind]}} · {{a.name}}</button><small v-if="!entry.attachments.length">未添加附件</small></div><h3>操作记录</h3><article class="audit-row" v-for="log in logs" :key="log.id"><strong>{{({entry:'确认录入',edit:'修改账目',payment:'登记收付款',void:'作废账目'})[log.action]||log.action}}</strong><small>{{new Date(log.at).toLocaleString('zh-CN')}} · 财务</small><details v-if="log.before"><summary>查看修改前后</summary><div class="audit-diff"><pre>{{JSON.stringify(log.before,null,2)}}</pre><pre>{{JSON.stringify(log.after,null,2)}}</pre></div></details></article></template>
   <p v-else class="form-help">原表附件仅提供文件名，未包含发票及回单原文件。</p>
   <details v-if="entry" class="original-grid"><summary>关联原账目完整资料</summary><div class="preview-fields"><div v-for="(value,key) in entry.fields" :key="key"><span>{{FIELD_LABELS[key]||key}}</span><strong>{{value===null||value===undefined||value===''?'未填写':value}}</strong></div></div></details>
  </div><footer class="dialog-footer"><span>{{entry?.voided?'此笔账已作废，原记录保留':row.isSource?'来源位置可追溯':'同一编号在相关分表同步展示'}}</span><div><button class="secondary" @click="emit('close')">关闭</button><template v-if="context.role==='finance'"><button v-if="row.isSource&&canCopy" class="primary" @click="emit('copy',row)">以此新增</button><template v-else-if="entry&&!entry.voided"><button class="danger-button" @click="emit('void',entry)">作废</button><button class="secondary" @click="emit('edit',entry)">修改</button><button v-if="Number(ledger.pending(entry))>0" class="primary" @click="emit('payment',entry)">登记{{entry.direction==='in'?'收款':'付款'}}</button></template></template></div></footer>
 </section></div>
</template>
