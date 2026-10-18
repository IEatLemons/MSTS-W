<script setup>
import { computed, ref } from 'vue'
import { seedData, state } from '../lib/store'

const q = ref('')
const status = ref('all')
const rows = computed(() => {
  const base = [
    ...state.funding,
    {
      id: 'PLAN-10',
      title: '10月计划拨款',
      amount: seedData.kpis.plannedFunding,
      status: state.planReceived ? '已模拟到账' : '未到账',
    },
  ]
  const text = q.value.trim().toLowerCase()
  return base.filter((row) => {
    if (status.value !== 'all' && row.status !== status.value) return false
    return `${row.title} ${row.id}`.toLowerCase().includes(text)
  })
})
</script>

<template>
  <main class="page">
    <h1>资金计划</h1>
    <p class="lede">计划金额在到账之前只影响预测。到账后才进入收款分配。</p>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索计划" aria-label="搜索资金计划" />
      <select v-model="status" aria-label="到账状态">
        <option value="all">全部状态</option>
        <option>未到账</option>
        <option>已模拟到账</option>
      </select>
      <RouterLink class="btn push" to="/app/funding/new">新建</RouterLink>
    </div>
    <p class="muted">{{ rows.length }} 条</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>编号</th><th>事项</th><th class="num">金额</th><th>状态</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.id }}</td>
            <td>{{ row.title }} <span v-if="row.demo" class="tag warn">本次新建</span></td>
            <td class="num">{{ money(row.amount) }}</td>
            <td><span class="tag" :class="row.status === '未到账' ? 'warn' : 'good'">{{ row.status }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
