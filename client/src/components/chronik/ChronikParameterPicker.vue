<template>
  <div ref="root" class="pp">
    <button type="button" class="pp-trigger" :aria-expanded="open" aria-haspopup="dialog" @click="toggle">
      <span class="pp-trigger-label">Parameter</span>
      <b>{{ modelValue.length }}</b>
      <i aria-hidden="true">⌄</i>
    </button>

    <div v-if="open" class="pp-backdrop" @click="close"></div>
    <div v-if="open" class="pp-panel" role="dialog" aria-label="Parameter auswählen" @keydown.esc="close">
      <div class="pp-search">
        <input ref="search" v-model="query" type="search" placeholder="Element oder Symbol suchen…" aria-label="Parameter suchen" />
      </div>

      <div class="pp-sets" role="group" aria-label="Schnellauswahl">
        <button v-for="set in sets" :key="set.key" :class="{ hot: set.key === 'flagged' }" type="button" :disabled="!set.keys.length" :title="set.hint" @click="apply(set.keys)">
          <i v-if="set.key === 'flagged'" class="pp-flag" aria-hidden="true"></i>{{ set.label }} <small>{{ set.keys.length }}</small>
        </button>
      </div>

      <div class="pp-groups">
        <section v-for="group in filteredGroups" :key="group.key" class="pp-group">
          <header>
            <i :style="{ background: group.color }"></i>
            <strong>{{ group.label }}</strong>
            <button type="button" @click="toggleGroup(group)">{{ allIn(group) ? 'keine' : 'alle' }}</button>
          </header>
          <label v-for="item in group.items" :key="item.key" :class="{ on: selected.has(item.key), flagged: flagged.has(item.key) }">
            <input type="checkbox" :checked="selected.has(item.key)" @change="toggleKey(item.key)" />
            <span class="pp-symbol">{{ item.symbol }}</span>
            <span class="pp-name">{{ item.label }}</span>
            <i v-if="flagged.has(item.key)" class="pp-flag" title="In mindestens einem gewählten Aquarium außerhalb des Ziels"><span class="sr-only">außerhalb des Ziels</span></i>
          </label>
        </section>
        <p v-if="!filteredGroups.length" class="pp-empty">Kein Parameter passt zu „{{ query }}“.</p>
      </div>

      <footer class="pp-foot">
        <button type="button" class="pp-clear" :disabled="!modelValue.length" @click="$emit('update:modelValue', [])">Leeren</button>
        <span>{{ modelValue.length }} gewählt</span>
        <button type="button" class="pp-done" @click="close">Fertig</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Array, required: true },
  groups: { type: Array, required: true },
  sets: { type: Array, required: true }, // { key, label, keys, hint }
  flaggedKeys: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const query = ref('')
const search = ref(null)
const root = ref(null)
const selected = computed(() => new Set(props.modelValue))
const flagged = computed(() => new Set(props.flaggedKeys))

// Die Auswahl behält die Katalogreihenfolge – so stehen die Karten immer gleich.
const order = computed(() => props.groups.flatMap((group) => group.items.map((item) => item.key)))
const sorted = (keys) => order.value.filter((key) => keys.includes(key))

const filteredGroups = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!needle) return props.groups
  return props.groups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(needle) || item.symbol.toLowerCase() === needle || item.symbol.toLowerCase().startsWith(needle)) }))
    .filter((group) => group.items.length)
})

function toggle() { open.value ? close() : openPanel() }
async function openPanel() {
  open.value = true
  query.value = ''
  await nextTick()
  if (window.matchMedia('(pointer: fine)').matches) search.value?.focus()
}
function close() {
  open.value = false
  root.value?.querySelector('.pp-trigger')?.focus()
}
function toggleKey(key) {
  emit('update:modelValue', sorted(selected.value.has(key) ? props.modelValue.filter((item) => item !== key) : [...props.modelValue, key]))
}
function allIn(group) { return group.items.every((item) => selected.value.has(item.key)) }
function toggleGroup(group) {
  const keys = group.items.map((item) => item.key)
  emit('update:modelValue', sorted(allIn(group) ? props.modelValue.filter((key) => !keys.includes(key)) : [...new Set([...props.modelValue, ...keys])]))
}
function apply(keys) { emit('update:modelValue', sorted(keys)) }
</script>

