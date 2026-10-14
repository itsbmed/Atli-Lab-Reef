<template>
  <div
    ref="frame"
    class="lc"
    tabindex="0"
    role="img"
    :aria-label="ariaLabel"
    @keydown="onKey"
    @blur="active = null"
  >
    <Line ref="chartRef" :data="chartData" :options="chartOptions" :plugins="plugins" />

    <div v-if="active" class="lc-tip" :style="tipStyle" role="status">
      <p class="lc-tip-date">{{ active.dateLabel }}</p>
      <ul>
        <li v-for="row in active.rows" :key="row.series.id" :class="{ stale: !row.exact, faded: emphasis.length && !emphasis.includes(row.series.id) }">
          <svg width="22" height="10" aria-hidden="true"><line x1="1" y1="5" x2="21" y2="5" :stroke="row.series.color" stroke-width="2.5" :stroke-dasharray="row.series.style.dash.join(' ')" stroke-linecap="round" /></svg>
          <span class="lc-tip-value">
            <strong>{{ row.text }}</strong>
            <em v-if="row.scaled">{{ row.scaled }}</em>
          </span>
          <span class="lc-tip-name">{{ row.series.label }}<template v-if="row.point && !row.exact"> · Stand {{ row.since }}</template></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, Filler, LineElement, LinearScale, PointElement } from 'chart.js'
import { formatDate, formatValue, valueAt } from '@/services/chronik'
import { describeOffset, formatChange } from '@/services/chronikChart'
import { formatReading } from '@/services/targetGauge'

ChartJS.register(LinearScale, PointElement, LineElement, Filler)

const props = defineProps({
  series: { type: Array, required: true }, // sichtbare Linien aus buildSeries
  metas: { type: Array, required: true },
  mode: { type: String, required: true }, // value | target | change
  domain: { type: Array, required: true },
  unit: { type: String, default: '' },
  emphasis: { type: Array, default: () => [] }, // hervorgehobene Linien; leer = alle gleich
})

const frame = ref(null)
const chartRef = ref(null)
const active = ref(null)
const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const DAY = 86400000
const times = computed(() => [...new Set(props.series.flatMap((line) => line.points.map((point) => point.time)))].sort((a, b) => a - b))

// Achse: die Berichtsdaten selbst, solange sie Platz haben (wie im ersten Diagramm);
// sonst Monatsanfänge bzw. bei kurzen Zeiträumen Wochen.
const tickMode = computed(() => {
  const [start, end] = props.domain
  const span = end - start
  const dates = times.value
  const roomy = dates.length <= 8 && dates.every((time, index) => !index || time - dates[index - 1] >= span / 9)
  if (roomy) return 'dates'
  return span > 75 * DAY ? 'months' : 'weeks'
})
const xTicks = computed(() => {
  const [start, end] = props.domain
  if (tickMode.value === 'dates') return times.value
  const ticks = []
  if (tickMode.value === 'months') {
    const cursor = new Date(start); cursor.setDate(1); cursor.setHours(0, 0, 0, 0)
    if (cursor.getTime() < start) cursor.setMonth(cursor.getMonth() + 1)
    while (cursor.getTime() <= end) { ticks.push(cursor.getTime()); cursor.setMonth(cursor.getMonth() + 1) }
  } else {
    for (let time = start + 3.5 * DAY; time <= end; time += 7 * DAY) ticks.push(time)
  }
  const every = Math.ceil(ticks.length / 8)
  return ticks.filter((_, index) => index % every === 0)
})
const tickLabel = (value) => {
  if (tickMode.value === 'months') return formatDate(value, 'month')
  if (tickMode.value === 'weeks') return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  return formatDate(value)
}

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

const chartData = computed(() => ({
  datasets: props.series.map((line) => {
    const dim = props.emphasis.length > 0 && !props.emphasis.includes(line.id)
    const color = dim ? rgba(line.color, 0.18) : line.color
    const single = props.series.length === 1
    return {
      label: line.label,
      data: line.points.map((point) => ({ x: point.time, y: point.y, point })),
      parsing: false,
      borderColor: color,
      backgroundColor: single ? rgba(line.color, 0.07) : 'transparent',
      fill: single ? 'start' : false,
      borderWidth: 2.5,
      borderDash: line.style.dash,
      tension: 0.3,
      spanGaps: false,
      pointRadius: (ctx) => (ctx.raw?.point?.clipped ? 7 : 5),
      pointHoverRadius: 7,
      pointStyle: (ctx) => (ctx.raw?.point?.clipped ? 'triangle' : line.style.point),
      rotation: (ctx) => (ctx.raw?.point?.clipped === 'low' ? 180 : 0),
      pointBackgroundColor: (ctx) => (ctx.raw?.point?.clipped ? color : '#fff'),
      pointBorderColor: color,
      pointBorderWidth: 2,
      order: dim ? 2 : 1,
    }
  }),
}))

