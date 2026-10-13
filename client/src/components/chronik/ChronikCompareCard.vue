<template>
  <article class="cc">
    <header class="cc-head">
      <span class="cc-symbol">{{ meta.symbol }}</span>
      <div class="cc-title">
        <h3>{{ meta.label }}</h3>
        <p>Ziel {{ format(meta.min) }}–{{ format(meta.max) }} {{ meta.unit }}</p>
      </div>
      <span :class="['cc-score', scoreTone]" :title="`${inTarget} von ${measured} Messwerten im Zielbereich`">
        <b>{{ inTarget }}/{{ measured }}</b> im Ziel
      </span>
    </header>

    <div class="cc-body" :style="{ '--lo': `${low}%`, '--hi': `${high}%` }">
      <div class="cc-axis" aria-hidden="true">
        <span class="cc-axis-label">Aquarium</span>
        <span ref="axis" class="cc-axis-track">
          <small v-for="label in axisLabels" :key="label.key" :class="{ zone: label.key === 'zone' }" :style="{ left: `${label.left}px` }">{{ label.text }}</small>
        </span>
        <span class="cc-axis-label cc-axis-value">Wert</span>
      </div>

      <ol class="cc-rows">
        <li v-for="row in rows" :key="row.tank.id" :class="['cc-row', `pos-${row.position}`, { dim: emphasis && emphasis !== row.tank.id, missing: !row.item }]">
          <RouterLink
            v-if="row.item"
            :to="`/analyses/${row.reportId}`"
            class="cc-link"
            :title="row.title"
            @pointerenter="$emit('emphasis', row.tank.id)"
            @pointerleave="$emit('emphasis', '')"
            @focus="$emit('emphasis', row.tank.id)"
            @blur="$emit('emphasis', '')"
          >
            <span class="cc-tank" :title="row.tank.name"><i :style="{ background: row.tank.color }"></i><span>{{ row.tank.name }}</span></span>
            <span class="cc-track">
              <span class="cc-zone"></span>
              <b class="cc-dot" :style="{ left: `${row.at}%` }"></b>
            </span>
            <span class="cc-value">
              <strong>{{ row.item.undetectable ? 'n. n.' : format(row.item.value) }}</strong>
              <small v-if="row.delta" :class="['cc-delta', row.delta.change > 0 ? 'up' : row.delta.change < 0 ? 'down' : 'flat']" :title="`Seit dem Bericht vom ${row.delta.sinceLabel}`">
                {{ row.delta.change > 0 ? '↑' : row.delta.change < 0 ? '↓' : '→' }} {{ row.delta.label }}
              </small>
              <small v-else class="cc-delta flat">{{ row.dateLabel }}</small>
            </span>
          </RouterLink>
          <div v-else class="cc-link">
            <span class="cc-tank" :title="row.tank.name"><i :style="{ background: row.tank.color }"></i><span>{{ row.tank.name }}</span></span>
            <span class="cc-track"><span class="cc-zone"></span></span>
            <span class="cc-value"><small class="cc-delta flat">nicht gemessen</small></span>
          </div>
        </li>
      </ol>
    </div>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { delta, formatDate, formatValue, position, sharedScale } from '@/services/chronik'
import { gaugePercent, layoutLabels, tickFormatter } from '@/services/targetGauge'
import { useElementWidth } from '@/composables/useElementWidth'

const props = defineProps({
  meta: { type: Object, required: true },
  tanks: { type: Array, required: true }, // { id, name, color, reports } – Berichte bereits im Zeitraum
  emphasis: { type: String, default: '' },
})
defineEmits(['emphasis'])

const axis = ref(null)
const axisWidth = useElementWidth(axis)

const latestItems = computed(() => props.tanks.map((tank) => {
  const report = [...tank.reports].reverse().find((item) => item.values[props.meta.key])
  return { tank, report, item: report?.values[props.meta.key] || null }
}))

const scale = computed(() => sharedScale(props.meta.min, props.meta.max, latestItems.value.map(({ item }) => item?.value)))
const low = computed(() => gaugePercent(props.meta.min, scale.value))
const high = computed(() => gaugePercent(props.meta.max, scale.value))
const tick = computed(() => tickFormatter(props.meta.min, props.meta.max))
const format = (value) => formatValue(value)

