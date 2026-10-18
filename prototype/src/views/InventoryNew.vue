<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated } from '../lib/store'

const router = useRouter()
const form = reactive({ month: '2026-09', foodOpening: '', foodPurchase: '', foodClosing: '', entertainmentClosing: '' })
const formError = ref('')

function save() {
  if (!form.month) {
    formError.value = '月份要填。'
    return
  }
  const num = (value) => (value === '' ? null : Number(value))
  addCreated('inventory', {
    month: form.month,
    foodOpening: num(form.foodOpening),
    foodPurchase: num(form.foodPurchase),
    foodClosing: num(form.foodClosing),
    entertainmentClosing: num(form.entertainmentClosing),
    savedAsZero: false,
  })
  router.push('/app/inventory')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/inventory">返回库存月结</RouterLink>
    <h1>新建月结</h1>
    <p class="lede">耗用 = 期初 + 购入 − 期末。未填保持空白，不要写成确认过的零。保存后回到列表。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label>月份<input v-model="form.month" type="month" required /></label>
        <label>伙食期初<input v-model="form.foodOpening" inputmode="decimal" /></label>
        <label>购入<input v-model="form.foodPurchase" inputmode="decimal" /></label>
        <label>期末盘点<input v-model="form.foodClosing" inputmode="decimal" /></label>
        <label>招待品期末<input v-model="form.entertainmentClosing" inputmode="decimal" /></label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
  </main>
</template>