const yLabel = (value) => {
  if (props.mode === 'target') return `${formatValue(value, 0)} %`
  if (props.mode === 'change') return formatChange(value)
  return formatValue(value)
}

// Die Achse fasst immer den Zielbereich (bzw. die Nulllinie) und alle Werte.
const yBounds = computed(() => {
  const values = props.series.flatMap((line) => line.points.map((point) => point.y)).filter(Number.isFinite)
  if (props.mode === 'target') return { suggestedMin: Math.min(-15, ...values), suggestedMax: Math.max(115, ...values) }
  if (props.mode === 'change') return { suggestedMin: Math.min(-5, ...values), suggestedMax: Math.max(5, ...values) }
  return { suggestedMin: Math.min(...props.metas.map((meta) => meta.min), ...values), suggestedMax: Math.max(...props.metas.map((meta) => meta.max), ...values) }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: reduceMotion ? false : { duration: 350 },
  layout: { padding: { top: 6, right: 8 } },
  interaction: { mode: 'nearest', intersect: false },
  events: ['mousemove', 'mouseout', 'touchstart', 'touchmove'],
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: {
      type: 'linear',
      min: props.domain[0],
      max: props.domain[1],
      grid: { display: false },
      border: { color: '#d5e0ea' },
      // Wenige Berichte: genau ihre Daten als Achsenbeschriftung, wie im ersten Diagramm.
      afterBuildTicks: (axis) => { axis.ticks = xTicks.value.map((value) => ({ value })) },
      ticks: { color: '#5b7a99', font: { size: 12 }, maxRotation: 0, autoSkip: true, autoSkipPadding: 18, callback: tickLabel },
    },
    y: {
      ...yBounds.value,
      grid: { color: '#e9f1fb' },
      border: { display: false },
      ticks: { color: '#5b7a99', font: { size: 12 }, maxTicksLimit: 8, callback: yLabel },
      title: { display: true, text: yTitle.value, color: '#7a8899', font: { size: 11, weight: '600' } },
    },
  },
}))

const yTitle = computed(() => {
  if (props.mode === 'target') return 'Lage im Zielbereich (%)'
  if (props.mode === 'change') return 'Veränderung (%)'
  return props.unit
})

// Zielbereich als Band mit gestrichelten Grenzen – wie im ersten Chronik-Diagramm.
const bandPlugin = {
  id: 'chronikBands',
  beforeDatasetsDraw(chart) {
    const { ctx, chartArea: area, scales: { y } } = chart
    if (!area) return
    const band = (low, high, alpha, label) => {
      const top = Math.max(area.top, y.getPixelForValue(high))
      const bottom = Math.min(area.bottom, y.getPixelForValue(low))
      if (bottom <= area.top || top >= area.bottom) return
      ctx.save()
      ctx.fillStyle = `rgba(16,185,129,${alpha})`
      ctx.fillRect(area.left, top, area.right - area.left, bottom - top)
      ctx.strokeStyle = 'rgba(16,185,129,0.45)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      for (const edge of [top, bottom]) {
        ctx.beginPath(); ctx.moveTo(area.left, edge); ctx.lineTo(area.right, edge); ctx.stroke()
      }
      if (label && bottom - top > 14) {
        ctx.setLineDash([])
        ctx.fillStyle = '#2f855a'
        ctx.font = '600 10.5px system-ui, -apple-system, sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText(label, area.right - 6, top + 13)
      }
      ctx.restore()
    }
    if (props.mode === 'target') band(0, 100, 0.09, 'Zielbereich')
    else if (props.mode === 'value') {
      const many = props.metas.length > 1
      for (const meta of props.metas) band(meta.min, meta.max, many ? 0.06 : 0.08, many ? `Ziel ${meta.symbol}` : 'Ziel')
    } else {
      const zero = y.getPixelForValue(0)
      ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(area.left, zero); ctx.lineTo(area.right, zero); ctx.stroke(); ctx.restore()
    }
  },
}

