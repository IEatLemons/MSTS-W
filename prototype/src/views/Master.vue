<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { seedData } from '../lib/store'

const route = useRoute()
const q = ref('')
const section = computed(() => route.params.section)
const titles = {
  org: '公司与船舶',
  parties: '往来方',
  fx: '币种与汇率',
  centers: '费用中心',
  accounts: '科目字典',
}
const vesselCenters = computed(() => seedData.costCenters.filter((row) => row.scope !== 'company'))
const companyCenters = computed(() => seedData.costCenters.filter((row) => row.scope === 'company'))
const parties = computed(() => {
  const text = q.value.trim().toLowerCase()
  return seedData.parties.filter((row) => `${row.name} ${row.roles.join(' ')}`.toLowerCase().includes(text))
})
const departments = {
  Crewing: '船员',
  Technical: '机务',
  'Technical/Accounts': '机务 / 财务',
  'Technical /03rd Party': '机务 / 第三方',
  'Technical /Owner': '机务 / 船东',
  'Technical / Owner': '机务 / 船东',
  'Technical / Insurance': '机务 / 保险',
  'Techncial / Insurance': '机务 / 保险',
  'Technical/Account': '机务 / 财务',
  'Technical /Account': '机务 / 财务',
  'Technical/ISM': '机务 / 安全管理',
  'Technical/ISM/Account': '机务 / 安全管理 / 财务',
  ISM: '安全管理',
  'ISM/Account': '安全管理 / 财务',
  Master: '船长',
  Insurance: '保险',
  'Insurance/Acount': '保险 / 财务',
  'Operation /Account': '运营 / 财务',
  All: '各部门',
  ALL: '各部门',
  PIC: '大类',
  '编号规则': '编号规则',
}

function deptText(value) {
  if (!value) return ''
  return departments[value] || value
}

const accounts = computed(() => {
  const text = q.value.trim().toLowerCase()
  return seedData.accounts.filter((row) => `${row.code} ${row.description || ''} ${row.chinese || ''} ${deptText(row.department)} ${row.namespace}`.toLowerCase().includes(text))
})
</script>

<template>
  <main class="page">
    <h1>{{ titles[section] || '基础资料' }}</h1>
    <p class="lede">主数据只在这里维护。费用、收款和银行都引用它们，不再各写一套船名或科目。</p>

    <section v-if="section === 'org'" class="two">
      <article class="card">
        <h2>公司</h2>
        <div class="pair"><span>代码</span><b>{{ seedData.organization.code }}</b></div>
        <div class="pair"><span>法定名称</span><b>{{ seedData.organization.legalName }}</b></div>
        <div class="pair"><span>本位币</span><b>{{ seedData.organization.baseCurrency }}</b></div>
        <div class="pair"><span>时区</span><b>{{ seedData.organization.timezone }}</b></div>
        <p class="callout">{{ seedData.organization.note }}</p>
        <p v-for="org in seedData.relatedOrgs" :key="org.name">{{ org.name }}：{{ org.note }}</p>
      </article>
      <article class="card">
        <h2>船舶</h2>
        <div class="pair"><span>代码</span><b>{{ seedData.vessel.code }}</b></div>
        <div class="pair"><span>船名</span><b>{{ seedData.vessel.name }}</b></div>
        <div class="pair"><span>别名</span><b>{{ seedData.vessel.aliases.join('、') }}</b></div>
        <div class="pair"><span>IMO</span><b>缺失</b></div>
        <div class="pair"><span>管理开始</span><b>{{ seedData.vessel.managementStart }}</b></div>
        <p class="muted">从这一天起按自然月结算。月中开始，也在当月最后一天结一次。</p>
        <p class="callout">{{ seedData.vessel.note }}</p>
      </article>
    </section>

    <section v-else-if="section === 'parties'">
      <div class="filters">
        <input v-model="q" class="search" type="search" placeholder="搜索往来方" aria-label="搜索往来方" />
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>名称</th><th>角色</th></tr></thead>
          <tbody>
            <tr v-for="row in parties" :key="row.name">
              <td>{{ row.name }}</td>
              <td><span v-for="role in row.roles" :key="role" class="tag">{{ role }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section v-else-if="section === 'fx'" class="split">
      <article class="panel">
        <h2>币种</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>代码</th><th>名称</th><th class="num">小数位</th><th>新交易</th></tr></thead>
            <tbody>
              <tr v-for="row in seedData.currencies" :key="row.code">
                <td>{{ row.code }}</td>
                <td>{{ row.name }}</td>
                <td class="num">{{ row.minorUnits }}</td>
                <td>{{ row.enabled ? '允许' : '停用' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <article class="card">
        <h2>汇率示例</h2>
        <div v-for="rate in seedData.fxRates" :key="rate.from" class="pair">
          <span>{{ rate.date }} {{ rate.from }} → {{ rate.to }}</span>
          <b>{{ rate.rate }}</b>
        </div>
        <p class="callout">{{ seedData.fxRates[0].note }} 原表费用没有单独的币种列，不能把空币种猜成美元以外的币种，也不能把不同币种的银行余额直接相加。</p>
      </article>
    </section>

    <section v-else-if="section === 'centers'">
      <h2>船舶费用</h2>
      <p class="muted">这五类对应原表 SOFP。坞修现在是 0，仍保留。</p>
      <div class="task-grid">
        <article v-for="row in vesselCenters" :key="row.code" class="card">
          <h2>{{ row.name }}</h2>
          <p><span class="tag" :class="row.phase === '空模板' ? 'warn' : 'good'">{{ row.phase }}</span></p>
          <p class="muted">{{ row.code }}</p>
        </article>
      </div>
      <h2 style="margin-top: 22px">公司付款</h2>
      <p class="muted">办公室和人员薪资走同一套费用、发票和款项。历史金额已经含在费用总清单里，分类查看时不再加进五类合计。</p>
      <div class="task-grid">
        <article v-for="row in companyCenters" :key="row.code" class="card">
          <h2>{{ row.name }}</h2>
          <p><span class="tag sea">{{ row.phase }}</span></p>
          <p>{{ row.note }}</p>
          <p class="muted">{{ row.code }}</p>
        </article>
      </div>
    </section>

    <section v-else>
      <div class="filters">
        <input v-model="q" class="search" type="search" placeholder="搜索编码或名称" aria-label="搜索科目" />
        <span class="muted">{{ accounts.length }} / {{ seedData.accounts.length }}</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>命名空间</th><th>编码</th><th>说明</th><th>中文</th><th>部门</th></tr></thead>
          <tbody>
            <tr v-for="row in accounts" :key="row.source || row.namespace + row.code">
              <td class="nowrap">{{ row.namespace === 'crew_detail' ? '船员细项' : '船管' }}</td>
              <td class="nowrap">{{ row.code }}</td>
              <td>{{ row.description || '—' }}</td>
              <td>{{ row.chinese || '—' }}</td>
              <td class="nowrap">{{ deptText(row.department) || '—' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>