const rows = computed(() => latestItems.value.map(({ tank, report, item }) => {
  if (!item) return { tank, item: null, position: 'none' }
  const change = delta(tank.reports, props.meta.key)
  const at = item.undetectable ? 1.5 : gaugePercent(item.value, scale.value)
  const lab = item.tone === 'good' ? 'normal' : item.tone === 'critical' ? 'kritisch' : 'auffällig'
  return {
    tank,
    item,
    reportId: report.id,
    at,
    position: item.undetectable ? 'none' : position(item.value, props.meta.min, props.meta.max),
    dateLabel: formatDate(report.date),
    delta: change && {
      ...change,
      label: `${formatValue(Math.abs(change.change))}`,
      sinceLabel: formatDate(change.since),
    },
    title: `${tank.name}: ${item.undetectable ? 'nicht nachweisbar' : `${format(item.value)} ${props.meta.unit}`} · Bericht vom ${formatDate(report.date)} · Labor: ${lab}`,
  }
}))

const measured = computed(() => rows.value.filter((row) => row.item && !row.item.undetectable).length)
const inTarget = computed(() => rows.value.filter((row) => row.position === 'in').length)
const scoreTone = computed(() => (!measured.value ? 'none' : inTarget.value === measured.value ? 'good' : inTarget.value === 0 ? 'bad' : 'mixed'))

// Skala über allen Zeilen: Zielgrenzen zuerst, dann die Enden, zuletzt „Ziel“.
const axisLabels = computed(() => {
  if (!axisWidth.value) return []
  const width = (text) => text.length * 6.1 + 6
  const candidates = []
  const add = (key, text, at, priority, align, fallback) => candidates.push({ key, text, at, priority, align, fallback, width: width(text) })
  if (low.value > 0) add('min', tick.value(props.meta.min), low.value, 0, 'center', 'before')
  if (high.value < 100) add('max', tick.value(props.meta.max), high.value, 1, 'center', 'after')
  // Werte jenseits der gedehnten Skala sitzen am Rand – das Skalenende sagt es mit „<“ bzw. „>“.
  const values = latestItems.value.map(({ item }) => item?.value).filter(Number.isFinite)
  const under = values.some((value) => value < scale.value.start)
  const over = values.some((value) => value > scale.value.end)
  add('start', `${under ? '< ' : ''}${tick.value(scale.value.start)}`, 0, under ? -1 : 2, 'start')
  add('end', `${over ? '> ' : ''}${tick.value(scale.value.end)}`, 100, over ? -1 : 3, 'end')
  add('zone', 'Ziel', (low.value + high.value) / 2, 4, 'center')
  return layoutLabels(candidates, axisWidth.value, 6)
})
</script>

