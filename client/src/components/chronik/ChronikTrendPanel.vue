<template>
  <section class="tp">
    <article class="tp-card">
      <header class="tp-head">
        <div class="tp-title">
          <h3>{{ title }}</h3>
          <p>{{ modeHint }}</p>
        </div>
        <div class="tp-scale" role="radiogroup" aria-label="Skala">
          <button
            v-for="item in SCALE_MODES"
            :key="item.key"
            type="button"
            role="radio"
            :aria-checked="mode === item.key"
            :class="{ active: mode === item.key }"
            :disabled="!available.includes(item.key)"
            :title="!available.includes(item.key) ? 'Die gewählten Parameter haben verschiedene Einheiten – echte Werte passen nicht auf eine Achse.' : ''"
            @click="chooseMode(item.key)"
          >{{ item.label }}</button>
        </div>
      </header>

      <!-- Mehrere Aquarien: Farbe = Aquarium, Linienart = Parameter – ein Schlüssel statt einer Kachel je Linie. -->
      <div v-if="grouped" class="tp-key">
        <div class="tp-key-row">
          <span class="tp-key-label">Aquarien</span>
          <button
            v-for="tank in tanks" :key="tank.id" type="button"
            :class="{ off: groupHidden('tank', tank.id), dim: emphasisGroup && emphasisGroup !== `tank:${tank.id}` }"
            :aria-pressed="!groupHidden('tank', tank.id)"
            @click="toggleGroup('tank', tank.id)" @pointerenter="emphasisGroup = `tank:${tank.id}`" @pointerleave="emphasisGroup = ''" @focus="emphasisGroup = `tank:${tank.id}`" @blur="emphasisGroup = ''"
          ><i class="tp-swatch" :style="{ background: tank.color }"></i>{{ tank.name }}</button>
        </div>
        <div class="tp-key-row">
          <span class="tp-key-label">Parameter</span>
          <button
            v-for="(meta, index) in shownMetas" :key="meta.key" type="button"
            :class="{ off: groupHidden('param', meta.key), dim: emphasisGroup && emphasisGroup !== `param:${meta.key}` }"
            :aria-pressed="!groupHidden('param', meta.key)"
            @click="toggleGroup('param', meta.key)" @pointerenter="emphasisGroup = `param:${meta.key}`" @pointerleave="emphasisGroup = ''" @focus="emphasisGroup = `param:${meta.key}`" @blur="emphasisGroup = ''"
          >
            <LineKey :style-def="LINE_STYLES[index]" color="#4b5b6e" />
            {{ meta.label }}
          </button>
        </div>
      </div>

      <ul v-else-if="series.length > 1" class="tp-legend" aria-label="Linien – Klick blendet aus">
        <li v-for="line in series" :key="line.id">
          <button
            type="button"
            :class="{ off: hidden.has(line.id), dim: emphasisGroup && emphasisGroup !== line.id }"
            :aria-pressed="!hidden.has(line.id)"
            @click="toggle(line.id)"
            @pointerenter="emphasisGroup = line.id"
            @pointerleave="emphasisGroup = ''"
            @focus="emphasisGroup = line.id"
            @blur="emphasisGroup = ''"
          >
            <LineKey :style-def="line.style" :color="line.color" />
            {{ line.label }}
          </button>
        </li>
      </ul>

      <ChronikLineChart
        v-if="visibleSeries.length"
        :series="visibleSeries"
        :metas="shownMetas"
        :mode="mode"
        :domain="domain"
        :unit="unit"
        :emphasis="emphasisIds"
      />
      <p v-else class="tp-empty">Alle Linien ausgeblendet – oben in der Legende wieder einblenden.</p>

      <ul v-if="notes.length" class="tp-notes">
        <li v-for="note in notes" :key="note">{{ note }}</li>
      </ul>
    </article>

    <!-- Kennzahlen: eine Linie wie im ersten Diagramm als Kacheln, mehrere als Tabelle -->
    <div v-if="visibleSeries.length === 1 && singleStats" class="tp-tiles">
      <div v-for="tile in singleStats" :key="tile.label" class="tp-tile">
        <span>{{ tile.label }}</span>
        <strong>{{ tile.value }}</strong>
        <small>{{ tile.sub }}</small>
      </div>
    </div>
    <div v-else-if="visibleSeries.length > 1" class="tp-table-wrap">
      <table class="tp-table">
        <thead>
          <tr><th scope="col">Linie</th><th scope="col">Letzter Wert</th><th scope="col">Lage</th><th scope="col">Min</th><th scope="col">Max</th><th scope="col">Ø</th><th scope="col">Veränderung</th><th scope="col">Berichte</th></tr>
        </thead>
        <tbody>
          <tr v-for="row in tableRows" :key="row.line.id" :class="{ dim: emphasisIds.length && !emphasisIds.includes(row.line.id) }" @pointerenter="emphasisGroup = row.line.id" @pointerleave="emphasisGroup = ''">
            <th scope="row">
              <svg width="22" height="10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" :stroke="row.line.color" stroke-width="2.5" :stroke-dasharray="row.line.style.dash.join(' ')" stroke-linecap="round" /></svg>
              {{ row.line.label }}
            </th>
            <template v-if="row.stats">
              <td><strong>{{ formatReading(row.stats.last) }}</strong> <small>{{ row.line.meta.unit }}</small></td>
              <td :class="['pos', row.position]">{{ row.positionText }}</td>
              <td>{{ formatReading(row.stats.min) }}</td>
              <td>{{ formatReading(row.stats.max) }}</td>
              <td>{{ fmt(row.stats.avg) }}</td>
              <td>{{ formatChange(row.stats.change) }}</td>
              <td>{{ row.stats.count }}</td>
            </template>
            <td v-else colspan="7" class="muted">kein Messwert im Zeitraum</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { formatValue } from '@/services/chronik'
