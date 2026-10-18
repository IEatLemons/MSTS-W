<script setup>
import { computed, ref } from 'vue'
import { companyKind, kindLabel, matchesKind } from '../lib/company'
import { linkItems } from '../lib/relations'
import { paymentRows } from '../lib/store'

const q = ref('')
const kind = ref('all')
const payClass = ref('all')
const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return paymentRows().filter((row) => {
    if (kind.value === 'demo' && !row.demo) return false
    if (kind.value === 'historic' && row.demo) return false
    if (!matchesKind(row, payClass.value)) return false
    return `${row.id} ${row.description || ''} ${row.supplier || ''}`.toLowerCase().includes(text)
  })
})
</script>

<template>
  <main class="page">
    <h1>付款核销</h1>
    <p class="lede">款项核销的是发票，发票再绑回费用。旧表没有独立付款单，历史 Completed 先看成该费用的一个整笔款项。</p>
    <article class="card" style="margin-bottom: 14px">
      <h2>关系示例</h2>
      <p class="muted">REL-1 有两个款项，和 REL-2 的一个款项公用 INV-A。</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>款项</th><th>费用</th><th>发票</th><th class="num">金额</th><th class="num">手续费</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="item in linkItems" :key="item.id">
              <td>{{ item.id }}</td>
              <td><RouterLink :to="`/app/expenses/${item.expenseId}`">{{ item.expenseId }}</RouterLink></td>
              <td><RouterLink :to="`/app/invoices/${item.invoiceId}`">{{ item.invoiceId }}</RouterLink></td>
              <td class="num">{{ money(item.amount) }}</td>
              <td class="num">{{ money(item.fee) }}</td>
              <td><span class="tag" :class="item.status === '已付' ? 'good' : 'warn'">{{ item.status }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索摘要、供应商、单号" aria-label="搜索付款" />
      <select v-model="payClass" aria-label="付款分类">
        <option value="all">全部分类</option>
        <option value="VESSEL">船舶费用</option>
        <option value="OFFICE">办公室</option>
        <option value="PAYROLL">人员薪资</option>
        <option value="MIXED">办公室 + 薪资</option>
      </select>
      <select v-model="kind" aria-label="来源">
        <option value="all">全部来源</option>
        <option value="historic">旧表已完成</option>
        <option value="demo">本次新建</option>
      </select>
      <RouterLink class="btn push" to="/app/payments/new">新建</RouterLink>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>费用</th><th>发票</th><th>摘要</th><th class="num">金额</th><th class="num">手续费</th><th>回单</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>
              <RouterLink v-if="!row.paymentOnly" :to="`/app/expenses/${row.id}`">{{ row.id }}</RouterLink>
              <template v-else>{{ row.id }} <span class="tag warn">本次新建</span></template>
            </td>
            <td>
              <RouterLink v-if="!row.paymentOnly" :to="`/app/invoices/INV-${row.id}`">INV-{{ row.id }}</RouterLink>
              <template v-else>未绑定</template>
            </td>
            <td>{{ row.description }} <span v-if="companyKind(row)" class="tag sea">{{ kindLabel(companyKind(row)) }}</span></td>
            <td class="num">{{ money(row.invoiceUsd) }}</td>
            <td class="num">{{ money(row.fee) }}</td>
            <td>{{ row.slip || '待补' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
