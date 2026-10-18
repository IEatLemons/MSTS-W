<script setup>
import { useRouter } from 'vue-router'
import { ROLES } from '../lib/model'
import { setEntry } from '../lib/store'

const router = useRouter()

function enter(id) {
  setEntry(id)
  router.push('/app')
}
</script>

<template>
  <main class="gate">
    <section class="gate-intro">
      <p class="eyebrow">Prototype · 2026-10-14</p>
      <h1>船舶管理<br>财务系统</h1>
      <p>
        这是给 PIONEER LAY 用的可点击原型。先选一个人员入口，看看这个角色进门后先处理什么。
        进去之后不做账号权限限制，左侧菜单始终是全量功能。
      </p>
      <div class="gate-meta">
        <span class="pill">Speedy Pioneer</span>
        <span class="pill">PIONEER LAY</span>
        <span class="pill">快照未平 −2,790.58 USD</span>
        <a class="pill" href="analysis-report.html">数据分析报告</a>
      </div>
    </section>
    <section class="doors">
      <button v-for="role in ROLES" :key="role.id" class="door" type="button" @click="enter(role.id)">
        <small>{{ role.who }}</small>
        <strong>{{ role.name }}</strong>
        <span>{{ role.summary }}</span>
        <em>从这个入口进入</em>
      </button>
    </section>
  </main>
</template>
