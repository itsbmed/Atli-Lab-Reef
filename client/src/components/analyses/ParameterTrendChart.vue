<template>
  <div v-if="hasHistory" class="trend-chart">
    <Line :data="chartData" :options="chartOptions" />
  </div>
  <div v-else class="trend-empty">
    <strong>Erste Messung</strong>
    <span>Der Verlauf entsteht mit dem nächsten Laborbericht.</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
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

const history = computed(() => props.parameter.history || [])
const hasHistory = computed(() => history.value.length > 1)
const bounds = computed(() => {
  const values = String(props.parameter.target || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((value) => Number(value.replace(',', '.'))) || []
  return values.length >= 2 ? [values[0], values[1]] : [null, null]
})
const chartColor = computed(() => ({ critical: '#e85d4f', watch: '#f59e0b', good: '#0072ce' }[props.parameter.tone] || '#0072ce'))
const chartData = computed(() => {
  const [minimum, maximum] = bounds.value
  const labels = history.value.map((point, index) => point.label || formatHistoryDate(point.date, index))
  const datasets = [{
    label: props.parameter.label,
    data: history.value.map((point) => point.value),
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
    data: history.value.map(() => value),
    borderColor: 'rgba(16,185,129,0.48)',
    borderDash: [5, 5],
    borderWidth: 1.5,
    pointRadius: 0,
    fill: false,
  }
}

function formatHistoryDate(date, index) {
  if (!date) return index === history.value.length - 1 ? 'Aktuell' : `Messung ${index + 1}`
  if (index === history.value.length - 1) return 'Aktuell'
  return new Date(date).toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}
</script>

<style scoped>
.trend-chart { position: relative; width: 100%; height: 190px; }
.trend-empty { min-height: 110px; display: grid; place-content: center; gap: 4px; border: 1px dashed var(--border); border-radius: 13px; color: var(--text-muted); text-align: center; }
.trend-empty strong { color: var(--text); font-size: 13px; }
.trend-empty span { font-size: 11px; }
</style>