<style scoped>
.pp { position: relative; }
.pp-trigger { display: inline-flex; align-items: center; gap: 8px; min-height: 42px; padding: 0 14px; border: 1px solid var(--border); border-radius: 12px; background: #fff; color: var(--text); font-size: 13px; font-weight: 700; cursor: pointer; }
.pp-trigger:hover, .pp-trigger[aria-expanded="true"] { border-color: var(--brand-blue); }
.pp-trigger:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.pp-trigger b { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 6px; border-radius: 999px; background: var(--brand-blue); color: #fff; font-size: 11px; }
.pp-trigger i { color: var(--text-muted); font-style: normal; }

.pp-backdrop { position: fixed; z-index: 40; inset: 0; }
.pp-panel { position: absolute; z-index: 41; top: calc(100% + 8px); left: 0; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto; width: min(560px, calc(100vw - 32px)); max-height: min(620px, 72vh); border: 1px solid var(--border); border-radius: 16px; background: #fff; box-shadow: 0 24px 60px rgba(10,27,67,0.2); }
.pp-search { padding: 14px 14px 10px; }
.pp-search input { width: 100%; min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; font-size: 13.5px; }
.pp-search input:focus { border-color: var(--brand-blue); outline: none; box-shadow: var(--shadow-focus); }

.pp-sets { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 14px 12px; border-bottom: 1px solid #eef2f6; }
.pp-sets button { display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 11px; border: 1px solid #dbe5ef; border-radius: 999px; background: #f6f9fc; color: var(--text); font-size: 12px; font-weight: 700; cursor: pointer; }
.pp-sets button .pp-flag { margin: 0; }
.pp-sets button small { color: var(--text-muted); font-weight: 600; }
.pp-sets button:hover:not(:disabled) { border-color: var(--brand-blue); background: var(--teal-50, #eef7fd); }
.pp-sets button:disabled { opacity: 0.45; cursor: default; }

.pp-groups { overflow-y: auto; padding: 6px 8px 10px; overscroll-behavior: contain; }
.pp-group header { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 10px 6px 6px; background: #fff; }
.pp-group header i { width: 7px; height: 7px; border-radius: 50%; }
.pp-group header strong { color: var(--text); font-size: 10.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.pp-group header button { margin-left: auto; padding: 4px 6px; border: 0; background: none; color: var(--brand-blue); font-size: 11.5px; font-weight: 700; cursor: pointer; }
.pp-group { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 4px; }
.pp-group header { grid-column: 1 / -1; }
.pp-group label { display: flex; align-items: center; gap: 9px; min-height: 38px; padding: 0 8px; border-radius: 9px; color: var(--text); font-size: 13px; cursor: pointer; }
.pp-group label:hover { background: #f4f8fc; }
.pp-group label.on { background: var(--teal-50, #eef7fd); }
.pp-group input { width: 16px; height: 16px; accent-color: var(--brand-blue); }
.pp-symbol { display: grid; place-items: center; flex: none; width: 28px; height: 22px; border-radius: 6px; background: #f1f5f9; color: var(--brand-blue); font-size: 10.5px; font-weight: 700; }
.pp-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pp-flag { flex: none; width: 7px; height: 7px; margin-left: auto; border-radius: 50%; background: #f59e0b; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.pp-empty { padding: 18px 10px; color: var(--text-muted); font-size: 13px; }

.pp-foot { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-top: 1px solid #eef2f6; }
.pp-foot span { margin-left: auto; color: var(--text-muted); font-size: 12px; }
.pp-clear { padding: 8px 4px; border: 0; background: none; color: var(--text-muted); font-size: 12.5px; font-weight: 700; cursor: pointer; }
.pp-clear:disabled { opacity: 0.4; cursor: default; }
.pp-done { min-height: 36px; padding: 0 16px; border: 0; border-radius: 10px; background: var(--brand-blue); color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; }

@media (max-width: 640px) {
  .pp-backdrop { background: rgba(10,27,67,0.35); }
  .pp-panel { position: fixed; top: auto; right: 0; bottom: 0; left: 0; width: auto; max-height: 82vh; border-radius: 18px 18px 0 0; }
  .pp-group { grid-template-columns: 1fr; }
}
</style>
