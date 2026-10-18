<script setup>
import { computed, ref } from 'vue'
import { seedData, state } from '../lib/store'

const month = ref('all')
const allRows = computed(() => [...state.inventory, ...seedData.inventory.map((row) => ({ ...row, savedAsZero: true }))])
const months = computed(() => [...new Set(allRows.value.map((row) => row.month))])
const rows = computed(() => (month.value === 'all' ? allRows.value : allRows.value.filter((row) => row.month === month.value)))

function cell(value, missing) {
  if (value === null || value === undefined || value === '') return missing ? '缺失' : '—'
  return value
}
</script>

<template>
  <main class="page">
    <h1>库存月结</h1>
    <p class="lede">伙食和招待品按月结转。原表 7 月和 8 月保存为 0，这里标成缺失。</p>
    <div class="filters">
      <select v-model="month" aria-label="月份">
        <option value="all">全部月份</option>
        <option v-for="item in months" :key="item" :value="item">{{ item }}</option>
      </select>
      <RouterLink class="btn push" to="/app/inventory/new">新建</RouterLink>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>月份</th><th>伙食期初</th><th>购入</th><th>期末盘点</th><th>招待品期末</th><th>说明</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id || row.month">
            <td>{{ row.month }} <span v-if="row.demo" class="tag warn">本次新建</span></td>
            <td>{{ cell(row.foodOpening, row.savedAsZero) }}</td>
            <td>{{ cell(row.foodPurchase, row.savedAsZero) }}</td>
            <td>{{ cell(row.foodClosing, row.savedAsZero) }}</td>
            <td>{{ cell(row.entertainmentClosing, row.savedAsZero) }}</td>
            <td>{{ row.savedAsZero ? '原表保存 0，未验证' : '本次浏览' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </main>
</template>
