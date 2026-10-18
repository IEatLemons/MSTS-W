import { createRouter, createWebHashHistory } from 'vue-router'
import { state } from './lib/store'
import Gate from './views/Gate.vue'
import Shell from './views/Shell.vue'
import Home from './views/Home.vue'
import Master from './views/Master.vue'
import Expenses from './views/Expenses.vue'
import ExpenseNew from './views/ExpenseNew.vue'
import ExpenseDetail from './views/ExpenseDetail.vue'
import Invoices from './views/Invoices.vue'
import InvoiceNew from './views/InvoiceNew.vue'
import InvoiceDetail from './views/InvoiceDetail.vue'
import Payments from './views/Payments.vue'
import PaymentNew from './views/PaymentNew.vue'
import PaymentExample from './views/PaymentExample.vue'
import Receipts from './views/Receipts.vue'
import ReceiptNew from './views/ReceiptNew.vue'
import Bank from './views/Bank.vue'
import BankNew from './views/BankNew.vue'
import BankDetail from './views/BankDetail.vue'
import Cash from './views/Cash.vue'
import CashNew from './views/CashNew.vue'
import Settlements from './views/Settlements.vue'
import SettlementNew from './views/SettlementNew.vue'
import Funding from './views/Funding.vue'
import FundingNew from './views/FundingNew.vue'
import Inventory from './views/Inventory.vue'
import InventoryNew from './views/InventoryNew.vue'
import Reports from './views/Reports.vue'
import Sofp from './views/Sofp.vue'
import Periods from './views/Periods.vue'
import Audit from './views/Audit.vue'
import Ops from './views/Ops.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', component: Gate },
    {
      path: '/app',
      component: Shell,
      children: [
        { path: '', component: Home },
        { path: 'master/:section', component: Master },
        { path: 'expenses', component: Expenses },
        { path: 'expenses/new', component: ExpenseNew },
        { path: 'expenses/:id', component: ExpenseDetail },
        { path: 'invoices', component: Invoices },
        { path: 'invoices/new', component: InvoiceNew },
        { path: 'invoices/:id', component: InvoiceDetail },
        { path: 'payments', component: Payments },
        { path: 'payments/new', component: PaymentNew },
        { path: 'payments/example', component: PaymentExample },
        { path: 'receipts', component: Receipts },
        { path: 'receipts/new', component: ReceiptNew },
        { path: 'bank', component: Bank },
        { path: 'bank/new', component: BankNew },
        { path: 'bank/:id', component: BankDetail },
        { path: 'cash', component: Cash },
        { path: 'cash/new', component: CashNew },
        { path: 'settlements', component: Settlements },
        { path: 'settlements/new', component: SettlementNew },
        { path: 'funding', component: Funding },
        { path: 'funding/new', component: FundingNew },
        { path: 'inventory', component: Inventory },
        { path: 'inventory/new', component: InventoryNew },
        { path: 'reports', component: Reports },
        { path: 'reports/sofp', component: Sofp },
        { path: 'periods', component: Periods },
        { path: 'audit', component: Audit },
        { path: 'ops', component: Ops },
      ],
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to) => {
  if (to.path.startsWith('/app') && !state.entry) return { path: '/' }
})

export default router