<style scoped>
.cc { display: grid; gap: 14px; min-width: 0; padding: 18px 20px 14px; border: 1px solid var(--border); border-radius: 18px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.04); }
.cc-head { display: grid; grid-template-columns: 42px minmax(0, 1fr) auto; align-items: center; gap: 12px; }
.cc-symbol { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--teal-50, #eef7fd); color: var(--brand-blue); font-size: 13px; font-weight: 700; }
.cc-title { min-width: 0; }
.cc-title h3 { overflow: hidden; color: var(--text); font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em; text-overflow: ellipsis; white-space: nowrap; }
.cc-title p { margin-top: 2px; color: var(--text-muted); font-size: 11.5px; font-variant-numeric: tabular-nums; }
.cc-score { padding: 5px 10px; border-radius: 999px; background: #f1f5f9; color: var(--text-muted); font-size: 11px; font-weight: 600; white-space: nowrap; }
.cc-score b { color: var(--text); font-weight: 800; font-variant-numeric: tabular-nums; }
.cc-score.good { background: #ecfdf5; color: #047857; }
.cc-score.good b { color: #047857; }
.cc-score.mixed { background: #fff7ed; color: #9a4d0a; }
.cc-score.mixed b { color: #9a4d0a; }
.cc-score.bad { background: #fef2f2; color: #b42318; }
.cc-score.bad b { color: #b42318; }

/* Spalten: Aquarium · Skala · Wert – gleich in Achse und Zeilen, damit alles fluchtet. */
.cc-body { --cols: minmax(96px, 1fr) minmax(120px, 2fr) 84px; display: grid; gap: 2px; }
.cc-axis, .cc-link { display: grid; grid-template-columns: var(--cols); align-items: center; gap: 14px; }
.cc-axis { padding: 0 8px 4px; }
.cc-axis-label { color: #94a3b8; font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.cc-axis-value { text-align: right; }
.cc-axis-track { position: relative; height: 12px; }
.cc-axis-track small { position: absolute; top: 0; color: var(--text-muted); font-size: 10.5px; line-height: 1; white-space: nowrap; font-variant-numeric: tabular-nums; }
.cc-axis-track small.zone { color: #2f855a; font-weight: 700; }

.cc-rows { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.cc-link { min-height: 48px; padding: 6px 8px; border-radius: 10px; color: inherit; text-decoration: none; transition: background .15s, opacity .15s; }
a.cc-link:hover, a.cc-link:focus-visible { background: #f4f8fc; outline: none; }
a.cc-link:focus-visible { box-shadow: var(--shadow-focus); }
.cc-row.dim .cc-link { opacity: 0.38; }
.cc-tank { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--text); font-size: 12.5px; font-weight: 600; }
.cc-tank span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-tank i { flex: none; width: 12px; height: 3px; border-radius: 2px; }

.cc-track { position: relative; height: 24px; }
.cc-track::before { position: absolute; top: 50%; right: 0; left: 0; height: 2px; border-radius: 2px; background: #e5ebf1; content: ''; transform: translateY(-50%); }
/* Die Zielspalte läuft ohne Unterbrechung durch alle Zeilen. */
.cc-zone { position: absolute; top: -10px; bottom: -10px; left: var(--lo); width: calc(var(--hi) - var(--lo)); background: rgba(16,185,129,0.11); box-shadow: inset 1px 0 0 rgba(16,185,129,0.4), inset -1px 0 0 rgba(16,185,129,0.4); }
.cc-row:first-child .cc-zone { top: -4px; border-radius: 6px 6px 0 0; }
.cc-row:last-child .cc-zone { bottom: -4px; border-radius: 0 0 6px 6px; }
.cc-dot { position: absolute; z-index: 1; left: 0; top: 50%; width: 14px; height: 14px; border-radius: 50%; transform: translate(-50%, -50%); transition: left .35s ease; }
.pos-in .cc-dot { border: 2px solid #fff; background: var(--brand-dark); box-shadow: 0 1px 4px rgba(10,27,67,0.3); }
.pos-near-low .cc-dot, .pos-near-high .cc-dot { border: 3px solid #e98a1c; background: #fff; }
.pos-far-low .cc-dot, .pos-far-high .cc-dot { border: 3px solid #e0503f; background: #fff; }
.pos-none .cc-dot { border: 2px dashed #94a3b8; background: #fff; }
.cc-row.missing .cc-track::before { background: repeating-linear-gradient(90deg, #e5ebf1 0 4px, transparent 4px 8px); }

.cc-value { display: grid; justify-items: end; gap: 1px; text-align: right; }
.cc-value strong { color: var(--text); font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.pos-none .cc-value strong { color: #94a3b8; }
.cc-delta { color: var(--text-muted); font-size: 10.5px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }
.cc-delta.flat { color: #94a3b8; font-weight: 500; }

/* Schmal: Name und Wert in einer Zeile, die Skala bekommt die volle Breite darunter. */
@media (max-width: 520px) {
  .cc { padding: 16px 14px 12px; }
  .cc-axis { grid-template-columns: 1fr; padding-bottom: 0; }
  .cc-axis-label { display: none; }
  .cc-link { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "tank value" "track track"; gap: 2px 10px; padding: 8px; }
  .cc-tank { grid-area: tank; }
  .cc-value { grid-area: value; display: flex; align-items: baseline; gap: 8px; }
  .cc-track { grid-area: track; }
  .cc-zone { top: 0; bottom: 0; }
  .cc-row:first-child .cc-zone, .cc-row:last-child .cc-zone { top: 0; bottom: 0; border-radius: 6px; }
}
@media (prefers-reduced-motion: reduce) { .cc-dot { transition: none; } }
</style>
