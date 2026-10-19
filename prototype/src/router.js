import { createRouter, createWebHashHistory } from 'vue-router'
import FinanceShell from './views/FinanceShell.vue'
import FinanceWorkspace from './views/FinanceWorkspace.vue'
import { NAV } from './finance/seed'
const legacy = {
 expenses:'/app/ap/invoices', invoices:'/app/ap/invoices',payments:'/app/ap/payments',receipts:'/app/ar/receipts',bank:'/app/treasury/bank',cash:'/app/treasury/cash',settlements:'/app/ar/bills',funding:'/app/treasury/funding',inventory:'/app/treasury/cash',reports:'/app/gl/reports',periods:'/app/gl/periods',audit:'/app/history/records',ops:'/app/settings/audit',master:'/app/settings/organizations',
}
export default createRouter({
 history:createWebHashHistory(),
 routes:[
  {path:'/',redirect:'/app'},
  {path:'/app',component:FinanceShell,children:[
   {path:'',component:FinanceWorkspace},
   ...NAV.filter(n=>n.pages).flatMap(n=>n.pages.map(([page])=>({path:`${n.id}/${page}`,component:FinanceWorkspace,meta:{module:n.id,page}}))),
   {path:'history/reports/sofp',redirect:'/app/history/snapshot'},
  ]},
  {path:'/app/reports/sofp',redirect:'/app/history/snapshot'},
  ...Object.entries(legacy).map(([path,target])=>({path:`/app/${path}/:rest(.*)*`,redirect:target})),
  {path:'/:pathMatch(.*)*',redirect:'/app'},
 ],
 scrollBehavior:()=>({top:0}),
})
