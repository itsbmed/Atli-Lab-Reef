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


  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { analysisApi, profileApi } from '@/services/toolsData'
import '@/assets/styles/report-base.css'
import '@/assets/styles/chronik.css'
import EmptyState from '@/components/ui/EmptyState.vue'


const profiles       = ref([])
const completedAnalyses = ref([])
const loading = ref(true)
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

