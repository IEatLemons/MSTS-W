<script setup>
import { computed } from 'vue'
import { state } from '../lib/store'

const steps = [
  { title: '采购申请', record: '业务单和订单行，费用中心船管，订单 1,000。', effect: '只是承诺，银行不变。', outstanding: null, bank: 0, fee: 0, owner: null },
  { title: '验收和到票', record: '验收 1,000，发票 1,000。', effect: '确认费用 1,000，应付 1,000。', outstanding: 1000, bank: 0, fee: 0, owner: null },
  { title: '第一笔付款', record: '付款 400，银行手续费 20，核销发票 400。', effect: '待付 600。银行减少 420。', outstanding: 600, bank: -420, fee: 20, owner: null },
  { title: '第二笔付款', record: '付款 600，没有手续费，核销剩余 600。', effect: '待付 0。两次银行共减少 1,020。', outstanding: 0, bank: -1020, fee: 20, owner: null },
  { title: '船东结算', record: '若合同允许报销，结算本金 1,000 和手续费 20。', effect: '向船东应收 1,020。供应商已经付清，不等于船东已经报销。', outstanding: 0, bank: -1020, fee: 20, owner: 1020 },
  { title: '船东回款', record: '实际到账 1,020，核销结算单。', effect: '船东待收 0。付款状态和回款状态各自完成。', outstanding: 0, bank: -1020, fee: 20, owner: 0 },
]

const current = computed(() => steps[Math.max(state.paymentStep - 1, 0)])
const started = computed(() => state.paymentStep > 0)

function next() {
  if (state.paymentStep < steps.length) state.paymentStep += 1
}
function reset() {
  state.paymentStep = 0
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/payments">返回付款</RouterLink>
    <h1>1,000 美元分两次付款</h1>
    <p class="lede">点下一步看金额怎么变。这是教学示例，不改变船上 10 月 14 日的真实快照。</p>
    <section class="split">
      <div class="steps">
        <button v-for="(step, index) in steps" :key="step.title" class="step" :class="{ on: state.paymentStep === index + 1 }" type="button" @click="state.paymentStep = index + 1">
          <b>{{ index + 1 }}. {{ step.title }}</b>
          <span>{{ step.record }}</span>
        </button>
        <div class="actions">
          <button class="btn" type="button" :disabled="state.paymentStep >= steps.length" @click="next">下一步</button>
          <button class="btn secondary" type="button" @click="reset">重置</button>
        </div>
      </div>
      <article class="card">
        <h2>{{ started ? current.title : '还没开始' }}</h2>
        <p>{{ started ? current.effect : '从采购申请开始。批准付款本身不会让银行余额下降。' }}</p>
        <div class="pair"><span>发票待付</span><b>{{ started && current.outstanding != null ? money(current.outstanding) : '—' }}</b></div>
        <div class="pair"><span>银行累计变动</span><b>{{ started ? signedMoney(current.bank) : '—' }}</b></div>
        <div class="pair"><span>已记手续费</span><b>{{ started ? money(current.fee) : '—' }}</b></div>
        <div class="pair"><span>船东待收</span><b>{{ started && current.owner != null ? money(current.owner) : '—' }}</b></div>
      </article>
    </section>
  </main>
</template>
