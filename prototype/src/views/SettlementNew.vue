<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated } from '../lib/store'

const router = useRouter()
const form = reactive({ description: '', ownerAmount: '', ownerStatus: '待收', sheet: 'Owner Cost' })
const formError = ref('')

function save() {
  const ownerAmount = Number(form.ownerAmount)
  if (!form.description.trim() || Number.isNaN(ownerAmount)) {
    formError.value = '摘要和结算额都要填。'
    return
  }
  addCreated('settlements', {
    description: form.description.trim(),
    ownerAmount,
    ownerStatus: form.ownerStatus,
    sheet: form.sheet,
    invoiceUsd: ownerAmount,
  })
  router.push('/app/settlements')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/settlements">返回船东结算</RouterLink>
    <h1>新建船东结算</h1>
    <p class="lede">付给供应商不等于船东已经报销。保存后回到列表。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label class="wide">摘要<input v-model="form.description" required /></label>
        <label>费用中心
          <select v-model="form.sheet">
            <option value="Owner Cost">船东费用</option>
            <option value="Take-Over Cost">接船费用</option>
            <option value="BMA Flag Change">换旗费用</option>
          </select>
        </label>
        <label>结算额 USD<input v-model="form.ownerAmount" inputmode="decimal" required /></label>
        <label>状态
          <select v-model="form.ownerStatus">
            <option>待收</option>
            <option>已收</option>
            <option>船东付</option>
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
