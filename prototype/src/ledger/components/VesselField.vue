<script setup>
import {computed} from 'vue'
import {data,selectedVessels} from '../store.js'
const props=defineProps({modelValue:String,disabled:Boolean})
const emit=defineEmits(['update:modelValue'])
const choices=computed(()=>data.vessels.filter(v=>selectedVessels.value.some(x=>x.id===v.id)||v.id===props.modelValue))
</script>
<template>
 <label class="vessel-field">所属船舶 <span class="required-mark">*</span><select aria-label="所属船舶" :value="modelValue||''" :disabled="disabled" @change="emit('update:modelValue',$event.target.value)"><option value="">请选择本笔资料所属船舶</option><option v-for="v in choices" :key="v.id" :value="v.id">{{v.name}} · IMO {{v.imo||'未填写'}} · {{v.company||'公司未填写'}}</option></select></label>
</template>
