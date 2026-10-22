<script setup>
import {ref} from 'vue'
import {SHEETS} from './schema.js'
import {context,storage,seed,persistContext} from './store.js'
import VesselScope from './components/VesselScope.vue'
import VesselManager from './components/VesselManager.vue'
const navOpen=ref(false),manageVessels=ref(false)
</script>
<template>
 <div class="ledger-app">
  <aside class="ledger-sidebar" :class="{open:navOpen}">
   <router-link class="brand" to="/sheets/sofp"><span class="brand-mark">M<span>↗</span></span><span>MSTS<small>EXCEL LEDGER</small></span></router-link>
   <div class="sidebar-label">工作簿分表 <span>14</span></div>
   <nav aria-label="Excel分表导航"><router-link v-for="(sheet,i) in SHEETS" :key="sheet.id" :to="'/sheets/'+sheet.id" :class="{'has-sheet-color':sheet.tabColor}" :style="sheet.tabColor?{'--sheet-tab-color':sheet.tabColor}:undefined" @click="navOpen=false"><span class="nav-index">{{String(i+1).padStart(2,'0')}}</span><span class="nav-title">{{sheet.name}}<small>{{sheet.label}}</small></span><span class="nav-arrow">↗</span></router-link></nav>
   <div class="sidebar-footer"><span class="demo-dot"></span> EXCEL 记账原型 <small>独立版本 · 本地 Demo</small></div>
  </aside>
  <div class="ledger-main">
   <header class="app-topbar"><button class="icon-button mobile-menu" aria-label="展开导航" @click="navOpen=!navOpen">☰</button><VesselScope/><div class="topbar-actions"><button v-if="context.role==='finance'" class="secondary" @click="manageVessels=true">管理船舶</button><span class="local-status" :class="{warning:storage.message.includes('仅当前')||storage.message.includes('失败')}"><i></i>{{storage.message}}</span><label class="role-switch">演示身份<select aria-label="演示身份" v-model="context.role" @change="persistContext"><option value="finance">财务</option><option value="reader">只读查看</option></select></label></div></header>
   <div v-if="storage.notice" class="toast" role="status"><span>✓ {{storage.notice}}</span><button aria-label="关闭提示" @click="storage.notice=''">×</button></div>
   <router-view/>
   <VesselManager v-if="manageVessels" @close="manageVessels=false"/>
   <footer class="app-footer"><span>MSTS · Excel 分表记账版</span><span>原表快照 {{seed.asOf}} · 示例数据仅用于本地演示</span><a href="./releases/full-finance-20261020/index.html" target="_blank" rel="noopener">打开旧版封存包 ↗</a></footer>
  </div>
 </div>
</template>
