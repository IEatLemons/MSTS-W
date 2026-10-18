<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { companyKind, kindLabel } from '../lib/company'
import { relationsOfExpense, sharesOf, linkedExpense } from '../lib/relations'
import { findRecord, seedData } from '../lib/store'

const route = useRoute()
const row = computed(() => linkedExpense(route.params.id) || findRecord(route.params.id))
const relations = computed(() => relationsOfExpense(row.value))
const account = computed(() => seedData.accounts.find((item) => item.code === row.value?.account))

function shareCount(invoiceId) {
  if (String(invoiceId).startsWith('INV-') && !relations.value.snapshot) return sharesOf(invoiceId).length
  return 1
}
const crossShip = computed(() => /libra/i.test(row.value?.description || ''))
const ctmOffset = computed(() => /CTM/.test(row.value?.description || '') && Number(row.value?.invoiceUsd) < 0)
</script>

<template>
  <main class="page" v-if="row">
    <RouterLink class="back" to="/app/expenses">返回费用台账</RouterLink>
    <h1>{{ row.description || row.id }}</h1>
    <p class="lede">{{ sheetLabel(row.sheet) }} · {{ row.id }} · {{ row.date || '无日期' }}</p>
    <p v-if="row.relation" class="callout">这是关系示例，不是 10 月 14 日快照里的费用。一笔费用拆成多个款项，款项可以公用同一张发票。</p>
    <p v-else-if="row.demo" class="callout">这是本次浏览新建的费用，没有写入 10 月 14 日快照。</p>
    <p v-if="companyKind(row) === 'MIXED'" class="callout">这张发票同时包含办公室和人员薪资。原表没有拆开，所以两边都能看到，合计只计一次。</p>
    <p v-if="crossShip" class="callout">这是本船账户替 Libra-XS 支付。银行会减少，但这 2,600 不默认进本船经营费用。受益船和付款账户要分开记。</p>
    <p v-if="ctmOffset" class="callout">这行是船上现金结余的负数抵销。原表汇总从下一行开始，所以它没有真正抵掉总费用。现金和费用要分开。</p>
    <section class="kpis">
      <article class="card kpi"><span>订单 USD</span><b>{{ money(row.poUsd) }}</b><span>原币 {{ money(row.original) }} × {{ row.rate || '—' }}</span></article>
      <article class="card kpi"><span>验收 USD</span><b>{{ money(row.grnUsd) }}</b><span>{{ row.grnDate || '无验收日' }}</span></article>
      <article class="card kpi"><span>发票 USD</span><b>{{ money(row.invoiceUsd) }}</b><span>{{ row.invoiceDate || '无发票日' }}</span></article>
      <article class="card kpi"><span>手续费</span><b>{{ money(row.fee) }}</b><span>旧状态 {{ statusText(row.status) }}</span></article>
    </section>
    <section class="two">
      <article class="card">
        <h2>归属</h2>
        <div class="pair"><span>供应商</span><b>{{ row.supplier || '—' }}</b></div>
        <div class="pair"><span>费用中心</span><b>{{ row.center || '见来源页' }}</b></div>
        <div class="pair"><span>付款分类</span><b>{{ kindLabel(companyKind(row)) }}</b></div>
        <div class="pair"><span>科目</span><b>{{ row.account || '—' }}</b></div>
        <div class="pair"><span>科目说明</span><b>{{ account?.description || '—' }}</b></div>
        <div class="pair"><span>请购 / 订单</span><b>{{ row.requisition || '—' }} / {{ row.po || '—' }}</b></div>
        <div class="pair"><span>船东结算</span><b>{{ row.ownerStatus || '—' }} {{ row.ownerAmount != null ? money(row.ownerAmount) : '' }}</b></div>
      </article>
      <article class="card">
        <h2>追溯</h2>
        <div class="pair"><span>原表位置</span><b>{{ row.source || '—' }}</b></div>
        <div class="pair"><span>发票附件</span><b>{{ row.invoiceFile || '待补' }}</b></div>
        <div class="pair"><span>银行回单</span><b>{{ row.slip || '待补' }}</b></div>
        <p class="muted">原表精度：订单 {{ precise(row.poUsd) }}，发票 {{ precise(row.invoiceUsd) }}。</p>
        <div class="actions">
          <RouterLink class="text-btn" to="/app/invoices">看发票列表</RouterLink>
          <RouterLink v-if="crossShip" class="text-btn" to="/app/settlements">看跨船往来</RouterLink>
        </div>
      </article>
    </section>
    <section class="two" style="margin-top: 14px">
      <article class="card">
        <h2>绑定的发票</h2>
        <p v-if="!relations.invoices.length" class="muted">还没有绑定发票。</p>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>发票</th><th class="num">金额</th><th>怎么用</th></tr></thead>
            <tbody>
              <tr v-for="invoice in relations.invoices" :key="invoice.id">
                <td><RouterLink :to="`/app/invoices/${invoice.id}`">{{ invoice.id }}</RouterLink></td>
                <td class="num">{{ money(invoice.amount) }}</td>
                <td>{{ shareCount(invoice.id) > 1 ? `${shareCount(invoice.id)} 个款项公用` : '本费用单独使用' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h2>款项</h2>
        <p v-if="relations.snapshot && relations.items.length" class="muted">原表只有整行状态，所以先显示成一个款项。多个款项公用发票，打开 <RouterLink to="/app/expenses/REL-1">REL-1</RouterLink>。</p>
        <p v-else-if="!relations.items.length" class="muted">还没有款项。</p>
        <div v-if="relations.items.length" class="table-wrap">
          <table>
            <thead><tr><th>款项</th><th>发票</th><th class="num">金额</th><th class="num">手续费</th><th>状态</th></tr></thead>
            <tbody>
              <tr v-for="item in relations.items" :key="item.id">
                <td>{{ item.id }}</td>
                <td><RouterLink :to="`/app/invoices/${item.invoiceId}`">{{ item.invoiceId }}</RouterLink></td>
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
    <h1>找不到这张费用</h1>
    <RouterLink to="/app/expenses">返回台账</RouterLink>
  </main>
</template>
