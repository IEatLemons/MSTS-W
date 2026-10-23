<template>
  <router-view v-slot="{ Component }">
    <keep-alive include="LedgerShell">
      <component :is="Component" />
    </keep-alive>
  </router-view>
</template>
