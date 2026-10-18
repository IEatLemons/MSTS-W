<script setup>
import { computed, ref } from 'vue'
import { receiptRows, seedData } from '../lib/store'

const q = ref('')
const pool = ref('all')
const rows = computed(() => {
  const text = q.value.trim().toLowerCase()
  return receiptRows().filter((row) => {
    if (pool.value === 'ship' && !row.allocShip && row.pool !== '船管') return false
    if (pool.value === 'takeover' && !row.allocTakeover && row.pool !== '接船') return false
    if (pool.value === 'bma' && !row.allocBma && row.pool !== '换旗') return false
    if (pool.value === 'owner' && !row.allocOwner && row.pool !== '船东') return false
    if (pool.value === 'dd' && !row.allocDd && row.pool !== '坞修') return false
    return `${row.receiptType || ''} ${row.receiptParty || ''} ${row.id}`.toLowerCase().includes(text)
  })
})

function net(row) {
  const gross = Number(row.receiptGross || 0)
  const fee = Number(row.receiptFee || 0)
  return gross - fee
}
function allocated(row) {
  return ['allocShip', 'allocTakeover', 'allocBma', 'allocOwner', 'allocDd'].reduce((sum, key) => sum + Number(row[key] || 0), 0)
}
</script>

<template>
  <main class="page">
    <h1>收款分配</h1>
    <p class="lede">这 13 笔是已经进账并分到资金池的钱，合计 {{ money(seedData.kpis.receiptsAllocated) }}。计划中的 155,000 不在这张表里。</p>
    <div class="filters">
      <input v-model="q" class="search" type="search" placeholder="搜索事项、付款方" aria-label="搜索收款" />
      <select v-model="pool" aria-label="资金池">
        <option value="all">全部资金池</option>
        <option value="ship">船管</option>
        <option value="takeover">接船</option>
        <option value="bma">换旗</option>
        <option value="owner">船东</option>
        <option value="dd">坞修</option>
      </select>
      <RouterLink class="btn push" to="/app/receipts/new">新建</RouterLink>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>日期</th><th>事项</th><th>付款方</th>
            <th class="num">毛额</th><th class="num">手续费</th><th class="num">已分配</th><th>去向</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id">
            <td>{{ row.receiptDate || row.date || '—' }}</td>
            <td>{{ row.receiptType }} <span v-if="row.demo" class="tag warn">本次新建</span></td>
            <td>{{ row.receiptParty || '—' }}</td>
            <td class="num">{{ money(row.receiptGross) }}</td>
            <td class="num">{{ money(row.receiptFee) }}</td>
            <td class="num">{{ money(allocated(row) || net(row)) }}</td>
            <td>
              <span v-if="row.allocShip">船管 {{ money(row.allocShip) }} </span>
              <span v-if="row.allocTakeover">接船 {{ money(row.allocTakeover) }} </span>
              <span v-if="row.allocBma">换旗 {{ money(row.allocBma) }} </span>
              <span v-if="row.allocOwner">船东 {{ money(row.allocOwner) }} </span>
              <span v-if="row.allocDd">坞修 {{ money(row.allocDd) }}</span>
              <span v-if="row.pool && !row.allocShip && !row.allocTakeover && !row.allocBma && !row.allocOwner && !row.allocDd">{{ row.pool }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="muted" style="margin-top: 10px">换旗列在原表曾被标成坞修，这里按实际金额放在换旗。坞修资金池目前是 0。</p>
  </main>
</template>
