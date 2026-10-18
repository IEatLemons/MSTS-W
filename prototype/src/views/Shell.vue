<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAV, ROLES, roleById } from '../lib/model'
import { seedData, setEntry, state } from '../lib/store'

const route = useRoute()
const router = useRouter()
const role = computed(() => roleById(state.entry))

function isActive(item) {
  if (item.exact || item.to === '/app') return route.path === item.to
  return route.path === item.to || route.path.startsWith(`${item.to}/`)
}

function onSwitch(event) {
  setEntry(event.target.value)
  router.push('/app')
}
</script>

<template>
  <div class="shell">
    <aside class="side">
      <div class="brand">
        <strong>船舶管理财务</strong>
        <span>全量原型 · 不设权限</span>
      </div>
      <nav>
        <template v-for="item in NAV" :key="item.label || item.group">
          <RouterLink v-if="item.to" :class="{ active: isActive(item) }" :to="item.to">{{ item.label }}</RouterLink>
          <template v-else>
            <p class="group">{{ item.group }}</p>
            <RouterLink v-for="link in item.items" :key="link.to" :class="{ active: isActive(link) }" :to="link.to">
              {{ link.label }}
            </RouterLink>
          </template>
        </template>
      </nav>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <div class="context">
          <b>{{ seedData.organization.shortName }}</b>
          · {{ seedData.vessel.name }}
          · 截止 {{ seedData.asOf }}
        </div>
        <div class="switch">
          <span>当前入口</span>
          <select :value="state.entry" aria-label="切换人员入口" @change="onSwitch">
            <option v-for="item in ROLES" :key="item.id" :value="item.id">{{ item.name }}</option>
          </select>
          <RouterLink to="/">入口页</RouterLink>
        </div>
      </header>
      <p class="hint">{{ role.hint }}</p>
      <router-view />
    </div>
  </div>
</template>
