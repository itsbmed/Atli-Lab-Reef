<template>
  <section class="cf" aria-labelledby="cf-title">
    <div class="cf-head">
      <h2 id="cf-title">Favoriten <small v-if="lists.length">{{ lists.length }}</small></h2>
      <p class="cf-start-line">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path :d="STAR" /></svg>
        Beim Öffnen: <strong>{{ startList ? startList.name : 'Voreinstellung' }}</strong>
      </p>
      <button v-if="!form" type="button" class="cf-add" :disabled="lists.length >= MAX_FAVORITES" :title="lists.length >= MAX_FAVORITES ? `Höchstens ${MAX_FAVORITES} Favoriten` : 'Aktuelle Auswahl als Favorit speichern'" @click="openNew">
        <span aria-hidden="true">+</span> Auswahl speichern
      </button>
    </div>

    <!-- Favoriten: ein Klick wechselt die Auswahl -->
    <div v-if="lists.length" class="cf-list" role="group" aria-label="Gespeicherte Favoriten">
      <button
        v-for="item in lists"
        :key="item.id"
        type="button"
        :class="['cf-pill', { on: activeId === item.id, start: item.id === modelValue.startId }]"
        :aria-pressed="activeId === item.id"
        :title="describe(item)"
        @click="apply(item)"
      >
        <svg v-if="item.id === modelValue.startId" class="cf-pill-star" viewBox="0 0 20 20" aria-label="Startansicht"><path :d="STAR" /></svg>
        <span class="cf-pill-copy">
          <strong>{{ item.name }}</strong>
          <small>
            <span v-if="item.tankIds" class="cf-tag tank">{{ countLabel(item.tankIds.length, 'Aquarium', 'Aquarien') }}</span>
            <span v-if="item.keys" class="cf-tag param">{{ countLabel(item.keys.length, 'Parameter', 'Parameter') }}</span>
          </small>
        </span>
      </button>
    </div>
    <p v-else-if="!form" class="cf-empty">
      Merken Sie sich Aquarien, Parameter oder beides unter einem Namen – etwa „Riffbecken · KH, Calcium, Magnesium“ – und wechseln Sie später mit einem Klick dorthin. Ein Favorit kann Ihre Startansicht sein.
    </p>

    <!-- Aktionen für den gewählten Favoriten -->
    <div v-if="active && !form" class="cf-bar">
      <template v-if="drifted">
        <span class="cf-bar-label changed">Auswahl geändert</span>
        <button type="button" @click="overwrite(active)">In „{{ active.name }}“ übernehmen</button>
        <button type="button" :disabled="lists.length >= MAX_FAVORITES" @click="openNew">Als neuen Favoriten speichern</button>
        <button type="button" @click="apply(active)">Zurück zu „{{ active.name }}“</button>
      </template>
      <template v-else>
        <span class="cf-bar-label">„{{ active.name }}“</span>
        <button v-if="active.id !== modelValue.startId" type="button" @click="setStart(active.id)">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path :d="STAR" /></svg>Als Startansicht
        </button>
        <button v-else type="button" @click="setStart('')">Startansicht aufheben</button>
        <button type="button" @click="openRename(active)">Umbenennen</button>
        <button type="button" class="danger" @click="remove(active)">Löschen</button>
      </template>
    </div>

    <!-- Speichern / Umbenennen -->
    <form v-if="form" class="cf-form" @submit.prevent="submit">
      <label class="cf-field">
        <span>Name</span>
        <input ref="nameInput" v-model="form.name" type="text" maxlength="40" :placeholder="suggestion" />
      </label>

      <fieldset v-if="form.mode === 'new'" class="cf-what">
        <legend>Was soll der Favorit merken?</legend>
        <label :class="['cf-check', { on: form.tanks }]">
          <input v-model="form.tanks" type="checkbox" />
          <span><strong>Aquarien</strong><small>{{ tankNames || 'keins gewählt' }}</small></span>
        </label>
        <label :class="['cf-check', { on: form.params }]">
          <input v-model="form.params" type="checkbox" />
          <span><strong>Parameter</strong><small>{{ keyNames || 'keiner gewählt' }}</small></span>
        </label>
        <p class="cf-what-hint">{{ whatHint }}</p>
      </fieldset>

      <label class="cf-start-check">
        <input v-model="form.start" type="checkbox" />
        Beim Öffnen der Chronik zeigen
      </label>

      <div class="cf-form-actions">
        <button type="submit" class="cf-primary" :disabled="!canSubmit">{{ form.mode === 'new' ? 'Speichern' : 'Übernehmen' }}</button>
        <button type="button" class="cf-ghost" @click="form = null">Abbrechen</button>
      </div>
    </form>

    <p v-if="notice" class="cf-notice" role="status">
      {{ notice.text }}
      <button v-if="notice.undo" type="button" @click="undo">Rückgängig</button>
    </p>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { MAX_FAVORITES, makeFavorite, matchesFavorite, suggestFavoriteName } from '@/services/chronik'

