<script setup>
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addCreated } from '../lib/store'

const router = useRouter()
const form = reactive({ receiptType: '', receiptParty: '', receiptGross: '', receiptFee: '0', pool: '船管' })
const formError = ref('')

function save() {
  const receiptGross = Number(form.receiptGross)
  const receiptFee = Number(form.receiptFee || 0)
  if (!form.receiptType.trim() || !receiptGross) {
    formError.value = '事项和毛额都要填。'
    return
  }
  addCreated('receipts', {
    receiptType: form.receiptType.trim(),
    receiptParty: form.receiptParty.trim(),
    receiptGross,
    receiptFee,
    pool: form.pool,
    receiptStatus: '本次新建',
  })
  router.push('/app/receipts')
}
</script>

<template>
  <main class="page">
    <RouterLink class="back" to="/app/receipts">返回收款分配</RouterLink>
    <h1>新建收款</h1>
    <p class="lede">分开记毛额、手续费和净额。计划拨款不要登在这里。保存后回到列表。</p>
    <section class="card">
      <form class="form" @submit.prevent="save">
        <label class="wide">事项<input v-model="form.receiptType" required /></label>
        <label>付款方<input v-model="form.receiptParty" /></label>
        <label>资金池
          <select v-model="form.pool">
            <option>船管</option>
            <option>接船</option>
            <option>换旗</option>
            <option>船东</option>
            <option>坞修</option>
          </select>
        </label>
        <label>毛额 USD<input v-model="form.receiptGross" inputmode="decimal" required /></label>
        <label>手续费 USD<input v-model="form.receiptFee" inputmode="decimal" /></label>
        <div class="actions wide">
          <button class="btn" type="submit">保存并返回列表</button>
          <span v-if="formError" class="bad">{{ formError }}</span>
        </div>
      </form>
    </section>
  </main>
</template>
