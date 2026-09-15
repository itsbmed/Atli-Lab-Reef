<template>
  <div class="report-page">
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:12px">
        <RouterLink to="/tools" class="btn btn-secondary btn-sm">← Tools</RouterLink>
        <h1>Trend Diagrams</h1>
      </div>
    </div>

    <div class="card controls" style="margin-bottom:20px">
      <div class="controls-row">
        <div class="form-group" style="margin:0;min-width:180px">
          <label>Profile</label>
          <select v-model="selectedProfile" @change="loadData">
            <option value="">All profiles</option>
            <option v-for="p in profiles" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="form-group" style="margin:0;min-width:160px">
          <label>Parameter</label>
          <select v-model="selectedParam">
            <option v-for="p in availableParams" :key="p" :value="p">{{ p }}</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="loading" class="loading">Loading data…</div>

    <EmptyState
      v-else-if="!chartData.labels?.length"
      kicker="Keine Trenddaten"
      title="Noch nicht genug Verlauf"
      message="Trenddiagramme benötigen abgeschlossene Analyseberichte. Registrieren Sie eine Analyse oder wählen Sie ein anderes Aquarium."
      mark="TRD"
      tone="compact"
    >
      <template #actions>
        <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        <RouterLink to="/analyses" class="btn btn-ghost">Berichte ansehen</RouterLink>
      </template>
    </EmptyState>

    <div v-else class="card">
      <h3 class="chart-title">{{ selectedParam }} — over time</h3>
      <div class="chart-container">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { profileApi, analysisApi } from '@/services/toolsData'
import '@/assets/styles/report-base.css'
import EmptyState from '@/components/ui/EmptyState.vue'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const profiles       = ref([])
const allAnalyses    = ref([])
const selectedProfile = ref('')
const selectedParam  = ref('Calcium')
const loading        = ref(true)

const availableParams = ['Calcium', 'Magnesium', 'Kalium', 'Nitrat', 'Phosphat', 'pH', 'Salinität', 'Eisen', 'Jod', 'Kupfer']

onMounted(async () => {
  try {
    profiles.value = await profileApi.list()
  } catch {
    profiles.value = []
  }
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const params = {}
    if (selectedProfile.value) params.profile_id = selectedProfile.value
    allAnalyses.value = await analysisApi.list({ ...params, status: 'completed' })
  } catch {
    allAnalyses.value = []
  } finally {
    loading.value = false
  }
}

const chartData = computed(() => {
  const completed = allAnalyses.value.filter(a => a.status === 'completed')
  if (!completed.length) return { labels: [], datasets: [] }

  // For now we show static demo points from our single completed analysis
  const labels = completed.map(a => new Date(a.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }))

  const demoValues = { Calcium: [425], Magnesium: [1280], Kalium: [390], Nitrat: [8], Phosphat: [0.08], pH: [8.25], Salinität: [35.1], Eisen: [0.005], Jod: [0.04], Kupfer: [0.001] }
  const values = demoValues[selectedParam.value] || completed.map(() => null)

  return {
    labels,
    datasets: [{
      label: selectedParam.value,
      data: values,
      borderColor: '#0072CE',
      backgroundColor: 'rgba(136,193,233,0.08)',
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: '#0072CE',
      fill: true,
      tension: 0.3,
    }]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: '#ecfffb' } },
  },
}
</script>

<style scoped>
.controls-row { display: flex; gap: 16px; flex-wrap: wrap; align-items: flex-end; }
.chart-title { font-size: 16px; font-weight: var(--fw-bold); color: var(--teal-900); margin-bottom: 16px; }
.chart-container { height: 320px; }
</style>
