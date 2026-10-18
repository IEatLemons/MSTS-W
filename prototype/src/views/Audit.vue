<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { seedData } from '../lib/store'

const route = useRoute()
const selected = ref('all')
const openId = ref('')

watch(() => route.query.class, (value) => {
  selected.value = value || 'all'
}, { immediate: true })

const rows = computed(() => seedData.findings.filter((row) => selected.value === 'all' || row.classification === selected.value))
const classes = ['已出现', '潜在', '待确认', '缺证']
</script>

<template>
  <main class="page">
    <h1>追溯与发现</h1>
    <p class="lede">25 条发现留在迁移清单里。修正规则需要单独批准，不能把原表错误悄悄改没。</p>
    <article class="card" style="margin-bottom: 16px">
      <h2>来源文件</h2>
      <div class="pair"><span>工作簿</span><b>{{ seedData.sourceName }}</b></div>
      <div class="pair"><span>SHA-256</span><b style="font-size: 13px; word-break: break-all">{{ seedData.sourceSha256 }}</b></div>
      <p class="muted">附件列大多只有 PDF 或 DOCX 文件名，文件本身没有随表进来，所以一律先显示待补。</p>
    </article>
    <div class="filters">
      <select v-model="selected" aria-label="分类">
        <option value="all">全部分类</option>
        <option v-for="name in classes" :key="name">{{ name }}</option>
      </select>
      <span class="muted">{{ rows.length }} 条</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>编号</th><th>分类</th><th>标题</th><th></th></tr></thead>
        <tbody>
          <template v-for="row in rows" :key="row.id">
            <tr>
              <td>{{ row.id }}</td>
              <td><span class="tag" :class="row.classification === '已出现' ? 'bad' : 'warn'">{{ row.classification }}</span></td>
              <td>{{ row.title }}</td>
              <td><button class="text-btn" type="button" @click="openId = openId === row.id ? '' : row.id">{{ openId === row.id ? '收起' : '展开' }}</button></td>
            </tr>
            <tr v-if="openId === row.id">
              <td colspan="4">
                <p><b>证据</b> {{ row.evidence }}</p>
                <p>{{ row.finding }}</p>
                <p class="muted">下一步：{{ row.action }}</p>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </main>
</template>
