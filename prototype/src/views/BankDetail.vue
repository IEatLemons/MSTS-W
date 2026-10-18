<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { bankRows } from '../lib/store'

const route = useRoute()
const row = computed(() => bankRows().find((item) => item.id === route.params.id))
const failed = computed(() => /失败/.test(row.value?.memo || ''))
const cross = computed(() => /libra/i.test(row.value?.memo || ''))
</script>

<template>
  <main v-if="row" class="page">
    <RouterLink class="back" to="/app/bank">返回银行流水</RouterLink>
    <h1>{{ row.memo || row.id }}</h1>
    <p class="lede">{{ row.date || '无日期' }} · {{ row.direction }} · 序号 {{ row.sequence }}</p>
    <section class="kpis">
      <article class="card kpi"><span>金额</span><b>{{ money(row.gross) }}</b></article>
      <article class="card kpi"><span>手续费</span><b>{{ money(row.fee) }}</b></article>
      <article class="card kpi"><span>净变动</span><b>{{ money(row.net) }}</b></article>
      <article class="card kpi"><span>当时余额</span><b>{{ money(row.balance) }}</b></article>
    </section>
    <article v-if="failed" class="callout">
      这是付款失败后的退回。按实际退回净额和手续费处理，不能把这笔入账当成新的营业收入。原表里银行侧是 9,500 加 20。
    </article>
    <article v-if="cross" class="callout">
      摘要指向 Libra-XS。对应费用
      <RouterLink to="/app/expenses/05-006">05-006 帮 Libra-XS 支付检验费 2,600</RouterLink>
      ，手续费 20。本船经营费用不默认加上这 2,600。
    </article>
    <article v-if="!failed && !cross" class="callout">还没有稳定的业务单据可以核销。匹配建议只是提示，确认前不算已对账。</article>
  </main>
  <main v-else class="page">
    <h1>找不到这条流水</h1>
    <RouterLink to="/app/bank">返回</RouterLink>
  </main>
</template>
