<script setup>
import {computed,useId} from 'vue'
import {data,selectedVessels} from '../store.js'
const props=defineProps({modelValue:String,disabled:Boolean,invalid:Boolean})
const emit=defineEmits(['update:modelValue'])
const hintId=useId()
const choices=computed(()=>data.vessels.filter(v=>selectedVessels.value.some(x=>x.id===v.id)||v.id===props.modelValue))
</script>
<template>
 <label class="vessel-field" :class="{'vessel-field--invalid':invalid}">
  <span class="vessel-field-label">所属船舶 <span class="required-mark">必选</span></span>
  <select aria-label="所属船舶" required :aria-invalid="invalid||undefined" :aria-describedby="hintId" :value="modelValue||''" :disabled="disabled" @change="emit('update:modelValue',$event.target.value)"><option value="">请选择本笔资料所属船舶</option><option v-for="v in choices" :key="v.id" :value="v.id">{{v.name}} · IMO {{v.imo||'未填写'}} · {{v.company||'公司未填写'}}</option></select>
  <span :id="hintId" class="vessel-field-help">{{invalid?'请选择有效的所属船舶':disabled?'船舶已绑定此笔账目，不能直接修改':'此笔账目将归属所选船舶，请核对后继续'}}</span>
 </label>
</template>
