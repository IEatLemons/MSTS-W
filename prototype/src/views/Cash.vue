<script setup>
import { computed, ref } from 'vue'
import { cashRows, seedData } from '../lib/store'

const q = ref('')
const direction = ref('all')
const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return cashRows().filter((row) => {
    const way = (row.cashDirection || '').toLowerCase()
    if (direction.value !== 'all' && way !== direction.value) return false
    return `${row.description || ''} ${row.id}`.toLowerCase().includes(text)
  })
})
</script>

<template>
  <main class="page">
    <h1>船长备用金</h1>
    <p class="lede">快照余额 {{ money(seedData.kpis.ctm) }}。入金 64,815，支出 34,907。这笔现金是资产，不是剩余可计费用。</p>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索摘要" aria-label="搜索备用金" />
      <select v-model="direction" aria-label="方向">
        <option value="all">全部方向</option>
        <option value="in">In</option>
        <option value="out">out</option>
      </select>
      <RouterLink class="btn push" to="/app/cash/new">新建</RouterLink>
    </div>
    <p class="muted">{{ rows.length }} 行</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>日期</th><th>摘要</th><th>方向</th><th class="num">金额</th><th>附件</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.date || '—' }}</td>
            <td>
              <RouterLink v-if="!row.demo" :to="`/app/expenses/${row.id}`">{{ row.description }}</RouterLink>
              <template v-else>{{ row.description }} <span class="tag warn">本次新建</span></template>
            </td>
            <td>{{ row.cashDirection || '—' }}</td>
            <td class="num">{{ money(row.invoiceUsd) }}</td>
            <td>{{ row.invoiceFile || '待补' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
