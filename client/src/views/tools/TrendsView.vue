<template>
  <div class="report-page">
    <div class="page-header">
      <div class="page-title-row">
        <RouterLink to="/tools" class="btn btn-ghost btn-sm">← Tools</RouterLink>
        <h1>Trenddiagramme</h1>
      </div>
    </div>

    <div class="card controls">
      <div class="controls-row">
        <div class="form-group">
          <label for="trend-detail-profile">Aquarium</label>
          <select id="trend-detail-profile" v-model="selectedProfile">
            <option value="">Alle Aquarien</option>
            <option v-for="profile in profiles" :key="profile.id" :value="profile.id">{{ profile.name }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="trend-detail-parameter">Parameter</label>
          <select id="trend-detail-parameter" v-model="selectedParam">
            <option v-for="parameter in availableParams" :key="parameter.key" :value="parameter.key">{{ parameter.label }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="trend-detail-period">Zeitraum</label>
          <select id="trend-detail-period" v-model.number="selectedMonths">
            <option :value="3">Letzte 3 Monate</option>
            <option :value="6">Letzte 6 Monate</option>
            <option :value="12">Letzte 12 Monate</option>
            <option :value="0">Alle Analysen</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading" role="status">Daten werden geladen…</div>

    <EmptyState
      v-else-if="!series.length"
      kicker="Keine Trenddaten"
      title="Noch nicht genug Verlauf"
      message="Für diese Auswahl liegen keine abgeschlossenen Berichte mit dem gewählten Parameter vor. Wählen Sie einen anderen Zeitraum oder registrieren Sie eine Analyse."
      mark="TRD"
      tone="compact"
    >
      <template #actions>
        <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        <RouterLink to="/analyses" class="btn btn-ghost">Berichte ansehen</RouterLink>
      </template>
    </EmptyState>

    <div v-else class="card chart-card">
      <h2 class="chart-title">{{ activeParameter.label }} im Verlauf <span>{{ activeUnit }}</span></h2>
      <div class="chart-container" role="img" :aria-label="`${activeParameter.label} im zeitlichen Verlauf`">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { ELEMENT_DEFINITION_MAP } from '@/services/analysisCatalog'
import { buildAnalysisSeries } from '@/services/toolsCalculations'
import { profileApi, analysisApi } from '@/services/toolsData'
import '@/assets/styles/report-base.css'
import EmptyState from '@/components/ui/EmptyState.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const parameterKeys = ['calcium', 'magnesium', 'potassium', 'nitrate', 'phosphate', 'kh', 'salinity', 'iron', 'iodine', 'copper']
const availableParams = parameterKeys.map((key) => ELEMENT_DEFINITION_MAP[key]).filter(Boolean)
const profiles = ref([])
const allAnalyses = ref([])
const selectedProfile = ref('')
const selectedParam = ref('calcium')
const selectedMonths = ref(12)
const loading = ref(true)

const activeParameter = computed(() => ELEMENT_DEFINITION_MAP[selectedParam.value] || availableParams[0])
const filteredAnalyses = computed(() => selectedProfile.value
  ? allAnalyses.value.filter((analysis) => String(analysis.profile_id) === String(selectedProfile.value))
  : allAnalyses.value)
const series = computed(() => buildAnalysisSeries(filteredAnalyses.value, selectedParam.value, { months: selectedMonths.value }))
const activeUnit = computed(() => series.value[0]?.unit || activeParameter.value?.unit || '')

function formatDate(date) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: '2-digit' }).format(date)
}

const chartData = computed(() => {
  const values = series.value.map((point) => point.value)
  const minimum = series.value[0]?.minimum
  const maximum = series.value[0]?.maximum
  const datasets = [{
    label: activeParameter.value.label,
    data: values,
    borderColor: '#0072CE',
    backgroundColor: 'rgba(136,193,233,0.08)',
    borderWidth: 2.5,
    pointRadius: 5,
    pointBackgroundColor: '#fff',
    pointBorderColor: '#0072CE',
    pointBorderWidth: 2,
    fill: true,
    tension: 0.3,
  }]

  if (Number.isFinite(minimum) && Number.isFinite(maximum)) {
    datasets.push(
      { label: 'Zielbereich max.', data: values.map(() => maximum), borderColor: 'rgba(16,185,129,0.4)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: false },
      { label: 'Zielbereich min.', data: values.map(() => minimum), borderColor: 'rgba(16,185,129,0.4)', borderDash: [4, 4], borderWidth: 1, pointRadius: 0, fill: '-1', backgroundColor: 'rgba(16,185,129,0.05)' },
    )
  }

  return { labels: series.value.map((point) => formatDate(point.date)), datasets }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#5b7a99' } },
    y: { grid: { color: '#e9f1fb' }, ticks: { color: '#5b7a99' } },
  },
}

onMounted(async () => {
  try {
    const [loadedProfiles, loadedAnalyses] = await Promise.all([
      profileApi.aquariums(),
      analysisApi.list({ status: 'completed' }),
    ])
    profiles.value = loadedProfiles
    allAnalyses.value = loadedAnalyses
  } catch {
    profiles.value = []
    allAnalyses.value = []
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page-title-row { display: flex; align-items: center; gap: 12px; }
.controls { margin-bottom: 20px; }
.controls-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
.controls-row .form-group { min-width: 180px; margin: 0; }
.chart-card { padding: 28px; }
.chart-title { margin-bottom: 16px; color: var(--text); font-size: 18px; font-weight: var(--fw-bold); }
.chart-title span { margin-left: 5px; color: var(--text-muted); font-size: 12px; font-weight: var(--fw-medium); }
.chart-container { height: 360px; }
@media (max-width: 600px) {
  .page-title-row { align-items: flex-start; flex-direction: column; }
  .controls-row .form-group { width: 100%; min-width: 0; }
  .chart-card { padding: 18px; }
  .chart-container { height: 300px; }
}
</style>
