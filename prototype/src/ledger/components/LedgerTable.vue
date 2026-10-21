<script setup>
import { money } from '../decimal.js'
defineProps({columns:Array,rows:Array,empty:{type:String,default:'没有符合条件的记录'},actions:{type:Boolean,default:true},compact:{type:Boolean,default:false},actionLabel:{type:String,default:'详情'}})
defineEmits(['detail'])
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
    <table class="ledger-table" :class="{'ledger-table--plain':compact}">
      <colgroup><col v-for="(col,i) in columns" :key="col.key" :style="{width:col.width||(compact?'180px':i===0?'160px':i===1?'280px':'160px')}"><col v-if="actions" style="width:94px"></colgroup>
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
