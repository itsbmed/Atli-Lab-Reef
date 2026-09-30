<template>
  <div v-if="history.length > 1" class="trend-panel">
    <div class="trend-filters">
      <label>
        <span>Zeitraum</span>
        <select v-model="period" :aria-label="`Zeitraum für ${parameter.label}`">
          <option v-for="option in PERIODS" :key="option.months ?? 'all'" :value="option.months">{{ option.label }}</option>
        </select>
      </label>
      <label>
        <span>Analysen</span>
        <select v-model="limit" :aria-label="`Anzahl Analysen für ${parameter.label}`">
          <option v-for="option in LIMITS" :key="option.count ?? 'all'" :value="option.count">{{ option.label }}</option>
        </select>
      </label>
      <small>{{ rangeLabel }}</small>
      <button v-if="isFiltered" type="button" class="trend-reset" @click="resetFilters">Zurücksetzen</button>
    </div>

    <div v-if="hasHistory" class="trend-chart">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="trend-empty">
      <strong>Zu wenige Messungen</strong>
      <span>In diesem Ausschnitt liegen weniger als zwei Analysen. Bitte den Zeitraum erweitern.</span>
    </div>
  </div>
  <div v-else class="trend-empty">
    <strong>Erste Messung</strong>
    <span>Der Verlauf entsteht mit dem nächsten Laborbericht.</span>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

const props = defineProps({
  parameter: { type: Object, required: true },
})

const PERIODS = [
  { months: 0, label: 'Alle' },
  { months: 24, label: '24 Monate' },
  { months: 12, label: '12 Monate' },
  { months: 6, label: '6 Monate' },
]
const LIMITS = [
  { count: 0, label: 'Alle' },
  { count: 12, label: 'Letzte 12' },
  { count: 6, label: 'Letzte 6' },
  { count: 3, label: 'Letzte 3' },
]

const period = ref(0)
const limit = ref(0)

const history = computed(() => props.parameter.history || [])
// Undated points keep their place; only real dates can fall outside the period.
const visibleHistory = computed(() => {
  const cutoff = period.value ? Date.now() - period.value * 30.44 * 86400000 : null
  const withinPeriod = cutoff === null
    ? history.value
    : history.value.filter((point) => !point.date || new Date(point.date).getTime() >= cutoff)
  return limit.value ? withinPeriod.slice(-limit.value) : withinPeriod
})
const hasHistory = computed(() => visibleHistory.value.length > 1)
const isFiltered = computed(() => Boolean(period.value || limit.value))
const rangeLabel = computed(() => {
  const shown = visibleHistory.value.length
  const total = history.value.length
  const measurements = `${shown} von ${total} ${total === 1 ? 'Messung' : 'Messungen'}`
  const first = visibleHistory.value.find((point) => point.date)?.date
  const last = [...visibleHistory.value].reverse().find((point) => point.date)?.date
  if (!first || !last || first === last) return measurements
  return `${measurements} · ${monthLabel(first)} – ${monthLabel(last)}`
})

function resetFilters() {
  period.value = 0
  limit.value = 0
}
function monthLabel(date) {
  return new Date(date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}
const bounds = computed(() => {
  const values = String(props.parameter.target || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(',', '.'))) || []
  return values.length >= 2 ? [values[0], values[1]] : [null, null]
})
const chartColor = computed(() => ({ critical: '#e85d4f', watch: '#f59e0b', good: '#0072ce' }[props.parameter.tone] || '#0072ce'))
const chartData = computed(() => {
  const [minimum, maximum] = bounds.value
  const labels = visibleHistory.value.map((point, index) => point.label || formatHistoryDate(point.date, index))
  const datasets = [{
    label: props.parameter.label,
    data: visibleHistory.value.map((point) => point.value),
    borderColor: chartColor.value,
    backgroundColor: `${chartColor.value}14`,
    fill: true,
    tension: 0.34,
    pointRadius: 4,
    pointHoverRadius: 5,
    pointBackgroundColor: '#fff',
    pointBorderColor: chartColor.value,
    pointBorderWidth: 2,
  }]
  if (minimum !== null && maximum !== null) {
    datasets.push(targetDataset('Untergrenze', minimum), targetDataset('Obergrenze', maximum))
  }
  return { labels, datasets }
})
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: { displayColors: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10, weight: '600' } } },
    y: { grid: { color: 'rgba(136,193,233,0.18)' }, ticks: { color: '#64748b', font: { size: 10 } } },
  },
}

function targetDataset(label, value) {
  return {
    label,
    data: visibleHistory.value.map(() => value),
    borderColor: 'rgba(16,185,129,0.48)',
    borderDash: [5, 5],
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
  }
}

function formatHistoryDate(date, index) {
  const isLatest = index === visibleHistory.value.length - 1 && visibleHistory.value.at(-1) === history.value.at(-1)
  if (!date) return isLatest ? 'Aktuell' : `Messung ${index + 1}`
  if (isLatest) return 'Aktuell'
  return new Date(date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}
</script>

<style scoped>
.trend-panel { display: grid; gap: 11px; }
.trend-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 9px; }
.trend-filters label { display: inline-flex; align-items: center; gap: 6px; }
.trend-filters span { color: var(--text-muted); font-size: 10px; font-weight: 850; letter-spacing: .07em; text-transform: uppercase; }
.trend-filters select { min-height: 32px; padding: 0 8px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); font: inherit; font-size: 11.5px; font-weight: 700; outline: 0; cursor: pointer; }
.trend-filters select:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.trend-filters > small { margin-left: auto; color: var(--text-muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.trend-reset { padding: 6px 10px; border: 1px solid var(--border); border-radius: 999px; background: #fff; color: var(--brand-blue); font-size: 10.5px; font-weight: 850; cursor: pointer; }
.trend-reset:hover { border-color: var(--brand-blue); background: var(--teal-50); }
.trend-chart { position: relative; width: 100%; height: 190px; }
.trend-empty { min-height: 110px; display: grid; place-content: center; gap: 4px; border: 1px dashed var(--border); border-radius: 13px; color: var(--text-muted); text-align: center; }
.trend-empty strong { color: var(--text); font-size: 13px; }
.trend-empty span { font-size: 11px; }
</style>
