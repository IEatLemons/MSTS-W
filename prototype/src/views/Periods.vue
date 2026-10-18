<script setup>
import { computed } from 'vue'
import { ledgerByPeriod, settlementPeriods } from '../lib/periods'
import { seedData, state } from '../lib/store'

const periods = computed(() => ledgerByPeriod(seedData.records, settlementPeriods(seedData.vessel.managementStart, seedData.asOf)).periods)
const startDay = computed(() => Number(seedData.vessel.managementStart.slice(8)))

function previewClose() {
  state.periodNote = '这只是关账预览。原型不会锁定数据库，也不会改写 10 月 14 日快照。'
}
</script>

<template>
  <main class="page">
    <h1>期间</h1>
    <p class="lede">
      {{ seedData.vessel.name }} 从 {{ seedData.vessel.managementStart }} 开始管理。结算按自然月，不按满 30 天滚动。
      从 {{ startDay }} 日开始，第一个期间仍然到该月最后一天结一次。之后每个月都是 1 日到月底。
    </p>
    <article class="callout">如果从 20 日进船，第一个结算期间就是 20 日到该月最后一天，月底结一次，不会拖到下个月才结。</article>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>期间</th><th>起</th><th>结算日</th><th class="num">天数</th><th class="num">总清单发票</th><th>状态</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr v-for="month in periods" :key="month.id">
            <td>{{ month.name }}</td>
            <td>{{ month.from }}</td>
            <td>{{ month.settleOn }}</td>
            <td class="num">{{ month.open ? `${month.days} / ${month.spanDays}` : month.days }}</td>
            <td class="num">{{ money(month.invoice) }}</td>
            <td><span class="tag" :class="month.open ? 'warn' : 'good'">{{ month.state }}</span></td>
            <td>{{ month.note }} <span class="muted">{{ month.count }} 笔</span></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted">10 月天数写成「已过 / 全月」。发票额来自费用总清单，没有日期的行不进任何一个月。</p>
    <div class="actions">
      <button class="btn" type="button" @click="previewClose">预览关账</button>
    </div>
    <p v-if="state.periodNote" class="callout">{{ state.periodNote }}</p>
  </main>
</template>