// Fadenkreuz auf dem nächsten Berichtsdatum.
const crosshairPlugin = {
  id: 'chronikCrosshair',
  afterDatasetsDraw(chart) {
    if (!active.value) return
    const { ctx, chartArea: area, scales: { x } } = chart
    const px = x.getPixelForValue(active.value.time)
    ctx.save(); ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(px, area.top); ctx.lineTo(px, area.bottom); ctx.stroke(); ctx.restore()
  },
  afterEvent(chart, args) {
    const { event } = args
    if (event.type === 'mouseout') { active.value = null; args.changed = true; return }
    if (!times.value.length || !['mousemove', 'touchstart', 'touchmove'].includes(event.type)) return
    const x = chart.scales.x
    const nearest = times.value.reduce((best, time) => (Math.abs(x.getPixelForValue(time) - event.x) < Math.abs(x.getPixelForValue(best) - event.x) ? time : best), times.value[0])
    if (active.value?.time !== nearest) { activate(nearest); args.changed = true }
  },
}
const plugins = [bandPlugin, crosshairPlugin]

function scaledText(point, meta) {
  if (!point || point.value === null) return ''
  if (props.mode === 'change') return formatChange(point.scaled)
  return describeOffset(point.value, meta)
}

function activate(time) {
  const chart = chartRef.value?.chart
  active.value = {
    time,
    px: chart ? chart.scales.x.getPixelForValue(time) : 0,
    width: chart?.width || 0,
    dateLabel: formatDate(time, 'long'),
    rows: props.series.map((line) => {
      const point = valueAt(line.points, time)
      const exact = !!point && Math.abs(point.time - time) < DAY / 2
      // Messwerte in Laborgenauigkeit: 409,73 gerundet auf 410 widerspräche „unter Ziel“.
      const text = !point ? '—' : point.undetectable ? 'n. n.' : `${formatReading(point.value)} ${line.meta.unit}`
      return { series: line, point, exact, since: point && formatDate(point.date), text, scaled: scaledText(point, line.meta) }
    }),
  }
  chart?.draw()
}

function onKey(event) {
  if (!times.value.length) return
  const index = active.value ? times.value.indexOf(active.value.time) : -1
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault()
    const next = event.key === 'ArrowRight' ? Math.min(times.value.length - 1, index + 1) : Math.max(0, index < 0 ? times.value.length - 1 : index - 1)
    activate(times.value[next])
  } else if (event.key === 'Escape') {
    active.value = null
    chartRef.value?.chart?.draw()
  }
}

const tipStyle = computed(() => {
  if (!active.value) return {}
  const { px, width } = active.value
  return px > width * 0.58 ? { right: `${width - px + 14}px` } : { left: `${px + 14}px` }
})

const ariaLabel = computed(() => {
  const lines = props.series.map((line) => {
    const last = line.points.filter((point) => point.value !== null).at(-1)
    return last ? `${line.label} zuletzt ${formatValue(last.value)} ${line.meta.unit}` : `${line.label} ohne Messwert`
  })
  return `Verlaufsdiagramm. ${lines.join('. ')}. Pfeiltasten wählen ein Berichtsdatum.`
})

</script>

<style scoped>
.lc { position: relative; height: 360px; border-radius: 12px; outline: none; }
.lc:focus-visible { box-shadow: var(--shadow-focus); }

.lc-tip { position: absolute; z-index: 3; top: 8px; min-width: 190px; max-width: 320px; padding: 10px 12px; border-radius: 12px; background: #fff; box-shadow: 0 10px 28px rgba(10,27,67,0.16), 0 0 0 1px rgba(10,27,67,0.06); pointer-events: none; }
.lc-tip-date { margin-bottom: 7px; color: var(--text-muted); font-size: 11px; font-weight: 700; }
.lc-tip ul { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.lc-tip li { display: grid; grid-template-columns: 22px auto; grid-template-areas: "key value" ". name"; column-gap: 8px; align-items: center; }
.lc-tip li svg { grid-area: key; }
.lc-tip-value { grid-area: value; display: flex; align-items: baseline; gap: 7px; }
.lc-tip-value strong { color: var(--text); font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.lc-tip-value em { color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: 600; }
.lc-tip-name { grid-area: name; overflow: hidden; color: var(--text-muted); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.lc-tip li.stale strong { color: #7a8899; font-weight: 600; }
.lc-tip li.faded { opacity: 0.45; }

@media (max-width: 600px) { .lc { height: 300px; } }
</style>
