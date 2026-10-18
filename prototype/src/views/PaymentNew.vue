<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated } from '../lib/store'

const router = useRouter()
const form = reactive({ description: '', invoiceUsd: '', fee: '0', companyKind: 'VESSEL' })
const formError = ref('')

function save() {
  const invoiceUsd = Number(form.invoiceUsd)
  const fee = Number(form.fee || 0)
  if (!form.description.trim() || !invoiceUsd) {
    formError.value = '摘要和付款金额都要填。'
    return
  }
  addCreated('payments', {
    description: form.description.trim(),
    invoiceUsd,
    fee,
    companyKind: form.companyKind,
    status: 'Completed',
    paymentOnly: true,
    slip: '待补',
  })
  router.push('/app/payments')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/payments">返回付款核销</RouterLink>
    <h1>新建付款</h1>
    <p class="lede">登记的是支付结果，不是网银直接付款。保存后回到列表。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label class="wide">摘要<input v-model="form.description" required /></label>
        <label>付款分类
          <select v-model="form.companyKind">
            <option value="VESSEL">船舶费用</option>
            <option value="OFFICE">办公室</option>
            <option value="PAYROLL">人员薪资</option>
          </select>
        </label>
        <label>付款 USD<input v-model="form.invoiceUsd" inputmode="decimal" required /></label>
        <label>手续费 USD<input v-model="form.fee" inputmode="decimal" /></label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
    <article class="callout">
      想看一笔 1,000 美元发票怎样分两次付清，打开
      <RouterLink to="/app/payments/example">付款示例</RouterLink>。
    </article>
  </main>
</template>
