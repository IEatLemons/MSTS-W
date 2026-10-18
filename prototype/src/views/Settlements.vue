<script setup>
import { computed, ref } from 'vue'
import { settlementRows } from '../lib/store'

const q = ref('')
const status = ref('all')
const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return settlementRows().filter((row) => {
    if (status.value !== 'all' && row.ownerStatus !== status.value) return false
    return `${row.description || ''} ${row.id} ${row.supplier || ''}`.toLowerCase().includes(text)
  })
})
</script>

<template>
  <main class="page">
    <h1>船东结算</h1>
    <p class="lede">付给供应商，不等于船东已经报销。船东直接支付要留下费用，但不增加公司的现金支出。</p>
    <article class="callout">
      跨船例子：本船替 Libra-XS 付了 2,600 加手续费 20。
      <RouterLink to="/app/expenses/05-006">打开 05-006</RouterLink>
      ，银行流水在
      <RouterLink to="/app/bank/BK-16">BK-16</RouterLink>。
    </article>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索摘要" aria-label="搜索结算" />
      <select v-model="status" aria-label="结算状态">
        <option value="all">全部结算状态</option>
        <option>待收</option>
        <option>已收</option>
        <option>船东付</option>
      </select>
      <RouterLink class="btn push" to="/app/settlements/new">新建</RouterLink>
    </div>
    <p class="muted">{{ rows.length }} 行</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>来源</th><th>摘要</th><th class="num">结算额</th><th>状态</th><th class="num">发票</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ sheetLabel(row.sheet) }}</td>
            <td>
              <RouterLink v-if="!row.demo" :to="`/app/expenses/${row.id}`">{{ row.description || row.id }}</RouterLink>
              <template v-else>{{ row.description }} <span class="tag warn">本次新建</span></template>
            </td>
            <td class="num">{{ money(row.ownerAmount) }}</td>
            <td><span class="tag" :class="row.ownerStatus === '已收' ? 'good' : row.ownerStatus === '船东付' ? 'sea' : 'warn'">{{ row.ownerStatus }}</span></td>
            <td class="num">{{ money(row.invoiceUsd) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
