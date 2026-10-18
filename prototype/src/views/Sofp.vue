<script setup>
import { seedData } from '../lib/store'
const kpis = seedData.kpis
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/reports">返回数据概览</RouterLink>
    <h1>旧 SOFP 兼容视图</h1>
    <p class="lede">这张表沿用原工作簿的观察口径，方便和 Excel 对照。它不是已经确认的法定资产负债表。</p>
    <section class="two">
      <article class="card">
        <h2>原表放在资产栏的数</h2>
        <div class="pair"><span>已分配资金 / 拨款累计</span><b>{{ money(kpis.receiptsAllocated) }}</b></div>
        <div class="pair"><span>银行余额</span><b>{{ money(kpis.bank) }}</b></div>
        <div class="pair"><span>船长现金</span><b>{{ money(kpis.ctm) }}</b></div>
        <p class="muted">原表把资金分配累计放在应收或预付栏。会计上是不是资产，还要财务确认。</p>
      </article>
      <article class="card">
        <h2>原表放在负债和权益栏的数</h2>
        <div class="pair"><span>已完成费用加手续费</span><b>{{ money(kpis.completedPlusFee) }}</b></div>
        <div class="pair"><span>旧表总费用</span><b>{{ money(kpis.legacyExpense) }}</b></div>
        <div class="pair"><span>倒算净额</span><b>{{ money(kpis.net) }}</b></div>
        <p class="muted">已完成费用也被放进了应付。权益由收款和费用的差额倒算，不能靠改股本把它做平。</p>
      </article>
    </section>
    <article class="callout">资金差额 {{ money(kpis.balanceGap) }} USD 仍然未平。兼容视图保留这个结果，不生成无依据的调整分录。</article>
    <p>兼容日均：累计资金 {{ money(kpis.receiptsAllocated) }} / {{ kpis.managementDays }} 天 = {{ precise(kpis.opexCompat) }}。分子是收款，不是费用，所以不把它叫做经营成本日均。</p>
  </main>
</template>
