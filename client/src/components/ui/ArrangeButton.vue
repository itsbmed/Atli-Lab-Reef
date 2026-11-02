<template>
  <!-- Schaltet das Anordnen ein; im Anordnen-Modus wird daraus „Fertig“ -->
  <button type="button" :class="['arrange-button', { on: modelValue }]" :aria-pressed="modelValue" :title="modelValue ? 'Anordnen beenden' : 'Kästen anordnen – oder einen Kasten lange gedrückt halten'" @click="emit('update:modelValue', !modelValue)">
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <template v-if="modelValue"><path d="m4.5 10.5 3.5 3.5 7.5-8" /></template>
      <template v-else><rect x="3" y="3" width="6" height="6" rx="1.6" /><rect x="11" y="3" width="6" height="6" rx="1.6" /><rect x="3" y="11" width="6" height="6" rx="1.6" /><rect x="11" y="11" width="6" height="6" rx="1.6" /></template>
    </svg>
    <span>{{ modelValue ? 'Fertig' : label }}</span>
  </button>
</template>

<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  label: { type: String, default: 'Anordnen' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.arrange-button { flex: none; display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 42px; padding: 0 14px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text-muted); font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: color .2s, border-color .2s, background .2s; }
.arrange-button:hover { border-color: #b9cadd; color: var(--text); }
.arrange-button:focus-visible { outline: 3px solid rgba(0,114,206,0.2); outline-offset: 1px; }
.arrange-button.on { border-color: var(--brand-blue); background: var(--brand-blue); color: #fff; }
.arrange-button svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
</style>
