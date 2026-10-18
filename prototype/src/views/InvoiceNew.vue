<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated } from '../lib/store'

const router = useRouter()
const form = reactive({ description: '', supplier: '', invoiceUsd: '', dueDate: '', status: 'Received' })
const formError = ref('')

function save() {
  const invoiceUsd = Number(form.invoiceUsd)
  if (!form.description.trim() || !invoiceUsd) {
    formError.value = '摘要和发票金额都要填。'
    return
  }
  addCreated('invoices', {
    description: form.description.trim(),
    supplier: form.supplier.trim(),
    invoiceUsd,
    dueDate: form.dueDate,
    status: form.status,
    sheet: 'Expenses Lists',
  })
  router.push('/app/invoices')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/invoices">返回发票应付</RouterLink>
    <h1>新建发票</h1>
    <p class="lede">发票金额和订单、验收可以不同。保存后回到列表，不会改 10 月 14 日快照。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label class="wide">摘要<input v-model="form.description" required /></label>
        <label>供应商<input v-model="form.supplier" /></label>
        <label>发票 USD<input v-model="form.invoiceUsd" inputmode="decimal" required /></label>
        <label>到期日<input v-model="form.dueDate" type="date" /></label>
        <label>状态
          <select v-model="form.status">
            <option>Received</option>
            <option>Accrual</option>
            <option>Completed</option>
          </select>
        </label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
  </main>
</template>
