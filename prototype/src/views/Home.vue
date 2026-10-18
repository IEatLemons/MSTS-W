<script setup>
import { computed } from 'vue'
import { roleById } from '../lib/model'
import { seedData, state } from '../lib/store'

const role = computed(() => roleById(state.entry))
const kpis = seedData.kpis
const bankPreview = [...seedData.bank].sort((a, b) => b.sequence - a.sequence).slice(0, 5)
const openFindings = seedData.findings.filter((item) => item.classification !== '潜在').slice(0, 4)
</script>

<template>
  <main class="page">
    <p class="eyebrow" style="color: var(--copper)">{{ role.who }}</p>
    <h1>{{ role.name }}的工作台</h1>
    <p class="lede">{{ role.summary }}</p>

    <section v-if="state.entry === 'controller'" class="kpis">
      <article class="card kpi"><span>已分配实收</span><b>{{ money(kpis.receiptsAllocated) }}</b></article>
      <article class="card kpi"><span>银行余额</span><b>{{ money(kpis.bank) }}</b></article>
      <article class="card kpi"><span>船长备用金</span><b>{{ money(kpis.ctm) }}</b></article>
      <article class="card kpi"><span>资金差额</span><b class="bad">{{ money(kpis.balanceGap) }}</b></article>
    </section>

    <section v-else-if="state.entry === 'finance'" class="split">
      <article class="card">
        <span class="muted">尚未解释的资金差额</span>
        <b class="figure bad">{{ money(kpis.balanceGap) }} USD</b>
        <p>原表提示账目没做平。原型把这个数字留在这里，不会自动补一笔调账。</p>
        <RouterLink class="btn" to="/app/reports">打开数据概览</RouterLink>
      </article>
      <article class="panel">
        <h2>先看这些发现</h2>
        <ul class="list">
          <li v-for="item in openFindings" :key="item.id">{{ item.id }} {{ item.title }}</li>
        </ul>
        <RouterLink to="/app/audit">全部 25 条</RouterLink>
      </article>
    </section>

    <section v-else-if="state.entry === 'cashier'" class="split">
      <article class="card">
        <h2>最近银行流水</h2>
        <p class="muted">余额 {{ money(kpis.bank) }}，还没有正式核销。</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th>日期</th><th>方向</th><th class="num">金额</th><th>摘要</th></tr></thead>
            <tbody>
              <tr v-for="row in bankPreview" :key="row.id">
                <td><RouterLink :to="`/app/bank/${row.id}`">{{ row.date || '—' }}</RouterLink></td>
                <td>{{ row.direction }}</td>
                <td class="num">{{ money(row.gross) }}</td>
                <td>{{ row.memo || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article class="panel">
        <h2>船上现金</h2>
        <b class="figure">{{ money(kpis.ctm) }}</b>
        <p>这是船长备用金资产，不是还能再记一笔的费用额度。</p>
        <RouterLink class="btn" to="/app/cash">去备用金</RouterLink>
      </article>
    </section>

    <section v-else-if="state.entry === 'approver'" class="two">
      <article class="card">
        <h2>待批付款示例</h2>
        <p>一张 1,000 美元发票，分 400 和 600 两笔付清，手续费 20 只记一次。</p>
        <RouterLink class="btn" to="/app/payments/example">按步骤看完</RouterLink>
      </article>
      <article class="card">
        <h2>计划拨款还没到账</h2>
        <b class="figure">{{ money(kpis.plannedFunding) }}</b>
        <p>日费率 {{ money(kpis.dailyRate) }} × {{ kpis.planDays }} 天。现在不进银行，也不进实收。</p>
        <RouterLink class="btn secondary" to="/app/funding">看资金计划</RouterLink>
      </article>
    </section>

    <section v-else-if="state.entry === 'admin'" class="kpis">
      <article class="card kpi"><span>公司</span><b>1</b><span>名称待确认</span></article>
      <article class="card kpi"><span>船舶</span><b>1</b><span>含别名 LADY</span></article>
      <article class="card kpi"><span>科目</span><b>{{ seedData.accounts.length }}</b></article>
      <article class="card kpi"><span>备份</span><b class="warn">未执行</b></article>
    </section>

    <section v-else class="two">
      <article class="card">
        <h2>从一笔费用开始</h2>
        <p>总清单是唯一业务台账。分类页是重复视图，默认不叠进同一笔金额。</p>
        <div class="actions">
          <RouterLink class="btn" to="/app/expenses/new">新建费用</RouterLink>
          <RouterLink class="btn secondary" to="/app/expenses?status=blank">看未填状态</RouterLink>
        </div>
      </article>
      <article class="panel">
        <h2>船上已经发生的支出</h2>
        <p>备用金余额 {{ money(kpis.ctm) }}。补给从银行划到船上，费用要等真正消费才记。</p>
        <RouterLink to="/app/cash">打开船长备用金</RouterLink>
      </article>
    </section>

    <h2 style="margin-top: 28px">这个入口的四件事</h2>
    <section class="task-grid">
      <article v-for="task in role.tasks" :key="task.title" class="card">
        <h2>{{ task.title }}</h2>
        <p>{{ task.detail }}</p>
        <RouterLink :to="task.to">{{ task.label }}</RouterLink>
      </article>
    </section>
  </main>
</template>
