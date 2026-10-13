<template>
  <article class="tc">
    <header class="tc-head">
      <span class="tc-symbol">{{ meta.symbol }}</span>
      <div class="tc-title">
        <h3>{{ meta.label }}</h3>
        <p>{{ meta.unit }} · Ziel {{ format(meta.min) }}–{{ format(meta.max) }}</p>
      </div>
    </header>

    <div
      ref="frame"
      class="tc-frame"
      tabindex="0"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="onPointer"
      @pointerleave="active = null"
      @keydown="onKey"
      @blur="active = null"
    >
      <svg v-if="width" :width="width" :height="HEIGHT" :viewBox="`0 0 ${width} ${HEIGHT}`" aria-hidden="true">
        <!-- Zielbereich -->
        <rect :x="PAD.left" :y="y(meta.max)" :width="plotWidth" :height="Math.max(1, y(meta.min) - y(meta.max))" class="tc-band" />
        <line :x1="PAD.left" :x2="PAD.left + plotWidth" :y1="y(meta.max)" :y2="y(meta.max)" class="tc-band-edge" />
        <line :x1="PAD.left" :x2="PAD.left + plotWidth" :y1="y(meta.min)" :y2="y(meta.min)" class="tc-band-edge" />

        <!-- Achsen -->
        <g v-for="value in yTicks" :key="`y${value}`">
          <line :x1="PAD.left" :x2="PAD.left + plotWidth" :y1="y(value)" :y2="y(value)" class="tc-grid" />
          <text :x="PAD.left - 8" :y="y(value) + 3.5" text-anchor="end" class="tc-tick">{{ format(value) }}</text>
        </g>
        <line :x1="PAD.left" :x2="PAD.left + plotWidth" :y1="HEIGHT - PAD.bottom" :y2="HEIGHT - PAD.bottom" class="tc-axis" />
        <text v-for="tick in xTicks" :key="`x${tick.time}`" :x="x(tick.time)" :y="HEIGHT - PAD.bottom + 16" text-anchor="middle" class="tc-tick">{{ tick.label }}</text>

        <!-- Linien je Aquarium -->
        <g v-for="line in lines" :key="line.tank.id" :class="['tc-series', { dim: emphasis && emphasis !== line.tank.id }]">
          <path v-for="(segment, index) in line.segments" :key="index" :d="segment" :stroke="line.tank.color" class="tc-line" />
          <g v-for="point in line.points" :key="point.reportId">
            <circle v-if="point.undetectable" :cx="x(point.time)" :cy="HEIGHT - PAD.bottom - 5" r="4" :stroke="line.tank.color" class="tc-point-nn" />
            <circle v-else :cx="x(point.time)" :cy="y(point.value)" :r="point === line.points.at(-1) ? 5 : 4" :fill="line.tank.color" class="tc-point" />
          </g>
        </g>

        <!-- Fadenkreuz -->
        <g v-if="active">
          <line :x1="x(active.time)" :x2="x(active.time)" :y1="PAD.top" :y2="HEIGHT - PAD.bottom" class="tc-cross" />
          <template v-for="row in active.rows" :key="row.tank.id">
            <circle v-if="row.exact && !row.point.undetectable" :cx="x(active.time)" :cy="y(row.point.value)" r="6.5" :stroke="row.tank.color" class="tc-focus" />
          </template>
        </g>
      </svg>

      <div v-if="active" class="tc-tip" :style="tipStyle" role="status">
        <p class="tc-tip-date">{{ active.dateLabel }}</p>
        <ul>
          <li v-for="row in active.rows" :key="row.tank.id" :class="{ stale: !row.exact }">
            <i :style="{ background: row.tank.color }"></i>
            <strong>{{ row.point ? (row.point.undetectable ? 'n. n.' : `${format(row.point.value)}`) : '—' }}</strong>
            <span>{{ row.tank.name }}<template v-if="row.point && !row.exact"> · Stand {{ row.since }}</template></span>
          </li>
        </ul>
      </div>
    </div>

    <p v-if="sparse" class="tc-note">Je Aquarium ein Bericht im Zeitraum – die Linie entsteht mit dem nächsten.</p>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'
import { formatDate, formatValue, niceTicks, series, sharedScale, valueAt } from '@/services/chronik'
import { useElementWidth } from '@/composables/useElementWidth'

