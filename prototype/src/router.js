import { createRouter,createWebHashHistory } from 'vue-router'
import LedgerShell from './ledger/LedgerShell.vue'
import LedgerPage from './ledger/LedgerPage.vue'
import VesselManager from './ledger/components/VesselManager.vue'
import {financialReturn} from './ledger/navigation.js'
import { SHEETS } from './ledger/schema.js'
export default createRouter({
 history:createWebHashHistory(),
 routes:[
  {path:'/',redirect:'/sheets/sofp'},
  {path:'/sheets',component:LedgerShell,children:SHEETS.map(s=>({path:s.id,component:LedgerPage,meta:{sheetId:s.id}}))},
  {path:'/fleet',redirect:'/fleet/vessels'},
  {path:'/fleet/:section(vessels|owners|ownerships|crew|assignments)',component:VesselManager},
  {path:'/app/:pathMatch(.*)*',redirect:'/sheets/sofp'},
  {path:'/:pathMatch(.*)*',redirect:'/sheets/sofp'},
 ],
 scrollBehavior:(to,from,savedPosition)=>savedPosition||(from.path.startsWith('/fleet/')&&to.fullPath===financialReturn.path?{top:financialReturn.top}:{top:0}),
})