import { formatReading } from '@/services/targetGauge'
import { LINE_STYLES, SCALE_MODES, availableModes, buildSeries, chartParameters, defaultMode, describeOffset, formatChange, seriesStats, sharedUnit, targetPercent } from '@/services/chronikChart'
import ChronikLineChart from './ChronikLineChart.vue'
import LineKey from './ChronikLineKey.vue'

const props = defineProps({
  tanks: { type: Array, required: true }, // ausgewählt, Berichte im Zeitraum, mit Farbe
  metas: { type: Array, required: true },
  domain: { type: Array, required: true },
})

const fmt = (value) => formatValue(value)
const split = computed(() => chartParameters(props.metas, props.tanks.length))
const shownMetas = computed(() => split.value.shown)
const unit = computed(() => sharedUnit(shownMetas.value) || '')
const available = computed(() => availableModes(shownMetas.value))

// Die Skala folgt der Auswahl, bis man selbst eine wählt – und fällt zurück, wenn sie nicht mehr passt.
const mode = ref(defaultMode(shownMetas.value))
const chosen = ref(false)
watch(shownMetas, (metas) => {
  if (!chosen.value || !available.value.includes(mode.value)) { mode.value = defaultMode(metas); chosen.value = false }
})
function chooseMode(key) { mode.value = key; chosen.value = true }

const parameterSlots = ref({})
const series = computed(() => buildSeries({ tanks: props.tanks, metas: shownMetas.value, mode: mode.value, parameterSlots: parameterSlots.value }))
const hidden = ref(new Set())
const grouped = computed(() => props.tanks.length > 1 && shownMetas.value.length > 1)

