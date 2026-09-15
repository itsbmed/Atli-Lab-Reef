import { useAquariumsStore } from '@/stores/aquariums'
import { useAnalysesStore } from '@/stores/analyses'
import { useAuthStore } from '@/stores/auth'

// Adapt the local stores to the workbench's profile and analysis fields.
export const profileApi = {
  async list() {
    if (!useAuthStore().isLoggedIn) return []
    const store = useAquariumsStore()
    store.load()
    return store.items
  },
  async aquariums() {
    return (await this.list()).filter((profile) => !['Osmosewasser', 'Meersalz'].includes(profile.water_type))
  },
  async osmosisSources() {
    return (await this.list()).filter((profile) => profile.water_type === 'Osmosewasser')
  },
  async saltSources() {
    return (await this.list()).filter((profile) => profile.water_type === 'Meersalz')
  },
}

export const analysisApi = {
  async list({ profile_id, status } = {}) {
    const store = useAnalysesStore()
    store.load()
    return store.items
      .filter((item) => (!profile_id || String(item.aquariumId) === String(profile_id))
        && (!status || item.status === status))
      .map((item) => ({ ...item, profile_id: item.aquariumId, created_at: item.createdAt }))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  },
}
