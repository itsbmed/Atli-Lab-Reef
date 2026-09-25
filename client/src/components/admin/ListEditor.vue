<template>
  <div class="list-editor">
    <div v-for="(entry, index) in modelValue" :key="index" class="list-editor-row">
      <b>{{ index + 1 }}</b>
      <input :value="entry" type="text" :placeholder="placeholder" @input="update(index, $event.target.value)" />
      <button type="button" :aria-label="`Eintrag ${index + 1} entfernen`" title="Entfernen" @click="remove(index)">×</button>
    </div>
    <p v-if="!modelValue.length" class="list-editor-empty">Noch kein Eintrag. Der Block bleibt im Bericht ausgeblendet.</p>
    <button type="button" class="list-editor-add" @click="add">{{ addLabel }}</button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  addLabel: { type: String, default: 'Eintrag hinzufügen' },
})
const emit = defineEmits(['update:modelValue'])

function update(index, value) {
  emit('update:modelValue', props.modelValue.map((entry, position) => (position === index ? value : entry)))
}
function remove(index) {
  emit('update:modelValue', props.modelValue.filter((_, position) => position !== index))
}
function add() {
  emit('update:modelValue', [...props.modelValue, ''])
}
</script>

<style scoped>
.list-editor { display: grid; gap: 7px; }
.list-editor-row { display: grid; grid-template-columns: 26px minmax(0, 1fr) 30px; align-items: center; gap: 8px; }
.list-editor-row > b { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; background: #e3f1f9; color: var(--brand-blue); font-size: 10px; }
.list-editor-row input { width: 100%; min-width: 0; padding: 9px 10px; border: 1px solid var(--border); border-radius: 9px; background: #f8fbfe; font: inherit; font-size: 12px; color: var(--text); outline: 0; }
.list-editor-row input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.list-editor-row > button { width: 28px; height: 28px; padding: 0; border: 1px solid var(--border); border-radius: 8px; background: #fff; color: var(--text-muted); font-size: 15px; line-height: 1; cursor: pointer; }
.list-editor-row > button:hover { border-color: #e85d4f; color: #e85d4f; }
.list-editor-empty { color: var(--text-muted); font-size: 10.5px; }
.list-editor-add { justify-self: start; padding: 8px 13px; border: 1px dashed var(--border-strong); border-radius: 9px; background: transparent; color: var(--brand-blue); font-size: 11px; font-weight: 850; cursor: pointer; }
.list-editor-add:hover { border-color: var(--brand-blue); background: var(--teal-50); }
</style>
