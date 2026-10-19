<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { dbState } from '../finance/store'
defineProps({ title: String, wide: Boolean })
const emit=defineEmits(['close'])
const panel=ref(null);let previous
function key(event){if(event.key==='Escape')emit('close');if(event.key==='Tab'){const nodes=[...panel.value.querySelectorAll('button,input,select,textarea,a[href]')].filter(n=>!n.disabled);if(!nodes.length)return;const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}}
onMounted(()=>{previous=document.activeElement;document.addEventListener('keydown',key);panel.value?.focus();document.body.style.overflow='hidden'})
onUnmounted(()=>{document.removeEventListener('keydown',key);document.body.style.overflow='';previous?.focus()})
</script>
<template><Teleport to="body"><div class="f-overlay" @click.self="emit('close')"><section ref="panel" class="f-dialog" :class="{wide}" role="dialog" aria-modal="true" :aria-label="title" tabindex="-1"><header><div><p class="f-eyebrow">MSTS FINANCE / 演示工作区</p><h2>{{ title }}</h2></div><button class="f-icon" aria-label="关闭对话框" @click="emit('close')">×</button></header><div v-if="dbState.error" class="f-notice error" role="alert">{{dbState.error}}</div><slot /></section></div></Teleport></template>
