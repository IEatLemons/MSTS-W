<script setup>
import {computed,ref} from 'vue'
import {data,context,selectedVessels,vesselScopeLabel,applyVesselScope} from '../store.js'
const open=ref(false),query=ref(''),all=ref(true),ids=ref([])
const matches=computed(()=>data.vessels.filter(v=>[v.name,v.imo,v.company].join(' ').toLowerCase().includes(query.value.trim().toLowerCase())))
const count=computed(()=>all.value?data.vessels.length:ids.value.length)
function toggle(){open.value=!open.value;if(open.value){query.value='';all.value=context.vesselScope==='all';ids.value=all.value?[]:[...context.vesselScope]}}
function check(id,checked){if(all.value){ids.value=data.vessels.map(v=>v.id);all.value=false}ids.value=checked?[...new Set([...ids.value,id])]:ids.value.filter(x=>x!==id)}
async function apply(scope=all.value?'all':ids.value){await applyVesselScope(scope);open.value=false}
</script>
<template>
 <div class="vessel-scope">
  <button class="vessel-scope-trigger" aria-label="选择船舶范围" :aria-expanded="open" @click="toggle"><span>查看船舶</span><strong>{{vesselScopeLabel}}</strong><small>{{selectedVessels.length===1?(selectedVessels[0].company||'公司未填写'):'按所选船舶汇总 · USD'}}</small><b>⌄</b></button>
  <template v-if="open"><div class="scope-dismiss" @click="open=false"></div><section class="vessel-popover" role="dialog" aria-label="船舶筛选"><header><strong>选择统计范围</strong><button class="text-button" @click="all=false;ids=[]">清空选择</button></header><input class="vessel-search" aria-label="搜索船舶" placeholder="搜索船名、IMO、所属公司" v-model="query"><label class="all-vessels"><input type="checkbox" aria-label="全部船舶" v-model="all" @change="ids=[]">全部船舶 <small>包含以后新增的船舶</small></label><div class="vessel-options"><div class="vessel-option" v-for="v in matches" :key="v.id"><label><input type="checkbox" :aria-label="'选择 '+v.name" :checked="all||ids.includes(v.id)" @change="check(v.id,$event.target.checked)"><span><strong>{{v.name}}</strong><small>IMO {{v.imo||'未填写'}} · {{v.company||'公司未填写'}}</small></span></label><button class="text-button" @click="all=false;ids=[v.id]">仅此船</button></div><p v-if="!matches.length" class="form-help">没有匹配的船舶。</p></div><footer><button class="text-button" @click="apply('all')">恢复全部</button><span>已选 {{count}} 艘</span><button class="primary" :disabled="!count" @click="apply()">应用筛选</button></footer></section></template>
 </div>
</template>
