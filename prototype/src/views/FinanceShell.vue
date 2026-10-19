<script setup>
import { computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAV, ROLES } from '../finance/seed'
import { context, data, dbState, engine, persist, resetDemo } from '../finance/store'
const route=useRoute();const router=useRouter()
const allowedCompanies=computed(()=>data.companies.filter(c=>engine.role().companies.includes(c.id)))
const vessels=computed(()=>data.vessels.filter(v=>context.companyId==='MSTS'||v.companyId===context.companyId))
const currentVessel=computed(()=>data.vessels.find(v=>v.id===context.vesselId))
watch(()=>context.roleId,()=>{if(!engine.role().companies.includes(context.companyId))context.companyId=allowedCompanies.value[0].id;persist()})
watch(()=>context.companyId,()=>{if(!vessels.value.some(v=>v.id===context.vesselId))context.vesselId='';persist()})
watch(()=>[context.vesselId,context.period],()=>persist())
async function reset(){if(!confirm('重置本浏览器的演示单据和附件？历史 Excel 数据不受影响。'))return;try{await resetDemo();router.push('/app');dbState.message='演示数据已重置'}catch(e){dbState.error=e.message}}
</script>
<template>
  <div class="f-app">
    <aside class="f-sidebar f-print-hide">
      <RouterLink to="/app" class="f-brand"><span class="f-brand-mark">M<span>↗</span></span><div><strong>MSTS</strong><small>MARITIME FINANCE</small></div></RouterLink>
      <div class="f-side-caption">财务管理工作区 <span>DEMO</span></div>
      <nav aria-label="财务模块导航"><template v-for="module in NAV" :key="module.id"><RouterLink v-if="!module.pages" to="/app" class="f-nav-item" :class="{active:route.path==='/app'}"><i>{{module.mark}}</i>{{module.name}}</RouterLink><details v-else :open="route.meta.module===module.id"><summary><i>{{module.mark}}</i>{{module.name}}<b>⌄</b></summary><RouterLink v-for="[page,label] in module.pages" :key="page" :to="`/app/${module.id}/${page}`" :class="{active:route.meta.module===module.id&&route.meta.page===page}">{{label}}</RouterLink></details></template></nav>
      <div class="f-side-footer"><span class="f-live-dot"></span><div>示例账与真实快照独立<small>所有财务参数仅供流程评审</small></div></div>
    </aside>
    <div class="f-main">
      <header class="f-topbar f-print-hide"><div class="f-breadcrumb">MSTS 财务系统 <span>/</span> {{NAV.find(n=>n.id===route.meta.module)?.name||'工作台'}}</div><div class="f-user"><span class="f-avatar">{{engine.role().user.slice(-1)}}</span><select v-model="context.roleId" aria-label="当前角色"><option v-for="r in ROLES" :key="r.id" :value="r.id">{{r.name}}</option></select><button class="f-link" :disabled="!engine.access('reset')" @click="reset">重置演示</button></div></header>
      <section class="f-context-bar f-print-hide"><label>当前账套<select v-model="context.companyId" aria-label="当前账套"><option v-for="c in allowedCompanies" :key="c.id" :value="c.id">{{c.name}}</option></select></label><label>船舶 / IMO<select v-model="context.vesselId" aria-label="船舶筛选"><option value="">{{context.companyId==='MSTS'?'全部船舶及本部':'本账套全部船舶'}}</option><option v-for="v in vessels" :key="v.id" :value="v.id">{{v.name}} · {{v.imo}}</option></select></label><label>会计期间<input :value="context.period" @change="event=>{if(/^\d{4}-\d{2}$/.test(event.target.value))context.period=event.target.value}" type="month" min="2026-10" aria-label="会计期间" /></label><span class="f-period-status" :class="{closed:data.periods[context.companyId]?.[context.period]==='closed'}">{{data.periods[context.companyId]?.[context.period]==='closed'?'● 已结账':'● 未结账'}} · USD</span></section>
      <div class="f-demo-strip f-print-hide"><span>演示工作区</span><p>{{context.roleId==='demo'?'全量浏览与操作 · 可切换角色演练分工':`权限演练 · ${engine.role().user} · 仅限授权账套`}}<template v-if="currentVessel"> · {{currentVessel.imo}}</template></p><small>{{dbState.saving?'保存中…':dbState.persistence}}</small></div>
      <div v-if="dbState.error" class="f-notice error" role="alert"><b>操作未完成</b> {{dbState.error}}<button aria-label="关闭错误提示" @click="dbState.error=''">×</button></div><div v-if="dbState.message" class="f-notice success" role="status">{{dbState.message}}<button aria-label="关闭成功提示" @click="dbState.message=''">×</button></div>
      <router-view :key="`${route.fullPath}-${context.companyId}`" />
      <footer class="f-page-footer">MSTS FINANCE <span>本地产品原型 · 示例数据 · 会计政策可配置</span></footer>
    </div>
  </div>
</template>
