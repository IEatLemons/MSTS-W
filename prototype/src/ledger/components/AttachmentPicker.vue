<script setup>
import { computed } from 'vue'
import { ATTACHMENTS } from '../schema.js'

const props=defineProps({kind:String,label:String,files:{type:Array,default:()=>[]},disabled:Boolean})
const emit=defineEmits(['add','remove'])
const title=computed(()=>props.label||ATTACHMENTS[props.kind])
const size=bytes=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`
</script>

<template>
 <section class="attachment-picker" :aria-label="title+'附件'">
  <div class="attachment-heading"><strong>{{title}}</strong><span>已选 {{files.length}} 个文件</span></div>
  <label class="attachment-select" :class="{disabled}">
   <input type="file" multiple :aria-label="title+'：选择多个文件'" :data-testid="'attachment-'+kind" :disabled="disabled" @change="emit('add',$event,kind)">
   <span>＋ {{files.length?'继续添加文件':'选择多个文件'}}</span>
  </label>
  <p class="attachment-hint">支持多选，也可分批追加</p>
  <ul v-if="files.length" class="attachment-files">
   <li v-for="file in files" :key="file.id"><div><span :title="file.name">{{file.name}}</span><small>{{size(file.size||0)}}</small></div><button type="button" :aria-label="'移除 '+file.name" :disabled="disabled" @click="emit('remove',file.id)">移除</button></li>
  </ul>
 </section>
</template>

<style scoped>
.attachment-picker{min-width:0;border:1px dashed #b9d0d6;border-radius:6px;padding:15px;background:#fbfdfd}
.attachment-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;font-size:12px}
.attachment-heading strong{color:#52737d;font-weight:600}.attachment-heading>span{color:#7e959e;font-size:10px;white-space:nowrap}
.attachment-select{display:inline-flex;position:relative;overflow:hidden;padding:8px 12px;border:1px solid #b8cdd2;border-radius:4px;background:#fff;color:#315c67;font-size:12px;font-weight:600;cursor:pointer}
.attachment-select:focus-within{outline:3px solid #91b8b8;outline-offset:2px}.attachment-select:hover{background:#edf4f5}.attachment-select.disabled{opacity:.4;cursor:not-allowed}
.attachment-select input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:0;cursor:inherit}.attachment-select span{pointer-events:none}
.attachment-hint{font-size:10px;color:#7e959e;margin:9px 0 0}.attachment-files{list-style:none;padding:0;margin:12px 0 0;display:grid;gap:7px}
.attachment-files li{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px;border:1px solid #e0eaed;border-radius:4px;background:#fff;font-size:11px}.attachment-files li>div{min-width:0}.attachment-files li span{display:block;overflow-wrap:anywhere;color:#34555f}.attachment-files small{display:block;margin-top:4px;color:#8aa0a8}.attachment-files button{flex:none;color:#9b6655;background:none;font-size:11px;padding:6px}
</style>
