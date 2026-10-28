<template>
  <div class="vh">
    <button type="button" :class="['vh-chip', 'vh-calc-toggle', { on: open }]" :aria-expanded="open" @click="toggle">
      <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="2.5" width="14" height="15" rx="2.5" /><path d="M6.5 6h7M6.5 10h1M9.5 10h1M12.5 10h1M6.5 13.5h1M9.5 13.5h1M12.5 13.5h1" /></svg>
      Aus Maßen berechnen
    </button>

    <div v-if="open" class="vh-calc">
      <div class="vh-sides">
        <label v-for="side in SIDES" :key="side.key">
          <span>{{ side.label }}</span>
          <div class="vh-input">
            <input v-model.number="sides[side.key]" type="number" min="1" inputmode="decimal" :placeholder="side.placeholder" />
            <small>cm</small>
          </div>
        </label>
      </div>
      <div class="vh-result" aria-live="polite">
        <template v-if="result">
          <p>
            <span>Bruttovolumen {{ result.gross.toLocaleString('de-DE') }} L</span>
            <strong>ca. {{ result.net.toLocaleString('de-DE') }} L netto</strong>
            <small>Gestein, Bodengrund und Technik verdrängen etwa 15 %.</small>
          </p>
          <button type="button" class="vh-apply" @click="apply">Übernehmen</button>
        </template>
        <p v-else class="vh-empty">Länge, Breite und Höhe des Beckens eingeben.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { formatDimensions, parseDimensions, volumeFromDimensions } from '@/services/aquariumWizard'

const props = defineProps({
  form: { type: Object, required: true },
})
const emit = defineEmits(['picked'])

const SIDES = [
  { key: 'length', label: 'Länge', placeholder: '120' },
  { key: 'width', label: 'Breite', placeholder: '50' },
  { key: 'height', label: 'Höhe', placeholder: '50' },
]

const open = ref(false)
const sides = reactive({ length: null, width: null, height: null })
const result = computed(() => volumeFromDimensions(sides.length, sides.width, sides.height))

function toggle() {
  open.value = !open.value
  // Schon eingetragene Abmessungen gleich übernehmen.
  const known = parseDimensions(props.form.dimensions)
  if (open.value && known && !sides.length) [sides.length, sides.width, sides.height] = known
}

function apply() {
  props.form.net_volume = result.value.net
  props.form.dimensions = formatDimensions(sides.length, sides.width, sides.height)
  open.value = false
  emit('picked')
}
</script>

<style scoped>
.vh { display: grid; gap: 10px; }
.vh-chip { justify-self: start; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border: 1px solid var(--border); border-radius: 999px; background: #fff; color: var(--text); font-size: 12.5px; font-weight: 600; font-variant-numeric: tabular-nums; cursor: pointer; transition: border-color .15s, background .15s, color .15s; }
.vh-chip:hover { border-color: var(--teal-300); }
.vh-chip:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.vh-calc-toggle { border-style: dashed; color: var(--brand-blue); }
.vh-calc-toggle.on { border-style: solid; background: var(--teal-50); color: var(--brand-blue); }
.vh-calc-toggle svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }

.vh-calc { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 14px; align-items: end; padding: 14px; border-radius: 16px; background: var(--teal-50); animation: vh-in .2s ease-out; }
@keyframes vh-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.vh-sides { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.vh-sides label { display: grid; gap: 5px; }
.vh-sides span { color: var(--text); font-size: 12px; font-weight: 600; }
.vh-input { position: relative; }
.vh-input input { width: 100%; height: 42px; padding: 0 34px 0 12px; border: 1px solid var(--border); border-radius: 11px; background: #fff; color: var(--text); font-size: 14px; font-variant-numeric: tabular-nums; outline: 0; }
.vh-input input:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.vh-input small { position: absolute; top: 50%; right: 11px; color: var(--text-muted); font-size: 12px; transform: translateY(-50%); pointer-events: none; }
.vh-result { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 42px; }
.vh-result p { display: grid; gap: 1px; }
.vh-result span { color: var(--text-muted); font-size: 11.5px; }
.vh-result strong { color: var(--text); font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
.vh-result small { color: var(--text-muted); font-size: 11px; line-height: 1.35; }
.vh-empty { color: var(--text-muted); font-size: 12.5px; }
.vh-apply { flex: none; min-height: 38px; padding: 0 16px; border: 0; border-radius: 999px; background: var(--brand-blue); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }
.vh-apply:focus-visible { outline: none; box-shadow: var(--shadow-focus); }

@media (max-width: 640px) {
  .vh-calc { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .vh-calc { animation: none; }
  .vh-chip { transition: none; }
}
</style>
