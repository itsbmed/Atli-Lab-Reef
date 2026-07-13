<template>
  <div class="water-fields">
    <div class="water-fields-head">
      <span>{{ form.water_type }}</span>
      <strong>Wassertyp-spezifische Angaben</strong>
    </div>

    <section v-for="group in visibleGroups" :key="group.title" class="water-group">
      <h3>{{ group.title }}</h3>
      <div class="water-grid">
        <label v-for="field in group.fields.filter(isVisible)" :key="field.key" :class="['water-field', { check: field.type === 'checkbox' }]">
          <template v-if="field.type === 'checkbox'">
            <input type="checkbox" :checked="fieldValue(field)" @change="setFieldValue(field, $event.target.checked)" />
            <span>{{ field.label }}</span>
          </template>

          <template v-else>
            <span>{{ field.label }}</span>
            <select v-if="field.type === 'select'" :value="fieldValue(field)" @change="setFieldValue(field, $event.target.value)">
              <option value="">Bitte wählen</option>
              <option v-for="option in normalizedOptions(field.options)" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
            <input
              v-else
              :type="field.type || 'text'"
              :value="fieldValue(field)"
              :placeholder="field.placeholder || ''"
              @input="setFieldValue(field, field.type === 'number' ? Number($event.target.value || 0) : $event.target.value)"
            />
          </template>
        </label>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import { WATER_TYPE_FIELDSETS, ensureWaterTypeDetails } from '@/services/waterTypeFields'

const props = defineProps({
  form: { type: Object, required: true },
})

const visibleGroups = computed(() => WATER_TYPE_FIELDSETS[props.form.water_type] || [])

watch(() => props.form.water_type, () => ensureWaterTypeDetails(props.form), { immediate: true })

function normalizedOptions(options = []) {
  return options.map((option) => typeof option === 'string' ? { value: option, label: option } : option)
}

function readPath(path) {
  if (path.startsWith('water_details.')) {
    ensureWaterTypeDetails(props.form)
    return props.form.water_details[path.replace('water_details.', '')]
  }
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

function fieldValue(field) {
  return readPath(field.model) ?? (field.type === 'checkbox' ? false : '')
}

function setFieldValue(field, value) {
  writePath(field.model, value)
}

function isVisible(field) {
  if (!field.showWhen) return true
  return readPath(field.showWhen.model) === field.showWhen.equals
}
</script>

<style scoped>
.water-fields { display: grid; gap: 14px; }
.water-fields-head {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 12px 14px; border-radius: 16px; background: rgba(136,193,233,0.12); border: 1px solid rgba(136,193,233,0.24);
}
.water-fields-head span { color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.water-fields-head strong { color: var(--text); font-size: 13px; font-weight: 800; text-align: right; }
.water-group { display: grid; gap: 10px; }
.water-group h3 { color: var(--text); font-size: 14px; font-weight: 800; letter-spacing: -0.01em; }
.water-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 12px; }
.water-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.water-field > span { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.water-field input:not([type='checkbox']),
.water-field select {
  width: 100%; min-height: 46px; padding: 0 13px;
  border: 1px solid var(--border); border-radius: 13px;
  background: #fff; color: var(--text); font-size: 14px; outline: 0;
}
.water-field input:focus,
.water-field select:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.water-field.check {
  min-height: 46px; flex-direction: row; align-items: center; gap: 9px;
  padding: 11px 12px; border: 1px solid var(--border); border-radius: 14px; background: rgba(255,255,255,0.74);
}
.water-field.check input { width: 18px; height: 18px; accent-color: var(--teal-500); }
.water-field.check span { color: var(--text); font-size: 13px; font-weight: 800; }
</style>
