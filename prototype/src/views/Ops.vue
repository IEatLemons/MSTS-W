<script setup>
import { seedData } from '../lib/store'
</script>

<template>
  <main class="page">
    <h1>备份与恢复</h1>
    <p class="lede">这一页只说明上线前要具备的运维动作。原型不会真的发起备份或切换服务器。</p>
    <div class="table-wrap">
      <table>
        <thead><tr><th>事项</th><th>状态</th><th>说明</th></tr></thead>
        <tbody>
          <tr v-for="row in seedData.backup" :key="row.name">
            <td>{{ row.name }}</td>
            <td><span class="tag warn">{{ row.status }}</span></td>
            <td>{{ row.note }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <article class="callout">恢复之后要由财务核对银行余额、备用金和未平差额，再由负责人批准重新使用。管理员不能直接改已经记账的金额。</article>
  </main>
</template>