// Hervorhebung: eine Linie, ein ganzes Aquarium („tank:id“) oder ein Parameter („param:key“).
const emphasisGroup = ref('')
const matches = (line, key) => key === line.id || key === `tank:${line.tank.id}` || key === `param:${line.meta.key}`
const emphasisIds = computed(() => (emphasisGroup.value ? series.value.filter((line) => matches(line, emphasisGroup.value)).map((line) => line.id) : []))
const groupIds = (kind, id) => series.value.filter((line) => (kind === 'tank' ? line.tank.id === id : line.meta.key === id)).map((line) => line.id)
const groupHidden = (kind, id) => groupIds(kind, id).every((lineId) => hidden.value.has(lineId))
function toggleGroup(kind, id) {
  const ids = groupIds(kind, id)
  const next = new Set(hidden.value)
  const show = ids.every((lineId) => next.has(lineId))
  for (const lineId of ids) show ? next.delete(lineId) : next.add(lineId)
  hidden.value = next
}
const visibleSeries = computed(() => series.value.filter((line) => !hidden.value.has(line.id)))
function toggle(id) {
  const next = new Set(hidden.value)
  next.has(id) ? next.delete(id) : next.add(id)
  hidden.value = next
}

const title = computed(() => {
  const metas = shownMetas.value
  const tankPart = props.tanks.length === 1 ? props.tanks[0].name : `${props.tanks.length} Aquarien`
  const paramPart = metas.length === 1 ? metas[0].label : metas.length === 2 ? `${metas[0].label} & ${metas[1].label}` : `${metas.length} Parameter`
  return `${paramPart} — Verlauf (${tankPart})`
})

const modeHint = computed(() => {
  if (mode.value === 'target') return 'Alle Parameter auf einer Skala: 0 % ist die untere, 100 % die obere Zielgrenze. Der echte Wert steht im Tooltip.'
  if (mode.value === 'change') return 'Jede Linie relativ zu ihrem ersten Bericht im Zeitraum – vergleichbar über alle Einheiten.'
  const many = shownMetas.value.length > 1
  return many ? `Echte Messwerte in ${unit.value}. Grün: der Zielbereich jedes Parameters.` : 'Echte Messwerte. Grün: der Zielbereich.'
})

const notes = computed(() => {
  const list = []
  if (split.value.hidden.length) {
    const why = props.tanks.length > 1 ? 'bei mehreren Aquarien trägt die Linienart den Parameter, vier sind unterscheidbar' : 'mehr als sechs Farben sind nicht unterscheidbar'
    list.push(`Nicht im Diagramm: ${split.value.hidden.map((meta) => meta.label).join(', ')} – ${why}. In der getrennten Darstellung sind alle zu sehen.`)
  }
  if (mode.value === 'target' && visibleSeries.value.some((line) => line.points.some((point) => point.clipped))) {
    list.push('▲ ▼ Werte weiter als vier Zielbreiten über bzw. zwei unter dem Ziel stehen am Rand; der echte Wert steht im Tooltip.')
  }
  if (mode.value === 'change') {
    const flat = visibleSeries.value.filter((line) => !line.indexable).map((line) => line.label)
    if (flat.length) list.push(`Ohne Veränderungslinie: ${flat.join(', ')} – der erste Wert ist 0 oder nicht nachweisbar.`)
  }
  if (series.value.every((line) => line.points.length <= 1)) list.push('Je Linie ein Bericht im Zeitraum – der Verlauf entsteht mit dem nächsten.')
  if (props.tanks.some((tank) => tank.color === '#9aa8b6')) list.push('Farben für bis zu sechs Aquarien – weitere erscheinen grau.')
  return list
})

const singleStats = computed(() => {
  const line = visibleSeries.value[0]
  const stats = line && seriesStats(line.points)
  if (!stats) return null
  const u = line.meta.unit
  return [
    { label: 'Minimum', value: formatReading(stats.min), sub: u },
    { label: 'Maximum', value: formatReading(stats.max), sub: u },
    { label: 'Durchschnitt', value: fmt(stats.avg), sub: `${u} · ${stats.count} ${stats.count === 1 ? 'Bericht' : 'Berichte'}` },
  ]
})

const tableRows = computed(() => visibleSeries.value.map((line) => {
  const stats = seriesStats(line.points)
  const percent = stats ? targetPercent(stats.last, line.meta.min, line.meta.max) : null
  return {
    line,
    stats,
    positionText: stats ? describeOffset(stats.last, line.meta) : '',
    position: percent === null ? '' : percent < 0 || percent > 100 ? 'off' : 'in',
  }
}))
</script>

