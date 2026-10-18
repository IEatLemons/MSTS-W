<script setup>
import { computed, ref } from 'vue'
import { bankRows, seedData } from '../lib/store'

const q = ref('')
const direction = ref('all')
const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return bankRows().filter((row) => {
    if (direction.value !== 'all' && row.direction !== direction.value) return false
    return `${row.memo} ${row.date || ''} ${row.id}`.toLowerCase().includes(text)
  })
})

function hint(row) {
  if (/失败/.test(row.memo || '')) return '退款，先找原支付'
  if (/libra/i.test(row.memo || '')) return '跨船代付'
  return '待匹配'
}
</script>

<template>
  <main class="page">
    <h1>银行对账</h1>
    <p class="lede">账户 {{ seedData.bank[0]?.account }} · {{ seedData.bank[0]?.currency }} · 快照余额 {{ money(seedData.kpis.bank) }}。22 条流水都还没有正式核销编号。</p>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索摘要" aria-label="搜索流水" />
      <select v-model="direction" aria-label="方向">
        <option value="all">全部方向</option>
        <option>入账</option>
        <option>出账</option>
      </select>
      <RouterLink class="btn push" to="/app/bank/new">新建</RouterLink>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>日期</th><th>方向</th><th class="num">金额</th><th class="num">手续费</th><th class="num">净额</th><th class="num">余额</th><th>摘要</th><th>建议</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td><RouterLink :to="`/app/bank/${row.id}`">{{ row.date || '—' }}</RouterLink></td>
            <td>{{ row.direction }}</td>
            <td class="num">{{ money(row.gross) }}</td>
            <td class="num">{{ money(row.fee) }}</td>
            <td class="num">{{ money(row.net) }}</td>
            <td class="num">{{ money(row.balance) }}</td>
            <td>{{ row.memo || '—' }} <span v-if="row.demo" class="tag warn">本次新建</span></td>
            <td><span class="tag" :class="hint(row) === '待匹配' ? 'warn' : 'sea'">{{ hint(row) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
