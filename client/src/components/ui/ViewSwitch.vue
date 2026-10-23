<template>
  <!-- Umschalter Karten / Tabelle: eine Pille gleitet unter die gewählte Seite -->
  <div class="view-switch" role="radiogroup" :aria-label="label">
    <span :class="['view-switch-thumb', modelValue]" aria-hidden="true"></span>
    <button type="button" role="radio" :aria-checked="modelValue === 'cards'" :class="{ on: modelValue === 'cards' }" @click="emit('update:modelValue', 'cards')">
      <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3.5" width="14" height="5" rx="1.6" /><rect x="3" y="11.5" width="14" height="5" rx="1.6" /></svg>
      Karten
    </button>
    <button type="button" role="radio" :aria-checked="modelValue === 'table'" :class="{ on: modelValue === 'table' }" @click="emit('update:modelValue', 'table')">
      <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4.5h14M3 8.2h14M3 11.9h14M3 15.6h14" /></svg>
      Tabelle
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: 'cards' }, // 'cards' | 'table'
  label: { type: String, default: 'Darstellung' },
})
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped>
.view-switch { position: relative; flex: none; display: grid; grid-template-columns: 1fr 1fr; min-height: 42px; padding: 3px; border: 1px solid var(--border); border-radius: 12px; background: #eef3f8; }
.view-switch-thumb { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 9px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.08), 0 3px 10px rgba(10,27,67,0.1); transition: transform .32s cubic-bezier(.3,1.35,.5,1); }
.view-switch-thumb.table { transform: translateX(100%); }
.view-switch button { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 700; white-space: nowrap; cursor: pointer; transition: color .2s; }
.view-switch button:hover { color: var(--text); }
.view-switch button.on { color: var(--brand-blue); }
.view-switch button:focus-visible { outline: 3px solid rgba(0,114,206,0.2); outline-offset: 1px; }
.view-switch svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.view-switch button.on svg { fill: rgba(0,114,206,0.12); }
@media (prefers-reduced-motion: reduce) {
  .view-switch-thumb { transition: none; }
}
</style>