<style scoped>
.tp { display: grid; gap: 16px; }
.tp-card { display: grid; gap: 14px; padding: 22px 24px 18px; border: 1px solid var(--border); border-radius: 20px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.04); }
.tp-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px 20px; }
.tp-title { min-width: 0; flex: 1 1 320px; }
.tp-title h3 { color: var(--text); font-size: 15px; font-weight: 700; }
.tp-title p { margin-top: 4px; color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }
.tp-scale { display: inline-flex; gap: 3px; padding: 3px; border-radius: 12px; background: #eef3f8; }
.tp-scale button { min-height: 34px; padding: 0 13px; border: 0; border-radius: 9px; background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.tp-scale button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 1px 3px rgba(10,27,67,0.12); }
.tp-scale button:disabled { color: #b4c0cc; cursor: not-allowed; }
.tp-scale button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }

.tp-key { display: grid; gap: 6px; }
.tp-key-row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.tp-key-label { min-width: 72px; color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.tp-key button { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 11px 0 9px; border: 1px solid #e1e8ef; border-radius: 999px; background: #fff; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s, background .15s; }
.tp-key button:hover { background: #f6f9fc; }
.tp-key button.dim { opacity: 0.45; }
.tp-key button.off { opacity: 0.4; text-decoration: line-through; }
.tp-key button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }
.tp-swatch { width: 14px; height: 4px; border-radius: 2px; }
.tp-legend { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.tp-legend button { display: inline-flex; align-items: center; gap: 8px; min-height: 32px; padding: 0 11px 0 8px; border: 1px solid #e1e8ef; border-radius: 999px; background: #fff; color: var(--text); font-size: 12px; font-weight: 600; cursor: pointer; transition: opacity .15s, background .15s; }
.tp-legend button:hover { background: #f6f9fc; }
.tp-legend button.dim { opacity: 0.45; }
.tp-legend button.off { opacity: 0.4; text-decoration: line-through; }
.tp-legend button:focus-visible { outline: none; box-shadow: var(--shadow-focus); }

.tp-empty { padding: 60px 0; color: var(--text-muted); font-size: 13px; text-align: center; }
.tp-notes { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.tp-notes li { color: #7a8899; font-size: 11.5px; line-height: 1.45; }

/* Wie die Kacheln unter dem ersten Chronik-Diagramm */
.tp-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 16px; }
.tp-tile { display: grid; justify-items: center; gap: 4px; padding: 20px; border: 1px solid var(--border); border-radius: 20px; background: #fff; text-align: center; }
.tp-tile span { color: var(--text-muted); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.tp-tile strong { color: var(--brand-blue); font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; }
.tp-tile small { color: var(--text-muted); font-size: 11px; }

.tp-table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
.tp-table { width: 100%; border-collapse: collapse; font-size: 12.5px; font-variant-numeric: tabular-nums; }
.tp-table th, .tp-table td { padding: 10px 14px; border-bottom: 1px solid #eef2f6; text-align: right; white-space: nowrap; }
.tp-table thead th { color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.tp-table th:first-child { text-align: left; }
.tp-table tbody th { color: var(--text); font-weight: 600; }
.tp-table tbody th svg { margin-right: 8px; vertical-align: middle; }
.tp-table tbody tr:last-child > * { border-bottom: 0; }
.tp-table tbody tr { transition: opacity .15s; }
.tp-table tbody tr.dim { opacity: 0.4; }
.tp-table td small { color: var(--text-muted); }
.tp-table td.pos.in { color: #047857; font-weight: 600; }
.tp-table td.pos.off { color: #b45309; font-weight: 600; }
.tp-table td.muted { color: var(--text-muted); text-align: left; }

@media (max-width: 600px) { .tp-card { padding: 18px 14px 14px; } }
</style>
