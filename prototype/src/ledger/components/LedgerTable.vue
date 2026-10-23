<script setup>
import { money } from '../decimal.js'
import {onMounted,onBeforeUnmount,ref} from 'vue'
defineProps({columns:Array,rows:Array,empty:{type:String,default:'没有符合条件的记录'},actions:{type:Boolean,default:true},compact:{type:Boolean,default:false},actionLabel:{type:String,default:'详情'}})
defineEmits(['detail'])
const table=ref(null),firstColumnWidth=ref('160px')
let columnObserver
onMounted(()=>{
 const first=table.value?.querySelector('th')
 if(!first)return
 columnObserver=new ResizeObserver(()=>{const width=first.getBoundingClientRect().width;if(width)firstColumnWidth.value=width+'px'})
 columnObserver.observe(first)
})
onBeforeUnmount(()=>columnObserver?.disconnect())
function columnWidth(col,i,compact){
 const width=col.width||(compact?'180px':i===0?'160px':i===1?'280px':'160px')
 return width.endsWith('px')?`calc(${width} * var(--ledger-ui-scale, 1))`:width
}
function display(row,col){
  const value=row[col.key]
  if(value===null||value===undefined||value==='')return '—'
  if(col.type==='date')return String(value).slice(0,10)
  if(col.type==='decimal')return money(value)
  if(col.type==='mixed'&&typeof value==='number')return money(value)
  if(Array.isArray(value))return value.join('；')
  return value
}
</script>
<template>
  <div class="table-scroll" :class="{'table-scroll--compact':compact}">
    <table ref="table" class="ledger-table" :class="{'ledger-table--plain':compact}" :style="{'--ledger-first-column-width':firstColumnWidth}">
      <colgroup><col v-for="(col,i) in columns" :key="col.key" :style="{width:columnWidth(col,i,compact)}"><col v-if="actions" style="width:calc(94px * var(--ledger-ui-scale, 1))"></colgroup>
      <thead><tr><th v-for="col in columns" :key="col.key" :class="{'numeric':col.type==='decimal'}"><span>{{col.label}}</span><small v-if="col.column">{{col.column}}</small></th><th v-if="actions" class="row-action">记录</th></tr></thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" :class="{'new-record':!row.isSource,'voided-record':row.voided}">
          <td v-for="(col,i) in columns" :key="col.key" :class="{'numeric':col.type==='decimal','formula-error':String(row[col.key]??'').startsWith('#')}" :title="String(row[col.key]??'')">
            <span>{{display(row,col)}}</span><small v-if="i===0&&row.sourceRef" class="source-ref">{{row.sourceRef}}</small>
          </td>
          <td v-if="actions" class="row-action"><button class="text-button" @click="$emit('detail',row)">{{actionLabel}}</button><small>{{row.originLabel||(row.isSource?'Excel样例':'本次录入')}}</small></td>
        </tr>
        <tr v-if="!rows.length"><td class="empty-cell" :colspan="columns.length+(actions?1:0)">{{empty}}</td></tr>
      </tbody>
    </table>
  </div>
</template>
