<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addExpense, seedData } from '../lib/store'

const router = useRouter()
const form = reactive({ description: '', supplier: '', center: 'SHIPMANAGEMENT', original: '', rate: '1' })
const formError = ref('')

function createExpense() {
  const original = Number(form.original)
  const rate = Number(form.rate)
  if (!form.description.trim() || !original || !rate) {
    formError.value = '摘要、原币金额和汇率都要填。'
    return
  }
  addExpense({
    description: form.description.trim(),
    supplier: form.supplier.trim(),
    center: form.center,
    companyKind: form.center === 'OFFICE' || form.center === 'PAYROLL' ? form.center : 'VESSEL',
    original,
    rate,
    poUsd: Math.round(original * rate * 100) / 100,
    status: '',
  })
  router.push('/app/expenses')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/expenses">返回费用台账</RouterLink>
    <h1>新建费用</h1>
    <p class="lede">这笔只留在当前浏览器会话，刷新后消失，也不会改 10 月 14 日快照。</p>
    <section class="card">
      <form class="form" @submit.prevent="createExpense">
        <label class="wide">摘要<input v-model="form.description" required /></label>
        <label>供应商<input v-model="form.supplier" /></label>
        <label>费用中心
          <select v-model="form.center">
            <optgroup label="船舶费用">
              <option v-for="row in seedData.costCenters.filter((item) => item.scope !== 'company')" :key="row.code" :value="row.code">{{ row.name }}</option>
            </optgroup>
            <optgroup label="公司付款">
              <option v-for="row in seedData.costCenters.filter((item) => item.scope === 'company')" :key="row.code" :value="row.code">{{ row.name }}</option>
            </optgroup>
          </select>
        </label>
        <label>原币金额<input v-model="form.original" inputmode="decimal" required /></label>
        <label>折美元汇率<input v-model="form.rate" inputmode="decimal" required /></label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
  </main>
</template>
