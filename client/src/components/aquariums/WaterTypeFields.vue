<template>
  <div class="water-fields">
    <div v-if="groups.length" class="water-fields-head">
      <p>
        <strong>{{ form.water_type }}</strong>
        <span>{{ startedCount }} von {{ groups.length }} Bereichen mit Angaben</span>
      </p>
      <button type="button" class="water-toggle-all" @click="toggleAll">{{ allOpen ? 'Alle schließen' : 'Alle öffnen' }}</button>
    </div>
    <p v-else class="water-empty">Für {{ form.water_type }} gibt es keine weiteren Angaben.</p>

    <section v-for="(group, index) in groups" :key="group.title" :class="['water-group', { open: isOpen(group) }]">
      <h3>
        <button
          type="button"
          class="water-group-head"
          :aria-expanded="isOpen(group)"
          :aria-controls="`water-group-${index}`"
          @click="toggle(group)"
        >
          <span class="water-group-title">{{ group.title }}</span>
          <span :class="['water-group-summary', { empty: !summaries[index].length }]">
            {{ summaryText(summaries[index]) }}
          </span>
          <b v-if="summaries[index].length" class="water-group-count">{{ summaries[index].length }}</b>
          <i aria-hidden="true"></i>
        </button>
      </h3>
      <div v-show="isOpen(group)" :id="`water-group-${index}`" class="water-grid">
        <WaterField
          v-for="field in group.fields.filter(isVisible)"
          :key="field.key"
          :class="{ 'wf-dep': field.showWhen }"
          :field="field"
          :value="readPath(field.model)"
          @update="writePath(field.model, $event)"
        />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import WaterField from './WaterField.vue'
import { waterTypeGroups, ensureWaterTypeDetails, isWaterFieldVisible, formatWaterFieldValue } from '@/services/waterTypeFields'

const props = defineProps({
  form: { type: Object, required: true },
  // Bereiche, die anderswo abgefragt werden (z. B. „Auswertung“ im letzten Schritt des Assistenten).
  exclude: { type: Array, default: () => [] },
})

const groups = computed(() => waterTypeGroups(props.form.water_type).filter((group) => !props.exclude.includes(group.title)))
const openTitles = ref(new Set())

watch(() => props.form.water_type, () => {
  ensureWaterTypeDetails(props.form)
  openTitles.value = new Set(groups.value.slice(0, 1).map((group) => group.title))
}, { immediate: true })

// Was in einem Bereich schon steht, lesbar im zugeklappten Kopf.
const summaries = computed(() => groups.value.map((group) =>
  group.fields
    .filter(isVisible)
    .map((field) => field.type === 'checkbox' ? (readPath(field.model) ? field.label : '') : formatWaterFieldValue(props.form, field))
    .filter(Boolean)
))
const startedCount = computed(() => summaries.value.filter((items) => items.length).length)
const allOpen = computed(() => groups.value.every((group) => openTitles.value.has(group.title)))

function summaryText(items) {
  if (!items.length) return 'Noch keine Angaben'
  const shown = items.slice(0, 3).join(' · ')
  return items.length > 3 ? `${shown} +${items.length - 3}` : shown
}

function isOpen(group) {
  return openTitles.value.has(group.title)
}

function toggle(group) {
  const next = new Set(openTitles.value)
  next.has(group.title) ? next.delete(group.title) : next.add(group.title)
  openTitles.value = next
}

function toggleAll() {
  openTitles.value = allOpen.value ? new Set() : new Set(groups.value.map((group) => group.title))
}

function readPath(path) {
  if (path.startsWith('water_details.')) return props.form.water_details?.[path.replace('water_details.', '')]
  return props.form[path]
}

function writePath(path, value) {
  if (path.startsWith('water_details.')) {
    ensureWaterTypeDetails(props.form)
    props.form.water_details[path.replace('water_details.', '')] = value
    return
  }
  props.form[path] = value
}

function isVisible(field) {
  return isWaterFieldVisible(props.form, field)
}
</script>

<style scoped>
.water-fields { display: grid; gap: 10px; }
.water-fields-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 2px; }
.water-fields-head p { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; }
.water-fields-head strong { color: var(--text); font-size: 16px; font-weight: var(--fw-bold); }
.water-fields-head span { color: var(--text-muted); font-size: 13px; }
.water-toggle-all { flex-shrink: 0; padding: 6px 2px; border: 0; background: none; color: var(--brand-blue); font-size: 13px; font-weight: var(--fw-semibold); cursor: pointer; }
.water-toggle-all:focus-visible { outline: 0; box-shadow: var(--shadow-focus); border-radius: 8px; }
.water-empty { color: var(--text-muted); font-size: 13px; }

.water-group { border: 1px solid var(--border); border-radius: 16px; background: #fff; transition: border-color 0.15s, box-shadow 0.15s; }
.water-group.open { border-color: var(--teal-200); box-shadow: 0 10px 28px rgba(10,27,67,0.06); }
.water-group h3 { margin: 0; font-size: inherit; }
.water-group-head {
  display: grid; grid-template-columns: minmax(110px, auto) 1fr auto 16px; align-items: center; gap: 12px;
  width: 100%; min-height: 56px; padding: 0 16px; border: 0; border-radius: 16px; background: none;
  text-align: left; cursor: pointer;
}
.water-group-head:focus-visible { outline: 0; box-shadow: var(--shadow-focus); }
.water-group-title { color: var(--text); font-size: 15px; font-weight: var(--fw-bold); }
.water-group-summary { overflow: hidden; color: var(--brand-blue); font-size: 13px; white-space: nowrap; text-overflow: ellipsis; }
.water-group-summary.empty { color: var(--text-muted); }
.water-group-count { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--teal-50); color: var(--brand-blue); font-size: 12px; font-weight: var(--fw-bold); }
.water-group-head i { width: 8px; height: 8px; border-right: 2px solid var(--text-muted); border-bottom: 2px solid var(--text-muted); transform: rotate(45deg) translate(-2px, -2px); transition: transform 0.15s; }
.water-group.open .water-group-head i { transform: rotate(-135deg) translate(-2px, -2px); }

.water-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 14px; padding: 4px 16px 18px; }
.wf-dep { margin-left: 14px; padding-left: 12px; border-left: 2px solid var(--teal-200); }

@media (max-width: 560px) {
  .water-group-head { grid-template-columns: 1fr auto 16px; row-gap: 2px; padding: 10px 14px; }
  .water-group-summary { grid-column: 1; grid-row: 2; }
  .water-group-count { grid-row: 1 / span 2; grid-column: 2; }
  .water-group-head i { grid-row: 1 / span 2; grid-column: 3; }
}
@media (prefers-reduced-motion: reduce) {
  .water-group, .water-group-head i { transition: none; }
}
</style>
