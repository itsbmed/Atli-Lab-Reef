<template>
  <span v-if="arrow" class="value-direction" :title="arrow === '↑' ? 'Über dem Zielbereich' : 'Unter dem Zielbereich'" :aria-label="arrow === '↑' ? 'Zu hoch' : 'Zu niedrig'">{{ arrow }}</span>
</template>

<script setup>
import { computed } from 'vue'
// Pfeil für zu hoch (↑) oder zu niedrig (↓): direkt über `direction` ('high' | 'low') oder aus Wert und Grenzen.
const props = defineProps({ value: { default: null }, min: { default: null }, max: { default: null }, direction: { type: String, default: '' } })
const arrow = computed(() => {
  if (props.direction) return props.direction === 'high' ? '↑' : props.direction === 'low' ? '↓' : ''
  if (props.value === null || props.value === '' || !Number.isFinite(Number(props.value))) return ''
  if (props.min !== null && Number.isFinite(Number(props.min)) && Number(props.value) < Number(props.min)) return '↓'
  if (props.max !== null && Number.isFinite(Number(props.max)) && Number(props.value) > Number(props.max)) return '↑'
  return ''
})
</script>

<style scoped>
.value-direction { display: inline-block; margin-right: 3px; font-size: 1em; font-weight: 900; line-height: 1; }
</style>
