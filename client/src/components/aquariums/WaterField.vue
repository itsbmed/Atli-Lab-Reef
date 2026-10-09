<template>
  <!-- Ja/Nein als Schalter: die Folgefragen erscheinen erst, wenn er an ist -->
  <label v-if="field.type === 'checkbox'" :class="['wf-switch', { on: !!value }]">
    <span>{{ field.label }}</span>
    <input type="checkbox" role="switch" :checked="!!value" @change="emit('update', $event.target.checked)" />
    <i aria-hidden="true"></i>
  </label>

  <!-- Auswahl mit wenigen Optionen: ein Klick statt Dropdown, erneuter Klick hebt auf -->
  <div v-else-if="field.type === 'select'" class="wf wf-wide" role="group" :aria-labelledby="`wf-${field.key}`">
    <span :id="`wf-${field.key}`" class="wf-label">{{ field.label }}</span>
    <small v-if="field.hint" class="wf-hint">{{ field.hint }}</small>
    <div class="wf-chips">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="['wf-chip', { on: value === option.value }]"
        :aria-pressed="value === option.value"
        @click="emit('update', value === option.value ? '' : option.value)"
      >{{ option.label }}</button>
    </div>
  </div>

  <!-- Mehrfachauswahl, gespeichert als kommagetrennter Text -->
  <div v-else-if="field.type === 'tags'" class="wf wf-wide" role="group" :aria-labelledby="`wf-${field.key}`">
    <span :id="`wf-${field.key}`" class="wf-label">{{ field.label }}<em v-if="selectedTags.length">{{ selectedTags.length }} gewählt</em></span>
    <small v-if="field.hint" class="wf-hint">{{ field.hint }}</small>
    <div class="wf-chips">
      <button
        v-for="option in field.options"
        :key="option"
        type="button"
        :class="['wf-chip', { on: selectedTags.includes(option) }]"
        :aria-pressed="selectedTags.includes(option)"
        @click="toggleTag(option)"
      >{{ option }}</button>
    </div>
  </div>

  <label v-else class="wf">
    <span class="wf-label">{{ field.label }}</span>
    <span class="wf-input">
      <input
        :type="field.type || 'text'"
        :value="value ?? ''"
        :placeholder="field.placeholder || ''"
        :inputmode="field.type === 'number' ? 'decimal' : undefined"
        :min="field.type === 'number' ? 0 : undefined"
        @input="onInput"
      />
      <em v-if="field.unit">{{ field.unit }}</em>
    </span>
  </label>
</template>

<script setup>
import { computed } from 'vue'
import { normalizeFieldOptions } from '@/services/waterTypeFields'

const props = defineProps({
  field: { type: Object, required: true },
  value: { default: '' },
})
const emit = defineEmits(['update'])

const options = computed(() => normalizeFieldOptions(props.field.options))
const selectedTags = computed(() => String(props.value || '').split(',').map((tag) => tag.trim()).filter(Boolean))

function toggleTag(tag) {
  const next = selectedTags.value.includes(tag)
    ? selectedTags.value.filter((item) => item !== tag)
    : [...selectedTags.value, tag]
  emit('update', next.join(', '))
}

function onInput(event) {
  const raw = event.target.value
  if (props.field.type !== 'number') return emit('update', raw)
  emit('update', raw === '' ? '' : Number(raw))
}
</script>

<style scoped>
.wf { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.wf-wide { grid-column: 1 / -1; }
.wf-label { color: var(--text); font-size: 13px; font-weight: var(--fw-semibold); }
.wf-label em { margin-left: 8px; color: var(--brand-blue); font-style: normal; font-weight: var(--fw-medium); }
.wf-hint { margin-top: -3px; color: var(--text-muted); font-size: 12px; }

.wf-input { position: relative; display: block; }
.wf-input input {
  width: 100%; height: 44px; padding: 0 13px;
  border: 1px solid var(--border); border-radius: 12px;
  background: #fff; color: var(--text); font-size: 14px; outline: 0;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.wf-input:has(em) input { padding-right: 56px; }
.wf-input input:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.wf-input em { position: absolute; top: 50%; right: 13px; transform: translateY(-50%); color: var(--text-muted); font-size: 12px; font-style: normal; pointer-events: none; }

.wf-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.wf-chip {
  min-height: 34px; padding: 0 13px; border: 1px solid var(--border); border-radius: 999px;
  background: #fff; color: var(--text); font-size: 13px; font-weight: var(--fw-medium); cursor: pointer;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
}
.wf-chip:hover { border-color: var(--teal-300); }
.wf-chip.on { border-color: var(--brand-blue); background: var(--brand-blue); color: #fff; }
.wf-chip:focus-visible { outline: 0; box-shadow: var(--shadow-focus); }

.wf-switch {
  grid-column: 1 / -1; position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  min-height: 48px; padding: 0 14px; border: 1px solid var(--border); border-radius: 12px; background: #fff; cursor: pointer;
}
.wf-switch.on { border-color: var(--teal-300); background: var(--teal-50); }
.wf-switch span { color: var(--text); font-size: 14px; font-weight: var(--fw-semibold); }
.wf-switch input { position: absolute; opacity: 0; pointer-events: none; }
.wf-switch i { position: relative; flex-shrink: 0; width: 40px; height: 24px; border-radius: 999px; background: rgba(10,27,67,0.18); transition: background 0.15s; }
.wf-switch i::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(10,27,67,0.25); transition: transform 0.15s; }
.wf-switch.on i { background: var(--brand-blue); }
.wf-switch.on i::after { transform: translateX(16px); }
.wf-switch:has(input:focus-visible) { box-shadow: var(--shadow-focus); }

@media (prefers-reduced-motion: reduce) {
  .wf-chip, .wf-switch i, .wf-switch i::after, .wf-input input { transition: none; }
}
</style>
