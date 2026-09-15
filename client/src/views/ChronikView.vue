<template>
  <div class="report-page chronik-page">
    <div class="page-header">
      <h1>Chronik</h1>
    </div>

    <div v-if="loading" class="loading">Wird geladen…</div>

    <EmptyState
      v-else-if="!profiles.length"
      kicker="Noch keine Historie"
      title="Chronik startet mit Ihrem ersten Aquarium"
      message="Legen Sie ein Aquarium an und registrieren Sie anschließend ein Testkit. Nach den ersten Ergebnissen wird hier der Verlauf sichtbar."
      image-theme="freshwater"
    >
      <template #actions>
        <RouterLink to="/aquariums/new" class="btn btn-primary">Aquarium anlegen</RouterLink>
        <RouterLink to="/analyses/activate" class="btn btn-ghost">Analyse registrieren</RouterLink>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="!completedAnalyses.length"
      kicker="Warten auf Ergebnisse"
      title="Noch keine abgeschlossene Analyse"
      message="Die Chronik benötigt mindestens einen ausgewerteten Laborbericht. Laufende Analysen erscheinen hier, sobald Ergebnisse verfügbar sind."
      mark="TRD"
      tone="compact"
    >
      <template #actions>
        <RouterLink to="/analyses" class="btn btn-ghost">Analyseberichte ansehen</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
    <div class="card controls" style="margin-bottom:20px;padding:16px">
      <div class="controls-row">
        <div class="form-group" style="margin:0">
          <label>Aquarium</label>
          <select v-model="selectedProfile">
            <option value="">Alle Aquarien</option>
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group" style="margin:0">
          <label>Parameter</label>
          <select v-model="selectedParam">
            <option v-for="p in paramOptions" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="margin-bottom:20px">
      <h3 class="chart-title">{{ selectedParam }} — Verlauf ({{ selectedProfileName }})</h3>
      <div class="chart-wrap">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div class="grid-3">
      <div class="card stat-mini">
        <div class="stat-mini-label">Minimum</div>
        <div class="stat-mini-val">{{ chartMin }}</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-label">Maximum</div>
        <div class="stat-mini-val">{{ chartMax }}</div>
      </div>
      <div class="card stat-mini">
        <div class="stat-mini-label">Durchschnitt</div>
        <div class="stat-mini-val">{{ chartAvg }}</div>
      </div>
    </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
import { analysisApi, profileApi } from '@/services/toolsData'
import '@/assets/styles/report-base.css'
import '@/assets/styles/chronik.css'
import EmptyState from '@/components/ui/EmptyState.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const profiles       = ref([])
const completedAnalyses = ref([])
const loading = ref(true)
const selectedProfile = ref('')
const selectedParam  = ref('Calcium')

const paramOptions = ['Calcium', 'Magnesium', 'Alkalinität', 'Kalium', 'Nitrat', 'Phosphat', 'pH', 'Salinität', 'Eisen', 'Jod', 'Kupfer', 'Silikat']

const selectedProfileName = computed(() => {
  if (!selectedProfile.value) return 'Alle Aquarien'
  return profiles.value.find(p => String(p.id) === String(selectedProfile.value))?.name || ''
})

// Dummy historical data per parameter
const dummyData = {
  Calcium:     { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [415, 422, 431, 425], min: 380, max: 450 },
  Magnesium:   { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [1260, 1275, 1290, 1285], min: 1200, max: 1400 },
  Alkalinität: { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [7.8, 8.1, 8.4, 8.3], min: 7, max: 9.5 },
  Nitrat:      { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [6.0, 6.5, 12.5, 7.5], min: 1, max: 10 },
  Phosphat:    { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [0.06, 0.07, 0.18, 0.07], min: 0.01, max: 0.1 },
  pH:          { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [8.22, 8.24, 8.20, 8.25], min: 8.1, max: 8.4 },
  Salinität:   { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [35.0, 35.2, 35.1, 35.1], min: 33, max: 36 },
  Kalium:      { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [385, 390, 395, 392], min: 350, max: 420 },
  Eisen:       { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [0.004, 0.005, 0.006, 0.005], min: 0.001, max: 0.01 },
  Jod:         { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [0.038, 0.040, 0.041, 0.040], min: 0.03, max: 0.06 },
  Kupfer:      { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [0.001, 0.001, 0.001, 0.001], min: 0, max: 0.003 },
  Silikat:     { dates: ['28.11.23', '12.12.23', '10.02.24', '29.04.24'], values: [0.10, 0.11, 0.72, 0.12], min: 0, max: 0.5 },
}

const currentData = computed(() => dummyData[selectedParam.value] || dummyData.Calcium)

const chartData = computed(() => ({
  labels: currentData.value.dates,
  datasets: [
    {
      label: selectedParam.value,
      data: currentData.value.values,
      borderColor: '#0072CE',
      backgroundColor: 'rgba(136,193,233,0.07)',
      borderWidth: 2.5, fill: true, tension: 0.3,
      pointRadius: 5, pointBackgroundColor: '#fff',
      pointBorderColor: '#0072CE', pointBorderWidth: 2,
    },
    {
      label: 'Zielbereich max',
      data: currentData.value.dates.map(() => currentData.value.max),
      borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1,
      borderDash: [4, 4], pointRadius: 0, fill: false, tension: 0,
    },
    {
      label: 'Zielbereich min',
      data: currentData.value.dates.map(() => currentData.value.min),
      borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1,
      borderDash: [4, 4], pointRadius: 0, fill: '-1',
      backgroundColor: 'rgba(16,185,129,0.04)', tension: 0,
    },
  ]
}))

const chartOptions = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#5b7a99', font: { size: 12 } } },
    y: { grid: { color: '#e9f1fb' }, ticks: { color: '#5b7a99', font: { size: 12 } } },
  },
}

const chartMin = computed(() => { const v = currentData.value.values; return Math.min(...v) })
const chartMax = computed(() => { const v = currentData.value.values; return Math.max(...v) })
const chartAvg = computed(() => { const v = currentData.value.values; return (v.reduce((a, b) => a + b, 0) / v.length).toFixed(3) })

onMounted(async () => {
  try {
    const [profileRes, analysisRes] = await Promise.all([
      profileApi.list(),
      analysisApi.list({ status: 'completed' }),
    ])
    profiles.value = profileRes
    completedAnalyses.value = analysisRes
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.controls-row { display: flex; gap: 20px; flex-wrap: wrap; align-items: flex-end; }
.chart-title  { font-size: 15px; font-weight: var(--fw-label); color: var(--text); margin-bottom: 16px; }
.chart-wrap   { height: 320px; }
.stat-mini    { text-align: center; }
.stat-mini-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); font-weight: var(--fw-bold); }
.stat-mini-val   { font-size: 22px; font-weight: var(--fw-extra-bold); color: var(--teal-500); margin-top: 4px; }
</style>
