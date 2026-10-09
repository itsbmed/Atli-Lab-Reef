<template>
  <fieldset class="supply">
    <legend>Versorgungssystem</legend>
    <p class="supply-hint">Womit versorgen Sie das Becken mit KH, Calcium und Magnesium?</p>

    <div class="supply-modes" role="radiogroup" aria-label="Versorgungssystem">
      <label v-for="mode in SUPPLY_MODES" :key="mode.value" :class="['supply-card', { on: form.supply_mode === mode.value }]">
        <input type="radio" name="supply_mode" :value="mode.value" :checked="form.supply_mode === mode.value" @change="setMode(mode.value)" />
        <span class="supply-icon" aria-hidden="true">
          <svg v-if="mode.value === 'none'" viewBox="0 0 32 32"><circle cx="16" cy="16" r="11" /><path d="M8.5 23.5 23.5 8.5" /></svg>
          <svg v-else-if="mode.value === 'ati'" viewBox="0 0 32 32"><path d="M10 9h4v3l1 2v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V14l1-2z" /><path d="M18 9h4v3l1 2v12a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1V14l1-2z" /></svg>
          <svg v-else viewBox="0 0 32 32"><path d="M13 5h6v4l2 3v14a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2V12l2-3z" /><path d="M14 19h4M16 17v4" /></svg>
        </span>
        <strong>{{ mode.label }}</strong>
        <small>{{ mode.description }}</small>
      </label>
    </div>

    <div v-if="form.supply_mode === 'ati'" class="supply-follow">
      <span class="supply-follow-label">Welche Linie? <em>optional</em></span>
      <div class="supply-chips">
        <button
          v-for="line in ATI_SUPPLY_LINES"
          :key="line"
          type="button"
          :class="['supply-chip', { on: form.supply_line === line }]"
          :aria-pressed="form.supply_line === line"
          @click="set('supply_line', form.supply_line === line ? '' : line)"
        >{{ line }}</button>
      </div>
    </div>

    <div v-if="form.supply_mode === 'other'" class="supply-follow">
      <span class="supply-follow-label">Auf wie viele Flaschen verteilt sich das Mittel?</span>
      <div class="supply-bottles" role="radiogroup" aria-label="Anzahl Flaschen">
        <label v-for="option in SUPPLY_BOTTLES" :key="option.value" :class="['bottle-card', { on: form.supply_bottles === option.value }]">
          <input type="radio" name="supply_bottles" :value="option.value" :checked="form.supply_bottles === option.value" @change="set('supply_bottles', option.value)" />
          <span class="bottle-row" aria-hidden="true">
            <svg v-for="n in option.value" :key="n" viewBox="0 0 14 30"><path d="M4.5 1h5v4l2.5 4v18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9l2.5-4z" /></svg>
          </span>
          <strong>{{ option.label }}</strong>
          <small>{{ option.description }}</small>
        </label>
      </div>
      <label class="supply-product">
        <span>Produktname <em>optional</em></span>
        <input type="text" :value="form.supply_product || ''" placeholder="z. B. Triton Core7, Red Sea Foundation" @input="set('supply_product', $event.target.value)" />
      </label>
    </div>
  </fieldset>
</template>

<script setup>
import { SUPPLY_MODES, ATI_SUPPLY_LINES, SUPPLY_BOTTLES, describeSupply } from '@/services/supplySystem'

const props = defineProps({
  form: { type: Object, required: true },
})

function set(key, value) {
  props.form[key] = value
  props.form.supply_system = describeSupply(props.form)
}

function setMode(mode) {
  props.form.supply_mode = mode
  if (mode !== 'ati') props.form.supply_line = ''
  if (mode !== 'other') {
    props.form.supply_bottles = null
    props.form.supply_product = ''
  }
  props.form.supply_system = describeSupply(props.form)
}
</script>

<style scoped>
.supply { min-width: 0; margin: 0; padding: 0; border: 0; }
.supply legend { padding: 0; color: var(--text); font-size: 16px; font-weight: var(--fw-bold); }
.supply-hint { margin: 4px 0 12px; color: var(--text-muted); font-size: 13px; }

.supply-modes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.supply-card,
.bottle-card {
  position: relative; display: flex; flex-direction: column; gap: 4px;
  padding: 14px; border: 1px solid var(--border); border-radius: 16px; background: #fff;
  cursor: pointer; transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}
.supply-card:hover,
.bottle-card:hover { border-color: var(--teal-300); }
.supply-card.on,
.bottle-card.on { border-color: var(--teal-500); background: var(--teal-50); box-shadow: 0 0 0 1px var(--teal-500) inset; }
.supply-card input,
.bottle-card input { position: absolute; opacity: 0; pointer-events: none; }
.supply-card:has(input:focus-visible),
.bottle-card:has(input:focus-visible) { box-shadow: var(--shadow-focus); }
.supply-card strong,
.bottle-card strong { color: var(--text); font-size: 13px; font-weight: var(--fw-bold); }
.supply-card small,
.bottle-card small { color: var(--text-muted); font-size: 12px; line-height: 1.4; }

.supply-icon { display: grid; place-items: center; width: 34px; height: 34px; margin-bottom: 4px; border-radius: 10px; background: var(--teal-50); }
.supply-card.on .supply-icon { background: #fff; }
.supply-icon svg { width: 22px; height: 22px; fill: none; stroke: var(--brand-blue); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.supply-follow { display: grid; gap: 10px; margin-top: 14px; padding: 14px; border-radius: 16px; background: var(--teal-50); }
.supply-follow-label,
.supply-product > span { color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); }
.supply-follow em,
.supply-product em { margin-left: 4px; color: var(--text-muted); font-style: normal; font-weight: var(--fw-medium); }

.supply-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.supply-chip {
  min-height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 999px;
  background: #fff; color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); cursor: pointer;
}
.supply-chip.on { border-color: var(--teal-500); background: var(--brand-blue); color: #fff; }
.supply-chip:focus-visible { outline: 0; box-shadow: var(--shadow-focus); }

.supply-bottles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.bottle-card { align-items: center; text-align: center; }
.bottle-row { display: flex; align-items: flex-end; gap: 3px; height: 30px; margin-bottom: 4px; }
.bottle-row svg { width: 13px; height: 28px; fill: var(--teal-200); stroke: var(--brand-blue); stroke-width: 1.4; stroke-linejoin: round; }
.bottle-card.on .bottle-row svg { fill: var(--brand-cyan); }

.supply-product { display: flex; flex-direction: column; gap: 7px; }
.supply-product input {
  width: 100%; height: 44px; padding: 0 14px; border: 1px solid var(--border); border-radius: 13px;
  background: #fff; color: var(--text); font-size: 14px; outline: 0;
}
.supply-product input:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }

@media (max-width: 640px) {
  .supply-modes { grid-template-columns: 1fr; }
  .supply-card { display: grid; grid-template-columns: 34px 1fr; column-gap: 12px; align-items: center; }
  .supply-icon { grid-row: span 2; margin: 0; }
  .supply-bottles { grid-template-columns: 1fr; }
  .bottle-card { display: grid; grid-template-columns: 46px 1fr; column-gap: 12px; align-items: center; text-align: left; }
  .bottle-row { grid-row: span 2; margin: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .supply-card, .bottle-card { transition: none; }
}
</style>
