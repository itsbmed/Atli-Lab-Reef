import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as analysisStore from '@/services/analysisStore'

export const useAnalysesStore = defineStore('analyses', () => {
  const items = ref([])
  const favoriteParameters = ref([])
  const auth = useAuthStore()

  const ownerId = computed(() => auth.user?.id || null)
  const count = computed(() => items.value.length)

  function load() {
    items.value = analysisStore.getAnalyses(ownerId.value)
    favoriteParameters.value = analysisStore.getFavoriteParameters(ownerId.value)
  }

  function byId(id) {
    return items.value.find((a) => a.id === id) || analysisStore.getAnalysis(id)
  }

  function activate(data) {
    const analysis = analysisStore.activateAnalysis(ownerId.value, data)
    items.value = [analysis, ...items.value]
    return analysis
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
