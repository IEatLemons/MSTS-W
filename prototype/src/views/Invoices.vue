<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { invoiceRows } from '../lib/store'

const route = useRoute()
const q = ref('')
const status = ref('all')

watch(() => route.query.status, (value) => {
  status.value = value || 'all'
}, { immediate: true })

const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return invoiceRows().filter((row) => {
    if (status.value !== 'all' && (row.status || 'blank') !== status.value && !(status.value === 'blank' && !row.status)) return false
    return `${row.id} ${row.description || ''} ${row.supplier || ''}`.toLowerCase().includes(text)
  })
})

function outstanding(row) {
  if (row.status === 'Completed') return 0
  return row.invoiceUsd
}
</script>

<template>
  <main class="page">
    <h1>发票应付</h1>
    <p class="lede">每张发票都绑在费用上。一笔费用可以有多个款项，一个或多个款项可以公用同一张发票。快照里原表没有拆款项，所以历史行仍是一张发票对一个款项。</p>
    <article class="callout">
      公用发票看
      <RouterLink to="/app/invoices/INV-A">INV-A</RouterLink>
      ，它同时盖住备件的两笔款项和运费的一笔。
    </article>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索发票" aria-label="搜索发票" />
      <select v-model="status" aria-label="状态">
        <option value="all">全部</option>
        <option value="Received">Received</option>
        <option value="Completed">Completed</option>
        <option value="Accrual">Accrual</option>
        <option value="blank">未填</option>
      </select>
      <RouterLink class="btn push" to="/app/invoices/new">新建</RouterLink>
    </div>
    <p class="muted">{{ rows.length }} 张</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>单号</th><th>供应商</th><th>摘要</th><th class="num">发票</th><th class="num">估计待付</th><th>到期</th><th>状态</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <RouterLink v-if="!row.demo" :to="`/app/invoices/INV-${row.id}`">{{ row.id }}</RouterLink>
              <template v-else>{{ row.id }} <span class="tag warn">本次新建</span></template>
            </td>
            <td>{{ row.supplier || '—' }}</td>
            <td>{{ row.description || '—' }}</td>
            <td class="num">{{ money(row.invoiceUsd) }}</td>
            <td class="num">{{ money(outstanding(row)) }}</td>
            <td>{{ row.dueDate || '—' }}</td>
            <td><span class="tag" :class="row.status === 'Completed' ? 'good' : 'sea'">{{ statusText(row.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