const props = defineProps({
  modelValue: { type: Object, required: true }, // { lists, startId }
  state: { type: Object, required: true }, // aktuelle Auswahl: tankIds, keys, view, layout, range
  tanks: { type: Array, required: true },
  labels: { type: Object, required: true }, // Parameterschlüssel → Bezeichnung
  initialId: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'apply'])

const STAR = 'M10 2.6l2.3 4.7 5.2.8-3.8 3.6.9 5.1L10 14.4l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8z'

const lists = computed(() => props.modelValue.lists)
const startList = computed(() => lists.value.find((item) => item.id === props.modelValue.startId) || null)

// Der zuletzt gewählte Favorit bleibt markiert; weicht die Auswahl ab, bieten wir Übernehmen an.
const currentId = ref(props.initialId)
const active = computed(() => lists.value.find((item) => item.id === currentId.value) || null)
const drifted = computed(() => Boolean(active.value) && !matchesFavorite(active.value, props.state))
const activeId = computed(() => {
  if (active.value && !drifted.value) return active.value.id
  return lists.value.find((item) => matchesFavorite(item, props.state))?.id || ''
})

const tankName = (id) => props.tanks.find((tank) => tank.id === id)?.name
const tankNames = computed(() => props.state.tankIds.map(tankName).filter(Boolean).join(', '))
const keyNames = computed(() => props.state.keys.map((key) => props.labels[key] || key).join(', '))

function countLabel(count, one, many) {
  return `${count} ${count === 1 ? one : many}`
}

function describe(item) {
  const parts = []
  if (item.tankIds) parts.push(`Aquarien: ${item.tankIds.map(tankName).filter(Boolean).join(', ') || '–'}`)
  if (item.keys) parts.push(`Parameter: ${item.keys.map((key) => props.labels[key] || key).join(', ')}`)
  if (!item.tankIds) parts.push('Aquarien bleiben wie gewählt')
  if (!item.keys) parts.push('Parameter bleiben wie gewählt')
  return parts.join('\n')
}

function commit(next, text, undoTo = null) {
  emit('update:modelValue', next)
  flash(text, undoTo && { data: undoTo, id: currentId.value })
}

function apply(item) {
  currentId.value = item.id
  emit('apply', item)
}

function setStart(id) {
  const name = lists.value.find((item) => item.id === id)?.name
  commit({ ...props.modelValue, startId: id }, id ? `„${name}“ ist jetzt Ihre Startansicht.` : 'Startansicht aufgehoben – beim Öffnen gilt wieder die Voreinstellung.')
}

function overwrite(item) {
  const updated = makeFavorite({ name: item.name, state: props.state, tanks: Boolean(item.tankIds), params: Boolean(item.keys), id: item.id })
  commit({ ...props.modelValue, lists: lists.value.map((entry) => (entry.id === item.id ? updated : entry)) }, `„${item.name}“ aktualisiert.`, props.modelValue)
}

function remove(item) {
  const before = props.modelValue
  commit({ lists: lists.value.filter((entry) => entry.id !== item.id), startId: before.startId === item.id ? '' : before.startId }, `„${item.name}“ gelöscht.`, before)
  currentId.value = ''
}

// Formular für neuen Favoriten oder neuen Namen
const form = ref(null)
const nameInput = ref(null)
const suggestion = computed(() => (form.value
  ? suggestFavoriteName(props.state, { tanks: props.tanks, labels: props.labels, includeTanks: form.value.tanks, includeKeys: form.value.params }) || 'Meine Auswahl'
  : ''))
