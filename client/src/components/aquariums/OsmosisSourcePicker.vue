<template>
  <section v-if="enabled" class="osmosis-link">
    <div class="osmosis-link-head">
      <div>
        <span>Osmosequelle</span>
        <strong>Quellwasser für dieses System</strong>
      </div>
      <RouterLink to="/aquariums/new" class="osmosis-add">Neu anlegen</RouterLink>
    </div>

    <div class="osmosis-control">
      <label class="water-field">
        <span>Verknüpfte Osmoseanlage / Osmosewasser</span>
        <select :value="form.osmosis_source_id || ''" @change="form.osmosis_source_id = $event.target.value">
          <option value="">Keine Osmosequelle verknüpfen</option>
          <option v-for="source in sources" :key="source.id" :value="source.id">
            {{ source.name }} · {{ source.net_volume || '—' }} L
          </option>
        </select>
      </label>

      <div v-if="selectedSource" class="osmosis-card">
        <span>{{ selectedSource.water_type }}</span>
        <strong>{{ selectedSource.name }}</strong>
        <em>{{ sourceMeta(selectedSource) }}</em>
      </div>
      <p v-else class="osmosis-empty">
        Diese Verknüpfung ist optional. Sie hilft später, Aquariumwerte mit dem verwendeten RO/DI-Wasser zusammen auszuwerten.
      </p>
    </div>
  </section>
</template>

<script setup>
import { computed, watch } from 'vue'
import { supportsOsmosisSource } from '@/services/aquariumStore'

const props = defineProps({
  form: { type: Object, required: true },
  sources: { type: Array, default: () => [] },
})

const enabled = computed(() => supportsOsmosisSource(props.form.water_type))
const selectedSource = computed(() => props.sources.find((source) => source.id === props.form.osmosis_source_id) || null)

watch(enabled, (isEnabled) => {
  if (!isEnabled) props.form.osmosis_source_id = ''
}, { immediate: true })

function sourceMeta(source) {
  const details = source.water_details || {}
  const parts = []
  if (details.ro_product) parts.push(details.ro_product)
  if (details.ro_capacity_lpd) parts.push(`${details.ro_capacity_lpd} l/Tag`)
  if (details.resin_filter) parts.push('Harzfilter')
  return parts.join(' · ') || 'RO/DI Quelle'
}
</script>

<style scoped>
.osmosis-link { display: grid; gap: 12px; padding: 14px; border-radius: 18px; background: rgba(14,116,144,0.08); border: 1px solid rgba(14,116,144,0.18); }
.osmosis-link-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.osmosis-link-head span,
.osmosis-link-head strong { display: block; }
.osmosis-link-head span { color: #0e7490; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.osmosis-link-head strong { margin-top: 3px; color: var(--text); font-size: 14px; font-weight: 800; }
.osmosis-add { flex-shrink: 0; color: var(--brand-blue); font-size: 12px; font-weight: 800; text-decoration: none; }
.osmosis-control { display: grid; gap: 10px; }
.water-field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.water-field span { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.water-field select { width: 100%; min-height: 46px; padding: 0 13px; border: 1px solid var(--border); border-radius: 13px; background: #fff; color: var(--text); font-size: 14px; outline: 0; }
.water-field select:focus { border-color: var(--teal-400); box-shadow: var(--shadow-focus); }
.osmosis-card { padding: 13px; border-radius: 16px; background: #fff; border: 1px solid rgba(14,116,144,0.18); }
.osmosis-card span,
.osmosis-card strong,
.osmosis-card em { display: block; }
.osmosis-card span { color: #0e7490; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.osmosis-card strong { margin-top: 4px; color: var(--text); font-size: 15px; font-weight: 800; }
.osmosis-card em,
.osmosis-empty { color: var(--text-muted); font-size: 12px; line-height: 1.45; font-style: normal; }
.osmosis-card em { margin-top: 4px; }
</style>
