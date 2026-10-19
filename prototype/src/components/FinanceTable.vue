<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { exportCsv } from '../finance/csv'
const props = defineProps({ rows: { type: Array, default: () => [] }, columns: { type: Array, required: true }, title: { type: String, default: '明细' }, searchable: { type: Boolean, default: true } })
const emit = defineEmits(['select'])
const query = ref(''); const page = ref(1); const sortKey = ref(''); const ascending = ref(true)
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const rows = props.rows.filter(row => !q || Object.values(row).some(v => typeof v !== 'object' && String(v ?? '').toLowerCase().includes(q)))
  if (sortKey.value) rows.sort((a,b) => {const av=a[sortKey.value]??'',bv=b[sortKey.value]??'';return (typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'zh-CN'))*(ascending.value?1:-1)})
  return rows
})
const pages = computed(() => Math.max(1, Math.ceil(filtered.value.length / 12)))
const printing = ref(false)
const beforePrint = () => { printing.value = true }
const afterPrint = () => { printing.value = false }
onMounted(() => { window.addEventListener('beforeprint', beforePrint); window.addEventListener('afterprint', afterPrint) })
onUnmounted(() => { window.removeEventListener('beforeprint', beforePrint); window.removeEventListener('afterprint', afterPrint) })
const visible = computed(() => printing.value ? filtered.value : filtered.value.slice((page.value - 1) * 12, page.value * 12))
watch([query, () => props.rows.length], () => { page.value = 1 })
watch(pages, n => { if(page.value>n)page.value=n })
const display = (row,col) => col.format ? col.format(row[col.key],row) : row[col.key] ?? '—'
function sort(key) { if(sortKey.value===key) ascending.value=!ascending.value; else {sortKey.value=key;ascending.value=true} }
function download() { exportCsv(props.title,props.columns.map(c=>c.label),filtered.value.map(r=>props.columns.map(c=>display(r,c)))) }
</script>
<template>
  <section class="f-table-card">
    <div class="f-table-tools"><input v-if="searchable" v-model="query" type="search" :aria-label="`搜索${title}`" placeholder="搜索单号、摘要、往来方…" /><span>{{ filtered.length }} 条记录</span><button class="f-btn subtle" @click="download">导出 CSV ↗</button></div>
    <div class="f-table-scroll"><table><thead><tr><th v-for="col in columns" :key="col.key" :class="{num:col.money}"><button @click="sort(col.key)">{{ col.label }} <small>{{ sortKey===col.key?(ascending?'↑':'↓'):'↕' }}</small></button></th><th class="f-print-hide">操作</th></tr></thead><tbody>
      <tr v-for="row in visible" :key="row.id" @dblclick="emit('select',row)"><td v-for="col in columns" :key="col.key" :class="{num:col.money}"><span v-if="col.status" class="f-status" :data-status="row.status">{{ display(row,col) }}</span><span v-else>{{ display(row,col) }}</span></td><td class="f-print-hide"><button class="f-link" @click="emit('select',row)">查看 ↗</button></td></tr>
      <tr v-if="!visible.length"><td :colspan="columns.length+1" class="f-empty">当前账套、船舶和期间没有匹配记录</td></tr>
    </tbody></table></div>
    <div class="f-pagination"><span>{{ title }} · 第 {{ page }} / {{ pages }} 页</span><div><button class="f-btn subtle" :disabled="page===1" @click="page--">上一页</button><button class="f-btn subtle" :disabled="page===pages" @click="page++">下一页</button></div></div>
  </section>
</template>