const whatHint = computed(() => {
  if (!form.value) return ''
  if (form.value.tanks && form.value.params) return 'Merkt auch Ansicht, Darstellung und Zeitraum.'
  if (form.value.tanks) return 'Die Parameter bleiben beim Wechsel, wie Sie sie gerade gewählt haben.'
  if (form.value.params) return 'Gilt für die gerade gewählten Aquarien – praktisch als Parameterliste.'
  return 'Bitte mindestens eines wählen.'
})
const canSubmit = computed(() => {
  if (!form.value) return false
  if (form.value.mode === 'rename') return true
  return (form.value.tanks && props.state.tankIds.length) || (form.value.params && props.state.keys.length)
})

async function focusName() {
  await nextTick()
  nameInput.value?.focus()
  nameInput.value?.select()
}
function openNew() {
  form.value = { mode: 'new', name: '', tanks: props.state.tankIds.length > 0, params: props.state.keys.length > 0, start: !lists.value.length }
  focusName()
}
function openRename(item) {
  form.value = { mode: 'rename', id: item.id, name: item.name, start: item.id === props.modelValue.startId }
  focusName()
}

function submit() {
  if (!canSubmit.value) return
  const f = form.value
  const name = f.name.trim() || suggestion.value
  if (f.mode === 'new') {
    const created = makeFavorite({ name, state: props.state, tanks: f.tanks && props.state.tankIds.length > 0, params: f.params && props.state.keys.length > 0 })
    const startId = f.start ? created.id : props.modelValue.startId
    commit({ lists: [...lists.value, created], startId }, f.start ? `„${created.name}“ gespeichert – die Chronik öffnet ab jetzt damit.` : `„${created.name}“ gespeichert.`)
    currentId.value = created.id
  } else {
    const startId = f.start ? f.id : props.modelValue.startId === f.id ? '' : props.modelValue.startId
    commit({ lists: lists.value.map((entry) => (entry.id === f.id ? { ...entry, name: name.slice(0, 40) } : entry)), startId }, 'Gespeichert.')
  }
  form.value = null
}

const notice = ref(null)
let noticeTimer = null
function flash(text, undoTo = null) {
  notice.value = { text, undo: undoTo }
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => { notice.value = null }, undoTo ? 6000 : 3000)
}
function undo() {
  if (!notice.value?.undo) return
  emit('update:modelValue', notice.value.undo.data)
  currentId.value = notice.value.undo.id
  notice.value = null
}
</script>

