<template>
  <div class="report-page trends-page">
    <header class="trends-header">
      <div>
        <span class="header-kicker">Werkzeuge · Verlauf</span>
        <h1>Trenddiagramme</h1>
        <p>Laborwerte über mehrere Analysen vergleichen und Veränderungen früh erkennen.</p>
      </div>
      <RouterLink to="/tools" class="btn btn-ghost">← Zurück zu Tools</RouterLink>
    </header>

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
      <div class="chart-heading">
        <div>
          <span>Ausgewählter Parameter</span>
          <h2 class="chart-title">{{ activeParameter.label }} im Verlauf</h2>
        </div>
        <strong>{{ activeUnit }}</strong>
      </div>
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
.trends-page { display: grid; gap: 18px; }
.trends-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 32px;
  border-radius: 26px;
  color: #fff;
  background: linear-gradient(112deg, rgba(10,27,67,.98), rgba(18,66,109,.92) 60%, rgba(0,114,206,.75)), url('/reeftech-pattern.jpg') center / cover;
  box-shadow: var(--shadow-md);
}
.header-kicker { display: block; margin-bottom: 7px; color: var(--brand-cyan); font-size: 10px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.trends-header h1 { margin: 0; font-size: clamp(31px, 4vw, 44px); line-height: 1; letter-spacing: -.045em; }
.trends-header p { max-width: 620px; margin-top: 9px; color: rgba(255,255,255,.7); font-size: 13px; line-height: 1.55; }
.trends-header .btn-ghost { flex: none; background: rgba(255,255,255,.1); border-color: rgba(255,255,255,.18); color: #fff; }
.controls { margin: 0; padding: 18px 20px; border-top: 3px solid var(--brand-blue); }
.controls-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: end; }
.controls-row .form-group { min-width: 0; margin: 0; }
.chart-card { padding: 24px; }
.chart-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.chart-heading span { display: block; color: var(--brand-blue); font-size: 10px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.chart-title { margin-top: 3px; color: var(--brand-navy); font-size: 20px; font-weight: var(--fw-heading-strong); letter-spacing: -.02em; }
.chart-heading > strong { padding: 7px 11px; border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: 11px; }
.chart-container { height: 360px; }
@media (max-width: 760px) {
  .trends-header { align-items: flex-start; flex-direction: column; padding: 25px 24px; }
  .controls-row { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .trends-header { border-radius: 22px; }
  .trends-header .btn { width: 100%; }
  .chart-card { padding: 18px; }
  .chart-container { height: 300px; }
}
</style>
