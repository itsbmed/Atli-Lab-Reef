import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import * as analysisStore from '@/services/analysisStore'

export const useAnalysesStore = defineStore('analyses', () => {
  const items = ref([])
  const auth = useAuthStore()

  const ownerId = computed(() => auth.user?.id || null)
  const count = computed(() => items.value.length)

  function load() {
    items.value = analysisStore.getAnalyses(ownerId.value)
  }

  function byId(id) {
    return items.value.find((a) => a.id === id) || analysisStore.getAnalysis(id)
  }

  function activate(data) {
    const analysis = analysisStore.activateAnalysis(ownerId.value, data)
    items.value = [analysis, ...items.value]
    return analysis
  }

  return { items, count, load, byId, activate }
})
