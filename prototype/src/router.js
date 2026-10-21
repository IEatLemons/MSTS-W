import { createRouter,createWebHashHistory } from 'vue-router'
import LedgerShell from './ledger/LedgerShell.vue'
import LedgerPage from './ledger/LedgerPage.vue'
import { SHEETS } from './ledger/schema.js'
export default createRouter({
 history:createWebHashHistory(),
 routes:[
  {path:'/',redirect:'/sheets/sofp'},
  {path:'/sheets',component:LedgerShell,children:SHEETS.map(s=>({path:s.id,component:LedgerPage,meta:{sheetId:s.id}}))},
  {path:'/app/:pathMatch(.*)*',redirect:'/sheets/sofp'},
  {path:'/:pathMatch(.*)*',redirect:'/sheets/sofp'},
 ],
 scrollBehavior:()=>({top:0}),
})