const props = defineProps({
  meta: { type: Object, required: true },
  tanks: { type: Array, required: true }, // { id, name, color, reports }
  domain: { type: Array, required: true }, // [start, end] in ms, für alle Diagramme gleich
  emphasis: { type: String, default: '' },
})

const HEIGHT = 196
const PAD = { top: 12, right: 14, bottom: 26, left: 52 }
const frame = ref(null)
const width = useElementWidth(frame)
const plotWidth = computed(() => Math.max(10, width.value - PAD.left - PAD.right))
const plotHeight = HEIGHT - PAD.top - PAD.bottom
const format = (value) => formatValue(value)

const allSeries = computed(() => props.tanks.map((tank) => ({ tank, points: series(tank.reports, props.meta.key) })))
const values = computed(() => allSeries.value.flatMap(({ points }) => points.map((point) => point.value)))
// Im Verlauf wird nichts abgeschnitten: die Achse fasst Zielbereich und jeden Wert.
const yDomain = computed(() => {
  const finite = values.value.filter(Number.isFinite)
  if (!finite.length) {
    const { start, end } = sharedScale(props.meta.min, props.meta.max, [])
    return [start, end]
  }
  const low = Math.min(props.meta.min, ...finite)
  const high = Math.max(props.meta.max, ...finite)
  const pad = (high - low || Math.abs(high) || 1) * 0.12
  return [props.meta.min >= 0 ? Math.max(0, low - pad) : low - pad, high + pad]
})
const yTicks = computed(() => niceTicks(...yDomain.value, 4).filter((value) => value >= yDomain.value[0] && value <= yDomain.value[1]))

const y = (value) => {
  const [start, end] = yDomain.value
  const clamped = Math.min(end, Math.max(start, value))
  return PAD.top + plotHeight - ((clamped - start) / (end - start || 1)) * plotHeight
}
const x = (time) => {
  const [start, end] = props.domain
  return PAD.left + ((time - start) / (end - start || 1)) * plotWidth.value
}

// Monatsstriche bei langen Zeiträumen, Wochenstriche bei kurzen; nie dichter als ~70px.
const xTicks = computed(() => {
  const [start, end] = props.domain
  const maxTicks = Math.max(2, Math.floor(plotWidth.value / 70))
  const days = (end - start) / 86400000
  const ticks = []
  if (days > 75) {
    const cursor = new Date(start); cursor.setDate(1); cursor.setHours(0, 0, 0, 0)
    if (cursor.getTime() < start) cursor.setMonth(cursor.getMonth() + 1)
    const months = []
    while (cursor.getTime() <= end) { months.push(cursor.getTime()); cursor.setMonth(cursor.getMonth() + 1) }
    const every = Math.ceil(months.length / maxTicks)
    months.forEach((time, index) => { if (index % every === 0) ticks.push({ time, label: formatDate(time, 'month') }) })
  } else {
    const step = Math.max(7, Math.ceil(days / maxTicks / 7) * 7) * 86400000
    for (let time = start + step / 2; time <= end; time += step) ticks.push({ time, label: new Date(time).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) })
  }
  return ticks
})

// Linien brechen an „n. n.“ ab – ohne Zahl gibt es nichts zu verbinden.
const lines = computed(() => allSeries.value.map(({ tank, points }) => {
  const segments = []
  let current = []
  for (const point of points) {
    if (point.value === null) { if (current.length > 1) segments.push(current); current = []; continue }
    current.push(`${x(point.time).toFixed(1)},${y(point.value).toFixed(1)}`)
  }
  if (current.length > 1) segments.push(current)
  return { tank, points, segments: segments.map((segment) => `M${segment.join('L')}`) }
}))

const sparse = computed(() => allSeries.value.every(({ points }) => points.length <= 1))

