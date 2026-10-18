<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { relationsOfInvoice } from '../lib/relations'
import { findRecord } from '../lib/store'

const route = useRoute()
const view = computed(() => relationsOfInvoice(route.params.id, findRecord))
const paid = computed(() => (view.value?.items || []).filter((item) => item.status === '已付').reduce((sum, item) => sum + item.amount, 0))
const shared = computed(() => (view.value?.items.length || 0) > 1)
</script>

<template>
  <main class="page" v-if="view">
    <RouterLink class="back" to="/app/invoices">返回发票应付</RouterLink>
    <h1>{{ view.invoice.id }}</h1>
    <p class="lede">{{ view.invoice.supplier || '未填供应商' }} · {{ view.invoice.date || '无日期' }}</p>
    <p v-if="view.snapshot" class="callout">这张发票绑在费用 {{ view.expenses[0].id }} 上。原表没有把一笔费用拆成多个款项，所以这里只看到一个款项。</p>
    <p v-else class="callout">{{ view.invoice.note }}</p>
    <section class="kpis">
      <article class="card kpi"><span>发票金额</span><b>{{ money(view.invoice.amount) }}</b></article>
      <article class="card kpi"><span>已付款项</span><b>{{ money(paid) }}</b></article>
      <article class="card kpi"><span>未核销</span><b>{{ money(view.invoice.amount - paid) }}</b></article>
      <article class="card kpi"><span>关系</span><b>{{ shared ? '公用' : '单独' }}</b><span>{{ view.items.length }} 个款项 · {{ view.expenses.length }} 笔费用</span></article>
    </section>
    <section class="two">
      <article class="card">
        <h2>绑定的费用</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>费用</th><th>摘要</th><th class="num">费用额</th></tr></thead>
            <tbody>
              <tr v-for="row in view.expenses" :key="row.id">
                <td><RouterLink :to="`/app/expenses/${row.id}`">{{ row.id }}</RouterLink></td>
                <td>{{ row.description }}</td>
                <td class="num">{{ money(row.invoiceUsd) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h2>分摊到这张发票的款项</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>款项</th><th>费用</th><th class="num">金额</th><th class="num">手续费</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="item in view.items" :key="item.id">
                <td>{{ item.id }}</td>
                <td><RouterLink :to="`/app/expenses/${item.expenseId}`">{{ item.expenseId }}</RouterLink></td>
                <td class="num">{{ money(item.amount) }}</td>
                <td class="num">{{ money(item.fee) }}</td>
                <td><span class="tag" :class="item.status === '已付' ? 'good' : 'warn'">{{ item.status }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </section>
  </main>
  <main v-else class="page">
    <h1>找不到这张发票</h1>
    <RouterLink to="/app/invoices">返回发票应付</RouterLink>
  </main>
</template>
