import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as analysisStore from '@/services/analysisStore'
import { analysisApi, useBackendAuth } from '@/services/api'

// Analysen-Store (Frontend). Im Backend-Modus über /api/analyses, sonst aus dem
// lokalen Test-Speicher. Favoriten bleiben vorerst im Browser.
export const useAnalysesStore = defineStore('analyses', () => {
  const items = ref([])
  const favoriteParameters = ref([])
  const auth = useAuthStore()

  const ownerId = computed(() => auth.user?.id || null)
  const count = computed(() => items.value.length)

  // Rohdaten aus dem Backend; items sind die angereicherten Berichte (analysisStore.js).
  let remote = []
  function setRemote(list) {
    remote = list
    analysisStore.setRemoteAnalyses(list)
    items.value = analysisStore.getAnalyses(ownerId.value)
  }

  // Viele Seiten rufen load() beim Öffnen auf – gleichzeitige Anfragen teilen sich einen Request.
  let pending = null

  function load() {
    favoriteParameters.value = analysisStore.getFavoriteParameters(ownerId.value)
    if (!useBackendAuth) {
      analysisStore.syncDemoAnalyses(ownerId.value)
      items.value = analysisStore.getAnalyses(ownerId.value)
      return Promise.resolve(items.value)
    }
    if (!auth.isLoggedIn) {
      setRemote([])
      return Promise.resolve(items.value)
    }
    pending ??= analysisApi.list()
      .then(setRemote)
      .catch(() => {})
      .finally(() => { pending = null })
    return pending.then(() => items.value)
  }

  function byId(id) {
    return items.value.find((a) => a.id === id) || analysisStore.getAnalysis(id, ownerId.value)
  }

  async function activate(data) {
    if (!useBackendAuth) {
      const analysis = analysisStore.activateAnalysis(ownerId.value, data)
      items.value = [analysis, ...items.value]
      return analysis
    }
    const created = await analysisApi.activate(data)
    setRemote([created, ...remote])
    return byId(created.id)
  }

  function isFavorite(parameterKey) {
    return favoriteParameters.value.includes(parameterKey)
  }

  function toggleFavorite(parameterKey) {
    const next = isFavorite(parameterKey)
      ? favoriteParameters.value.filter((key) => key !== parameterKey)
      : [...favoriteParameters.value, parameterKey]
    favoriteParameters.value = analysisStore.saveFavoriteParameters(ownerId.value, next)
  }

  return { items, count, favoriteParameters, load, byId, activate, isFavorite, toggleFavorite }
})
