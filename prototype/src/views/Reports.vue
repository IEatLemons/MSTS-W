<script setup>
import { computed, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { companyKind, companyLedger, kindLabel } from '../lib/company'
import { expenseRows, seedData } from '../lib/store'
import { centers, summaryLines } from '../lib/overview'
import { ledgerByPeriod, settlementPeriods } from '../lib/periods'

const route = useRoute()
const kpis = seedData.kpis
watch(() => route.query.focus, async (focus) => {
  if (focus !== 'company') return
  await nextTick()
  document.getElementById('company')?.scrollIntoView({ block: 'start' })
}, { immediate: true })
const ledger = ledgerByPeriod(seedData.records, settlementPeriods(seedData.vessel.managementStart, seedData.asOf))
const monthMax = Math.max(...ledger.periods.map((row) => Math.abs(row.invoice)), 1)
function monthWidth(amount) {
  if (!amount) return 0
  return Math.max(2, (Math.abs(amount) / monthMax) * 100)
}
const lines = [
  ['五类已分配实收', kpis.receiptsAllocated, '不是全部营业收入，性质还要逐笔确认。'],
  ['旧表总费用', kpis.legacyExpense, '六种状态加上手续费，里面混有往来和转账。'],
  ['实收减费用', kpis.net, '不是可以直接认定的亏损。'],
  ['银行余额', kpis.bank, '还要对正式对账单。'],
  ['船长备用金', kpis.ctm, '船上现金资产。'],
  ['已完成费用加手续费', kpis.completedPlusFee, '旧表 Completed，不等于已经银行核销。'],
  ['资金差额', kpis.balanceGap, '保持未平，不自动调账。'],
  ['现金覆盖差额', kpis.cashCoverage, '银行加备用金，减未完成费用。不是利润。'],
]

const summaryMax = Math.max(...summaryLines.map((row) => Math.abs(row.amount)), 1)
function summaryWidth(amount) {
  if (!amount) return 0
  return Math.max(2, (Math.abs(amount) / summaryMax) * 100)
}

const netMax = Math.max(...centers.map((row) => Math.abs(row.net)), 1)
function netWidth(amount) {
  if (!amount) return 0
  return (Math.abs(amount) / netMax) * 100
}

const chart = computed(() => {
  const width = 640
  const height = 280
  const padL = 44
  const padB = 32
  const padT = 12
  const padR = 8
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const max = 340000
  const slot = innerW / centers.length
  const barW = 18
  const yOf = (value) => padT + innerH - (value / max) * innerH
  const bars = centers.flatMap((row, index) => {
    const x0 = padL + index * slot + slot / 2
    return [
      { key: `${row.name}-in`, x: x0 - barW - 2, y: yOf(row.inflow), h: (row.inflow / max) * innerH, fill: '#e2c7a4', name: row.name },
      { key: `${row.name}-ex`, x: x0 + 2, y: yOf(row.expense), h: (row.expense / max) * innerH, fill: row.color, name: row.name },
    ]
  })
  const ticks = [0, 100000, 200000, 300000].map((value) => ({
    value,
    y: yOf(value),
    label: value === 0 ? '0' : `${value / 10000}万`,
  }))
  const labels = centers.map((row, index) => ({
    name: row.name,
    x: padL + index * slot + slot / 2,
  }))
  return { width, height, padL, padB, bars, ticks, labels, base: padT + innerH }
})

const company = computed(() => {
  const rows = companyLedger(expenseRows())
  const buckets = ['OFFICE', 'PAYROLL', 'MIXED'].map((code) => {
    const matched = rows.filter((row) => companyKind(row) === code)
    return {
      code,
      name: kindLabel(code),
      count: matched.length,
      amount: matched.reduce((sum, row) => sum + Number(row.invoiceUsd || 0), 0),
    }
  })
  return { rows, buckets, max: Math.max(...buckets.map((row) => Math.abs(row.amount)), 1) }
})

const mix = computed(() => {
  const total = centers.reduce((sum, row) => sum + row.expense, 0)
  const r = 52
  const c = 2 * Math.PI * r
  let cursor = 0
  const slices = centers.map((row) => {
    const portion = total ? row.expense / total : 0
    const slice = { ...row, portion, dash: portion * c, gap: c - portion * c, offset: c * 0.25 - cursor }
    cursor += portion * c
    return slice
  })
  return { total, r, slices }
})
</script>

<template>
  <main class="page">
    <h1>数据概览</h1>
    <p class="lede">对照原表第一页，把这艘船在 2026-10-14 的收入、现金和五类费用收在一起。图上是两位小数，差额保持未平。</p>
    <section class="kpis">
      <article class="card kpi"><span>船东总收入</span><b>{{ money(kpis.receiptsAllocated) }}</b></article>
      <article class="card kpi"><span>银行</span><b>{{ money(kpis.bank) }}</b></article>
      <article class="card kpi"><span>备用金</span><b>{{ money(kpis.ctm) }}</b></article>
      <article class="card kpi"><span>未平</span><b class="bad">{{ money(kpis.balanceGap) }}</b></article>
    </section>

    <section class="split">
      <article class="card">
        <h2>费用总结</h2>
        <p class="muted">原表左下的已完成口径。总收入扣掉银行、备用金和已完成费用之后，还差 {{ money(Math.abs(kpis.balanceGap)) }}。</p>
        <div class="hbar-list">
          <div v-for="row in summaryLines" :key="row.label" class="hbar">
            <span>{{ row.label }}</span>
            <span class="track"><i :class="row.tone" :style="{ width: `${summaryWidth(row.amount)}%` }"></i></span>
            <b :class="{ bad: row.tone === 'gap' }">{{ money(row.amount) }}</b>
          </div>
        </div>
      </article>
      <article class="card">
        <h2>费用构成</h2>
        <p class="muted">五类费用总计 {{ money(mix.total) }}。船管占大头，坞修仍是 0。</p>
        <div class="donut-wrap">
          <svg viewBox="0 0 140 140" class="donut" role="img" aria-label="五类费用构成">
            <circle cx="70" cy="70" :r="mix.r" fill="none" stroke="#efe4d4" stroke-width="18" />
            <circle
              v-for="slice in mix.slices"
              :key="slice.name"
              cx="70"
              cy="70"
              :r="mix.r"
              fill="none"
              :stroke="slice.color"
              stroke-width="18"
              :stroke-dasharray="`${slice.dash} ${slice.gap}`"
              :stroke-dashoffset="slice.offset"
            />
          </svg>
          <ul class="legend">
            <li v-for="slice in mix.slices" :key="slice.name">
              <i :style="{ background: slice.color }"></i>
              <span>{{ slice.name }}</span>
              <b>{{ money(slice.expense) }}</b>
            </li>
          </ul>
        </div>
      </article>
    </section>

    <article class="card" style="margin-top: 14px">
      <h2>五类费用和已入账资金</h2>
      <p class="muted">浅色柱是已入账资金，深色柱是费用总计。船管的已入账是预付拨款，其余是应收。坞修两边都是 0。</p>
      <div class="legend inline">
        <span><i style="background: #e2c7a4"></i>已入账</span>
        <span><i style="background: #17343c"></i>费用</span>
      </div>
      <svg class="chart" :viewBox="`0 0 ${chart.width} ${chart.height}`" role="img" aria-label="五类费用和已入账资金">
        <line
          v-for="tick in chart.ticks"
          :key="tick.value"
          :x1="chart.padL"
          :x2="chart.width - 8"
          :y1="tick.y"
          :y2="tick.y"
          stroke="#e3d9cc"
        />
        <text v-for="tick in chart.ticks" :key="`t-${tick.value}`" :x="chart.padL - 8" :y="tick.y + 4" text-anchor="end" class="axis">{{ tick.label }}</text>
        <rect
          v-for="bar in chart.bars"
          :key="bar.key"
          :x="bar.x"
          :y="bar.y"
          width="18"
          :height="Math.max(bar.h, 0)"
          :fill="bar.fill"
          rx="3"
        />
        <text v-for="label in chart.labels" :key="label.name" :x="label.x" :y="chart.height - 10" text-anchor="middle" class="axis">{{ label.name }}</text>
      </svg>
    </article>

    <article class="card" style="margin-top: 14px">
      <h2>各类净额</h2>
      <p class="muted">正数是这一类还剩的钱，负数是还缺的钱。船东缺口最大。</p>
      <div class="net-list">
        <div v-for="row in centers" :key="row.name" class="net-row">
          <span>{{ row.name }}</span>
          <div class="net-track">
            <i class="neg" :style="{ width: row.net < 0 ? `${netWidth(row.net)}%` : '0%' }"></i>
            <i class="pos" :style="{ width: row.net > 0 ? `${netWidth(row.net)}%` : '0%' }"></i>
          </div>
          <b :class="row.net < 0 ? 'bad' : row.net > 0 ? 'good' : ''">{{ signedMoney(row.net) }}</b>
        </div>
      </div>
    </article>

    <article id="company" class="card" style="margin-top: 14px">
      <h2>公司付款</h2>
      <p class="muted">办公室和人员薪资跟船舶费用用同一套发票和款项。这些历史金额已经在费用总清单和船管合计里，这里只分类，不再加进上面的五类。</p>
      <div class="hbar-list">
        <div v-for="row in company.buckets" :key="row.code" class="hbar">
          <span>{{ row.name }} · {{ row.count }} 笔</span>
          <span class="track"><i :class="row.code === 'PAYROLL' ? 'out' : 'cash'" :style="{ width: `${row.amount ? Math.max(2, Math.abs(row.amount) / company.max * 100) : 0}%` }"></i></span>
          <b>{{ money(row.amount) }}</b>
        </div>
      </div>
      <div class="table-wrap" style="margin-top: 12px">
        <table>
          <thead><tr><th>单号</th><th>分类</th><th>摘要</th><th class="num">发票</th><th>状态</th></tr></thead>
          <tbody>
            <tr v-for="row in company.rows" :key="row.id">
              <td><RouterLink :to="`/app/expenses/${row.id}`">{{ row.id }}</RouterLink></td>
              <td>{{ kindLabel(companyKind(row)) }}</td>
              <td>{{ row.description }}</td>
              <td class="num">{{ money(row.invoiceUsd) }}</td>
              <td>{{ statusText(row.status) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <article class="card" style="margin-top: 14px">
      <h2>结算月份</h2>
      <p class="muted">
        从 {{ seedData.vessel.managementStart }} 起按自然月结算。7 月 15 日开始，仍然在 7 月 31 日结一次。
        10 月快照停在 14 日，结算日还是 10 月 31 日。柱子是费用总清单的发票额，不是上面的已完成口径。
      </p>
      <div class="hbar-list">
        <div v-for="row in ledger.periods" :key="row.id" class="hbar">
          <span>{{ row.name }}{{ row.partial ? ' · 首月' : '' }}</span>
          <span class="track"><i :class="row.open ? 'cash' : 'out'" :style="{ width: `${monthWidth(row.invoice)}%` }"></i></span>
          <b>{{ money(row.invoice) }}</b>
        </div>
      </div>
      <p v-if="ledger.undated.count" class="muted" style="margin-top: 8px">另有 {{ ledger.undated.count }} 笔没有日期，发票 {{ money(ledger.undated.invoice) }}，不进月结。</p>
      <div class="actions">
        <RouterLink class="text-btn" to="/app/periods">看期间</RouterLink>
      </div>
    </article>

    <h2 style="margin-top: 28px">指标对照</h2>
    <div class="table-wrap">
      <table>
        <thead><tr><th>指标</th><th class="num">金额 USD</th><th>怎么理解</th></tr></thead>
        <tbody>
          <tr v-for="line in lines" :key="line[0]">
            <td>{{ line[0] }}</td>
            <td class="num" :class="{ bad: line[0] === '资金差额' }">{{ money(line[1]) }}</td>
            <td>{{ line[2] }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin-top: 10px">总额对得上，仍可能藏着两笔金额对调。上线前要逐笔看，不能只看合计。</p>
    <div class="actions">
      <RouterLink class="btn" to="/app/reports/sofp">旧 SOFP</RouterLink>
      <RouterLink class="text-btn" to="/app/periods">期间</RouterLink>
    </div>
  </main>
</template>
