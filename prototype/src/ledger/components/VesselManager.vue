<script setup>
import {ref} from 'vue'
import {data,context,seed} from '../store.js'
import {historyFor} from '../vessels.js'
import AuxDialog from './AuxDialog.vue'
const emit=defineEmits(['close'])
const editor=ref(null)
</script>
<template>
 <div class="modal-backdrop" @click.self="emit('close')"><section class="dialog vessel-manager" role="dialog" aria-modal="true" aria-label="管理船舶"><header class="dialog-header"><div><span class="eyebrow">VESSEL DIRECTORY</span><h2>管理船舶</h2><p>船舶档案与账目通过固定编号关联，改名不改变账目归属。</p></div><button class="icon-button" aria-label="关闭" @click="emit('close')">×</button></header><div class="dialog-body"><button class="primary" :disabled="context.role!=='finance'" @click="editor={name:'',imo:'',company:''}">＋ 新增船舶</button><article v-for="v in data.vessels" :key="v.id" class="vessel-directory-row"><div><strong>{{v.name}}<small v-if="v.needsReview"> · 待完善档案</small></strong><p>IMO {{v.imo||'未填写'}} · {{v.company||'公司未填写'}}</p><small>{{historyFor(seed,data,v.id)?'含独立历史底稿':(data.entries.some(e=>e.vesselId===v.id&&!e.voided)?'未导入历史；仅统计本次登记净额':'空账本，未导入历史；仅统计本次登记净额')}}</small></div><button class="secondary" :disabled="context.role!=='finance'" @click="editor={...v}">编辑 {{v.name}}</button></article></div><footer class="dialog-footer"><span>新船不会继承原船的账目、账号或余额</span><button class="secondary" @click="emit('close')">关闭</button></footer></section></div>
 <AuxDialog v-if="editor" kind="vessel" :initial="editor" @close="editor=null" @saved="editor=null"/>
</template>
