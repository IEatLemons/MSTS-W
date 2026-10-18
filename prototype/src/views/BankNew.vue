<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated, seedData } from '../lib/store'

const router = useRouter()
const form = reactive({ date: seedData.asOf, direction: '出账', gross: '', fee: '0', memo: '' })
const formError = ref('')

function save() {
  const gross = Number(form.gross)
  const fee = Number(form.fee || 0)
  if (!gross) {
    formError.value = '金额要填。'
    return
  }
  addCreated('bank', {
    date: form.date,
    direction: form.direction,
    gross,
    fee,
    net: form.direction === '入账' ? gross - fee : gross + fee,
    balance: null,
    memo: form.memo.trim() || '本次新建',
    currency: '美元',
    account: seedData.bank[0]?.account,
    sequence: 99,
  })
  router.push('/app/bank')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/bank">返回银行对账</RouterLink>
    <h1>新建流水</h1>
    <p class="lede">这是补登一笔银行事实，不会改快照余额 92,779.85。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label>日期<input v-model="form.date" type="date" /></label>
        <label>方向
          <select v-model="form.direction">
            <option>出账</option>
            <option>入账</option>
          </select>
        </label>
        <label>金额 USD<input v-model="form.gross" inputmode="decimal" required /></label>
        <label>手续费 USD<input v-model="form.fee" inputmode="decimal" /></label>
        <label class="wide">摘要<input v-model="form.memo" /></label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
  </main>
</template>