// Das Fadenkreuz rastet auf Berichtsdaten ein und zeigt jedes Aquarium mit seinem Stand.
const times = computed(() => [...new Set(allSeries.value.flatMap(({ points }) => points.map((point) => point.time)))].sort((a, b) => a - b))
const active = ref(null)
function activate(time) {
  active.value = {
    time,
    dateLabel: formatDate(time, 'long'),
    rows: allSeries.value.map(({ tank, points }) => {
      const point = valueAt(points, time)
      return { tank, point, exact: point && Math.abs(point.time - time) < 43200000, since: point && formatDate(point.date) }
    }),
  }
}
function onPointer(event) {
  if (!times.value.length) return
  const left = event.currentTarget.getBoundingClientRect().left
  const pointerX = event.clientX - left
  const nearest = times.value.reduce((best, time) => (Math.abs(x(time) - pointerX) < Math.abs(x(best) - pointerX) ? time : best), times.value[0])
  if (active.value?.time !== nearest) activate(nearest)
}
function onKey(event) {
  if (!times.value.length) return
  const index = active.value ? times.value.indexOf(active.value.time) : -1
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    const next = event.key === 'ArrowRight' ? Math.min(times.value.length - 1, index + 1) : Math.max(0, index < 0 ? times.value.length - 1 : index - 1)
    activate(times.value[next])
  } else if (event.key === 'Escape') active.value = null
}

const tipStyle = computed(() => {
  if (!active.value) return {}
  const px = x(active.value.time)
  const right = px > width.value * 0.6
  return right ? { right: `${width.value - px + 12}px` } : { left: `${px + 12}px` }
})

const ariaLabel = computed(() => {
  const parts = allSeries.value.map(({ tank, points }) => {
    const last = points.at(-1)
    return last ? `${tank.name} zuletzt ${last.undetectable ? 'nicht nachweisbar' : `${format(last.value)} ${props.meta.unit}`}` : `${tank.name} ohne Messwert`
  })
  return `${props.meta.label}, Verlauf. ${parts.join('. ')}. Pfeiltasten wählen ein Berichtsdatum.`
})
</script>

<style scoped>
.tc { display: grid; gap: 10px; min-width: 0; padding: 18px 18px 14px; border: 1px solid var(--border); border-radius: 18px; background: #fff; box-shadow: 0 1px 2px rgba(10,27,67,0.04); }
.tc-head { display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: 12px; }
.tc-symbol { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; background: var(--teal-50, #eef7fd); color: var(--brand-blue); font-size: 13px; font-weight: 700; }
.tc-title h3 { color: var(--text); font-size: 15.5px; font-weight: 700; letter-spacing: -0.01em; }
.tc-title p { margin-top: 2px; color: var(--text-muted); font-size: 11.5px; font-variant-numeric: tabular-nums; }

.tc-frame { position: relative; height: 196px; border-radius: 10px; outline: none; cursor: crosshair; }
.tc-frame:focus-visible { box-shadow: var(--shadow-focus); }
svg { display: block; overflow: visible; }
.tc-band { fill: rgba(16,185,129,0.10); }
.tc-band-edge { stroke: rgba(16,185,129,0.45); stroke-width: 1; }
.tc-grid { stroke: #edf1f5; stroke-width: 1; }
.tc-axis { stroke: #cfd8e2; stroke-width: 1; }
.tc-tick { fill: #7a8899; font-size: 10.5px; font-variant-numeric: tabular-nums; }
.tc-line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tc-point { stroke: #fff; stroke-width: 2; }
.tc-point-nn { fill: #fff; stroke-width: 2; stroke-dasharray: 2 2; }
.tc-series { transition: opacity .15s; }
.tc-series.dim { opacity: 0.18; }
.tc-cross { stroke: #94a3b8; stroke-width: 1; }
.tc-focus { fill: none; stroke-width: 2; }

.tc-tip { position: absolute; z-index: 3; top: 6px; min-width: 150px; max-width: 290px; padding: 9px 11px; border-radius: 11px; background: #fff; box-shadow: 0 8px 24px rgba(10,27,67,0.16), 0 0 0 1px rgba(10,27,67,0.06); pointer-events: none; }
.tc-tip-date { margin-bottom: 6px; color: var(--text-muted); font-size: 10.5px; font-weight: 700; }
.tc-tip ul { display: grid; gap: 4px; margin: 0; padding: 0; list-style: none; }
.tc-tip li { display: grid; grid-template-columns: 12px auto minmax(0, 1fr); align-items: baseline; gap: 7px; }
.tc-tip li i { width: 12px; height: 2px; border-radius: 1px; transform: translateY(-3px); }
.tc-tip li strong { color: var(--text); font-size: 12.5px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tc-tip li span { overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.tc-tip li.stale strong { color: #7a8899; font-weight: 600; }

.tc-note { color: #7a8899; font-size: 11px; line-height: 1.45; }
</style>
