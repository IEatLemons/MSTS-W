<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { companyKind, kindLabel, matchesKind } from '../lib/company'
import { expenseRows } from '../lib/store'
import { sheetLabel } from '../lib/format'

const route = useRoute()
const q = ref('')
const sheet = ref('Expenses Lists')
const status = ref('all')
const payClass = ref('all')

const sheets = ['Expenses Lists', 'Shipmanagement Cost', 'Owner Cost', 'Take-Over Cost', 'BMA Flag Change', 'CTM Expenses List']

watch(() => route.query, (query) => {
  sheet.value = query.sheet || 'Expenses Lists'
  status.value = query.status || 'all'
}, { immediate: true })

const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return expenseRows().filter((row) => {
    if (sheet.value !== 'all' && row.sheet !== sheet.value) return false
    if (status.value === 'blank' && row.status) return false
    if (status.value !== 'all' && status.value !== 'blank' && row.status !== status.value) return false
    if (!matchesKind(row, payClass.value)) return false
    const blob = `${row.id} ${row.description || ''} ${row.supplier || ''} ${row.po || ''}`.toLowerCase()
    return blob.includes(text)
  })
})

function stageDelta(row) {
  if (row.poUsd == null || row.invoiceUsd == null) return null
  return Number(row.invoiceUsd) - Number(row.poUsd)
}
</script>

<template>
  <main class="page">
    <h1>费用台账</h1>
    <p class="lede">默认只看费用总清单，避免和分类页把同一笔业务加两次。分类页可以切过去对照。</p>
    <article class="callout">
      费用要绑定发票，一笔费用可以拆成多个款项，这些款项也可以公用同一张发票。
      <RouterLink to="/app/expenses/REL-1">打开关系示例 REL-1</RouterLink>
      办公室和人员薪资可以单独筛出来，金额仍留在原来的船舶合计里。
    </article>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索摘要、供应商、单号" aria-label="搜索费用" />
      <select v-model="sheet" aria-label="来源页">
        <option value="all">全部来源页</option>
        <option v-for="name in sheets" :key="name" :value="name">{{ sheetLabel(name) }}</option>
      </select>
      <select v-model="payClass" aria-label="付款分类">
        <option value="all">全部分类</option>
        <option value="VESSEL">船舶费用</option>
        <option value="OFFICE">办公室</option>
        <option value="PAYROLL">人员薪资</option>
        <option value="MIXED">办公室 + 薪资</option>
      </select>
      <select v-model="status" aria-label="旧表状态">
        <option value="all">全部状态</option>
        <option value="blank">未填</option>
        <option>Completed</option>
        <option>Received</option>
        <option>Accrual</option>
      </select>
      <RouterLink class="btn push" to="/app/expenses/new">新建</RouterLink>
    </div>
    <p class="muted">{{ rows.length }} 行</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>单号</th><th>日期</th><th>摘要</th><th>供应商</th>
            <th class="num">订单</th><th class="num">验收</th><th class="num">发票</th><th>状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id + row.sheet">
            <td><RouterLink :to="`/app/expenses/${row.id}`">{{ row.id }}</RouterLink></td>
            <td>{{ row.date || '—' }}</td>
            <td>{{ row.description || '—' }} <span v-if="companyKind(row)" class="tag sea">{{ kindLabel(companyKind(row)) }}</span> <span v-if="row.demo" class="tag warn">本次新建</span></td>
            <td>{{ row.supplier || '—' }}</td>
            <td class="num">{{ money(row.poUsd) }}</td>
            <td class="num">{{ money(row.grnUsd) }}</td>
            <td class="num">{{ money(row.invoiceUsd) }} <span v-if="stageDelta(row)" class="tag warn">差 {{ money(stageDelta(row)) }}</span></td>
            <td><span class="tag" :class="row.status === 'Completed' ? 'good' : row.status ? 'sea' : 'warn'">{{ statusText(row.status) }}</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
