<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated, seedData, state } from '../lib/store'

const router = useRouter()
const kpis = seedData.kpis
const form = reactive({ title: '', amount: '', dailyRate: '', days: '' })
const formError = ref('')

function save() {
  const amount = Number(form.amount)
  if (!form.title.trim() || !amount) {
    formError.value = '事项和金额都要填。'
    return
  }
  addCreated('funding', {
    title: form.title.trim(),
    amount,
    status: '未到账',
    dailyRate: form.dailyRate,
    days: form.days,
  })
  router.push('/app/funding')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/funding">返回资金计划</RouterLink>
    <h1>新建资金计划</h1>
    <p class="lede">没到账之前不增加银行，也不算实收。保存后回到列表。</p>
    <section class="split">
      <article class="card">
        <form class="form" @submit.prevent="save">
          <label class="wide">事项<input v-model="form.title" required /></label>
          <label>计划额 USD<input v-model="form.amount" inputmode="decimal" required /></label>
          <label>日费率<input v-model="form.dailyRate" inputmode="decimal" /></label>
          <label>天数<input v-model="form.days" inputmode="numeric" /></label>
          <div class="actions wide">
            <button class="btn" type="submit">保存并返回列表</button>
            <span v-if="formError" class="bad">{{ formError }}</span>
          </div>
        </form>
      </article>
      <article class="panel">
        <h2>10 月计划拨款</h2>
        <b class="figure">{{ money(kpis.plannedFunding) }}</b>
        <p>{{ money(kpis.dailyRate) }} × {{ kpis.planDays }} 天。模拟到账不会改历史实收 371,554.52。</p>
        <p v-if="!state.planReceived" class="tag warn">未到账</p>
        <p v-else class="tag good">已模拟到账</p>
        <div class="actions">
          <button class="btn" type="button" :disabled="state.planReceived" @click="state.planReceived = true">模拟到账</button>
          <button class="text-btn" type="button" @click="state.planReceived = false">撤销模拟</button>
        </div>
      </article>
    </section>
  </main>
</template>
