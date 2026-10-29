import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import * as aquariumStore from '@/services/aquariumStore'
import { aquariumApi, useBackendAuth } from '@/services/api'

// Aquarien-Store (Frontend). Hält die Aquarien des angemeldeten Nutzers
// reaktiv vor – im Backend-Modus über /api/aquariums, sonst aus dem
// lokalen Test-Speicher.
export const useAquariumsStore = defineStore('aquariums', () => {
  const items = ref([])

  const auth = useAuthStore()
  const ownerId = computed(() => auth.user?.id || null)
  const count = computed(() => items.value.length)
  const osmosisSources = computed(() => items.value.filter((a) => a.water_type === 'Osmosewasser'))

  function setItems(list) {
    items.value = list
    if (useBackendAuth) aquariumStore.setRemoteAquariums(list)
  }

  // Viele Seiten rufen load() beim Öffnen auf – gleichzeitige Anfragen teilen sich einen Request.
  let pending = null

  // Aquarien des angemeldeten Nutzers laden.
  function load() {
    if (!useBackendAuth) {
      setItems(aquariumStore.getAquariums(ownerId.value))
      return Promise.resolve(items.value)
    }
    if (!auth.isLoggedIn) {
      setItems([])
      return Promise.resolve(items.value)
    }
    pending ??= aquariumApi.list()
      .then(setItems)
      .catch(() => {})
      .finally(() => { pending = null })
    return pending.then(() => items.value)
  }

  function byId(id) {
    return items.value.find((a) => a.id === id) || aquariumStore.getAquarium(id)
  }

  async function create(data) {
    const aquarium = useBackendAuth
      ? await aquariumApi.create(data)
      : aquariumStore.addAquarium(ownerId.value, data)
    setItems([...items.value, aquarium])
    return aquarium
  }

  async function update(id, patch) {
    const updated = useBackendAuth
      ? await aquariumApi.update(id, patch)
      : aquariumStore.updateAquarium(id, patch)
    setItems(items.value.map((a) => (a.id === id ? updated : a)))
    return updated
  }

  async function remove(id) {
    if (!useBackendAuth) {
      aquariumStore.removeAquarium(id)
      setItems(items.value.filter((a) => a.id !== id))
      return
    }
    await aquariumApi.remove(id)
    // Das Backend entfernt auch Verknüpfungen anderer Becken auf dieses Profil – neu laden.
    setItems(await aquariumApi.list().catch(() => items.value.filter((a) => a.id !== id)))
  }

  return { items, count, osmosisSources, load, byId, create, update, remove }
})
