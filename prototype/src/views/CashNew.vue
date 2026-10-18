<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated, state } from '../lib/store'

const router = useRouter()
const form = reactive({ description: '', cashDirection: 'out', invoiceUsd: '' })
const formError = ref('')
const drill = computed(() => {
  let bank = 1000
  let cash = 0
  let expense = 0
  if (state.ctmTransfer) {
    bank -= 1000
    cash += 1000
  }
  if (state.ctmSpend) {
    cash -= 100
    expense += 100
  }
  return { bank, cash, expense }
})

function save() {
  const invoiceUsd = Number(form.invoiceUsd)
  if (!form.description.trim() || !invoiceUsd) {
    formError.value = '摘要和金额都要填。'
    return
  }
  const signed = form.cashDirection === 'out' ? -Math.abs(invoiceUsd) : Math.abs(invoiceUsd)
  addCreated('cash', {
    description: form.description.trim(),
    cashDirection: form.cashDirection,
    invoiceUsd: signed,
    invoiceFile: '',
  })
  router.push('/app/cash')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/cash">返回船长备用金</RouterLink>
    <h1>新建现金流水</h1>
    <p class="lede">补给是银行和船上现金之间搬家，消费才记费用。保存后回到列表，不改快照余额 29,908。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label class="wide">摘要<input v-model="form.description" required /></label>
        <label>方向
          <select v-model="form.cashDirection">
            <option value="in">in 补给</option>
            <option value="out">out 支出</option>
          </select>
        </label>
        <label>金额 USD<input v-model="form.invoiceUsd" inputmode="decimal" required /></label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
    <section class="card" style="margin-top: 16px">
      <h2>演练：补给 1,000，再花 100</h2>
      <p>演练从一笔单独的 1,000 开始，不写入上面的列表。</p>
      <div class="pair"><span>银行</span><b>{{ money(drill.bank) }}</b></div>
      <div class="pair"><span>船上现金</span><b>{{ money(drill.cash) }}</b></div>
      <div class="pair"><span>经营费用</span><b>{{ money(drill.expense) }}</b></div>
      <div class="actions">
        <button class="btn" type="button" :disabled="state.ctmTransfer" @click="state.ctmTransfer = true">登记补给 1,000</button>
        <button class="btn secondary" type="button" :disabled="!state.ctmTransfer || state.ctmSpend" @click="state.ctmSpend = true">登记消费 100</button>
        <button class="text-btn" type="button" @click="state.ctmTransfer = false; state.ctmSpend = false">重置</button>
      </div>
      <p v-if="state.ctmTransfer && !state.ctmSpend" class="muted">补给后银行少 1,000，现金多 1,000，费用仍是 0。</p>
      <p v-if="state.ctmSpend" class="muted">消费 100 只让费用增加一次。不要在费用总清单里再记一笔。</p>
    </section>
  </main>
</template>
