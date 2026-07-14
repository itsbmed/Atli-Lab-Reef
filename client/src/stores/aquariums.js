import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as aquariumStore from '@/services/aquariumStore'

// Aquarien-Store (Frontend). Kapselt den lokalen Test-Speicher und hält
// die Aquarien des angemeldeten Nutzers reaktiv vor.
export const useAquariumsStore = defineStore('aquariums', () => {
  const items = ref([])

  const auth = useAuthStore()
  const ownerId = computed(() => auth.user?.id || null)
  const count = computed(() => items.value.length)
  const osmosisSources = computed(() => items.value.filter((a) => a.water_type === 'Osmosewasser'))

  // Aquarien des angemeldeten Nutzers laden.
  function load() {
    items.value = aquariumStore.getAquariums(ownerId.value)
  }

  function byId(id) {
    return items.value.find((a) => a.id === id) || aquariumStore.getAquarium(id)
  }

  function create(data) {
    const aquarium = aquariumStore.addAquarium(ownerId.value, data)
    items.value.push(aquarium)
    return aquarium
  }

  function update(id, patch) {
    const updated = aquariumStore.updateAquarium(id, patch)
    const i = items.value.findIndex((a) => a.id === id)
    if (i !== -1) items.value[i] = updated
    return updated
  }

  function remove(id) {
    aquariumStore.removeAquarium(id)
    items.value = items.value.filter((a) => a.id !== id)
  }

  return { items, count, osmosisSources, load, byId, create, update, remove }
})