<style scoped>
.cf { display: grid; gap: 10px; min-width: 0; }
.cf-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; }
.cf-head h2 { color: var(--text); font-size: 13px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.cf-head h2 small { margin-left: 6px; color: var(--text-muted); font-size: 12px; font-weight: 600; letter-spacing: 0; }
.cf-start-line { display: inline-flex; align-items: center; gap: 5px; min-width: 0; color: var(--text-muted); font-size: 12px; }
.cf-start-line svg { flex: none; width: 13px; height: 13px; fill: #f5b301; }
.cf-start-line strong { overflow: hidden; color: var(--text); font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.cf-add { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 6px 8px; border: 0; background: none; color: var(--brand-blue); font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.cf-add span { font-size: 16px; line-height: 1; }
.cf-add:disabled { color: #a8b4c2; cursor: default; }

.cf-list { display: flex; flex-wrap: wrap; gap: 8px; }
.cf-pill { display: inline-flex; align-items: center; gap: 9px; max-width: 280px; min-height: 50px; padding: 7px 14px 7px 12px; border: 1px solid var(--border); border-radius: 14px; background: #fff; color: inherit; text-align: left; cursor: pointer; transition: border-color .15s, background .15s, box-shadow .15s; }
.cf-pill:hover { border-color: #b9cde2; }
.cf-pill:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.cf-pill.on { border-color: var(--brand-blue); background: #f2f8fe; box-shadow: 0 0 0 1px var(--brand-blue) inset; }
.cf-pill-star { flex: none; width: 16px; height: 16px; fill: #f5b301; stroke: #e0a100; stroke-width: 1; stroke-linejoin: round; }
.cf-pill-copy { display: grid; gap: 3px; min-width: 0; }
.cf-pill-copy strong { overflow: hidden; color: var(--text); font-size: 13px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.cf-pill-copy small { display: flex; gap: 5px; }
.cf-tag { padding: 1px 7px; border-radius: 999px; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
.cf-tag.tank { background: #e8f2fc; color: #0b5fa8; }
.cf-tag.param { background: #eef0fb; color: #4b3fb3; }

.cf-empty { padding: 12px 14px; border: 1px dashed #c9d6e3; border-radius: 14px; background: #fbfcfe; color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }

.cf-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; padding: 6px 8px 6px 12px; border-radius: 12px; background: #f4f8fc; animation: cf-in .2s ease-out; }
.cf-bar-label { margin-right: 4px; color: var(--text); font-size: 12px; font-weight: 700; }
.cf-bar-label.changed { color: #9a4d0a; }
.cf-bar button { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border: 0; border-radius: 8px; background: none; color: var(--brand-blue); font-size: 12px; font-weight: 700; cursor: pointer; }
.cf-bar button:hover { background: #fff; }
.cf-bar button:disabled { color: #a8b4c2; cursor: default; }
.cf-bar button.danger { color: #b42318; }
.cf-bar button svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linejoin: round; }

.cf-form { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--border); border-radius: 16px; background: #fff; box-shadow: 0 10px 28px rgba(10,27,67,0.07); animation: cf-in .2s ease-out; }
.cf-field { display: grid; gap: 5px; max-width: 420px; }
.cf-field span, .cf-what legend { color: var(--text-muted); font-size: 11px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; }
.cf-field input { min-height: 40px; padding: 0 12px; border: 1px solid var(--border); border-radius: 10px; color: var(--text); font: inherit; font-size: 14px; }
.cf-field input:focus { border-color: var(--brand-blue); outline: none; box-shadow: var(--shadow-focus); }
.cf-what { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; min-width: 0; margin: 0; padding: 0; border: 0; }
.cf-what legend { margin-bottom: 6px; padding: 0; }
.cf-check { display: flex; align-items: flex-start; gap: 9px; min-width: 0; padding: 10px 12px; border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: border-color .15s, background .15s; }
.cf-check.on { border-color: color-mix(in srgb, var(--brand-blue) 55%, transparent); background: #f2f8fe; }
.cf-check input { flex: none; width: 16px; height: 16px; margin: 2px 0 0; accent-color: var(--brand-blue); }
.cf-check span { display: grid; gap: 2px; min-width: 0; }
.cf-check strong { color: var(--text); font-size: 13px; font-weight: 700; }
.cf-check small { overflow: hidden; color: var(--text-muted); font-size: 11.5px; text-overflow: ellipsis; white-space: nowrap; }
.cf-what-hint { grid-column: 1 / -1; color: var(--text-muted); font-size: 12px; }
.cf-start-check { display: inline-flex; align-items: center; gap: 8px; color: var(--text); font-size: 13px; font-weight: 600; cursor: pointer; }
.cf-start-check input { width: 16px; height: 16px; margin: 0; accent-color: #e0a100; }
.cf-form-actions { display: flex; gap: 8px; }
.cf-primary, .cf-ghost { min-height: 38px; padding: 0 16px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; }
.cf-primary { border: 0; background: var(--brand-blue); color: #fff; }
.cf-primary:disabled { opacity: .45; cursor: default; }
.cf-ghost { border: 1px solid var(--border); background: #fff; color: var(--text); }

.cf-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; color: #047857; font-size: 12px; font-weight: 600; }
.cf-notice button { padding: 0; border: 0; background: none; color: var(--brand-blue); font-size: 12px; font-weight: 700; text-decoration: underline; cursor: pointer; }
@keyframes cf-in { from { opacity: 0; transform: translateY(-3px); } to { opacity: 1; transform: none; } }

@media (max-width: 600px) {
  .cf-list { flex-wrap: nowrap; margin: 0 -16px; padding: 0 16px 4px; overflow-x: auto; scroll-snap-type: x mandatory; }
  .cf-pill { flex: none; max-width: 78%; scroll-snap-align: start; }
  .cf-start-line { order: 3; flex-basis: 100%; }
  .cf-what { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .cf-bar, .cf-form { animation: none; }
}
</style>
