<template>
  <div class="aqd">
    <RouterLink to="/aquariums" class="back-link">← Zurück zu den Aquarien</RouterLink>

    <div v-if="!aquarium" class="aqd-missing">
      <h2>Aquarium nicht gefunden</h2>
      <p>Dieses Aquarium existiert nicht (mehr).</p>
      <RouterLink to="/aquariums" class="btn btn-primary">Zur Übersicht</RouterLink>
    </div>

    <template v-else>
      <section class="aqd-hero">
        <div :class="`aqd-hero-thumb ${aquarium.image_theme}`"></div>
        <div class="aqd-hero-copy">
          <span class="aqd-hero-badge">{{ aquarium.water_type }}</span>
          <h1>{{ aquarium.name }}</h1>
          <p>{{ aquarium.net_volume ? `${aquarium.net_volume} L` : 'Volumen offen' }}<template v-if="aquarium.aquarium_type"> · {{ aquarium.aquarium_type }}</template></p>
          <span class="aqd-hero-date">Angelegt: {{ formatDate(aquarium.createdAt) }}</span>
        </div>
      </section>

      <div class="aqd-grid">
        <div class="aqd-fact"><span>Wassertyp</span><strong>{{ aquarium.water_type }}</strong></div>
        <div class="aqd-fact"><span>Nettovolumen</span><strong>{{ aquarium.net_volume ? `${aquarium.net_volume} L` : '—' }}</strong></div>
        <div class="aqd-fact"><span>Beckentyp</span><strong>{{ aquarium.aquarium_type || '—' }}</strong></div>
        <div class="aqd-fact"><span>Maße</span><strong>{{ aquarium.dimensions || '—' }}</strong></div>
        <div class="aqd-fact"><span>Zielwerte</span><strong>{{ targetLabel }}</strong></div>
        <div class="aqd-fact"><span>Besatzdichte</span><strong>{{ aquarium.stocking_density || '—' }}</strong></div>
        <div class="aqd-fact"><span>Beleuchtung</span><strong>{{ aquarium.lighting_type || '—' }}</strong></div>
        <div class="aqd-fact"><span>Versorgungssystem</span><strong>{{ aquarium.supply_system || '—' }}</strong></div>
      </div>

      <div class="aqd-tech">
        <span class="aqd-section-label">Technik</span>
        <div class="aqd-chips">
          <span v-if="aquarium.sump" class="aqd-chip">Technikbecken</span>
          <span v-if="aquarium.refugium" class="aqd-chip">Algenrefugium</span>
          <span v-if="aquarium.skimmer" class="aqd-chip">Eiweißabschäumer<template v-if="aquarium.skimmer_model"> · {{ aquarium.skimmer_model }}</template></span>
          <span v-if="!aquarium.sump && !aquarium.refugium && !aquarium.skimmer" class="aqd-chip aqd-chip-muted">Keine Angaben</span>
        </div>
      </div>

      <div v-if="aquarium.notes" class="aqd-notes">
        <span class="aqd-section-label">Notizen</span>
        <p>{{ aquarium.notes }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAquariumsStore } from '@/stores/aquariums'

const route = useRoute()
const aquariums = useAquariumsStore()
onMounted(() => { if (!aquariums.items.length) aquariums.load() })

const aquarium = computed(() => aquariums.byId(route.params.id))

const TARGET_LABELS = { ati: 'ATI Empfehlung', natural: 'Natürliches Meerwasser', custom: 'Eigene Zielwerte' }
const targetLabel = computed(() => TARGET_LABELS[aquarium.value?.target_mode] || '—')

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.back-link { display: inline-flex; margin-bottom: 16px; color: var(--text-muted); font-size: 13px; font-weight: var(--fw-semibold); text-decoration: none; }
.back-link:hover { color: var(--brand-blue); }

.aqd-missing { max-width: 460px; margin: 40px auto; text-align: center; }
.aqd-missing h2 { font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
.aqd-missing p { color: var(--text-muted); margin-bottom: 20px; }

.aqd-hero { display: flex; gap: 22px; align-items: stretch; margin-bottom: 22px; padding: 20px; border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aqd-hero-thumb { width: 180px; flex-shrink: 0; border-radius: 18px; background: linear-gradient(150deg, var(--brand-blue), #0a1b43); }
.aqd-hero-thumb.reef-mixed { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.aqd-hero-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.aqd-hero-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.aqd-hero-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }
.aqd-hero-copy { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.aqd-hero-badge { align-self: flex-start; padding: 4px 11px; border-radius: 999px; background: rgba(136,193,233,0.16); color: var(--brand-blue); font-size: 11px; font-weight: 800; }
.aqd-hero-copy h1 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
.aqd-hero-copy p { color: var(--text-muted); font-size: 15px; }
.aqd-hero-date { color: var(--text-muted); font-size: 12px; }

.aqd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 12px; margin-bottom: 22px; }
.aqd-fact { padding: 16px; border-radius: 16px; background: #fff; border: 1px solid var(--border); display: flex; flex-direction: column; gap: 5px; }
.aqd-fact span { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--text-muted); }
.aqd-fact strong { font-size: 15px; font-weight: 700; color: var(--text); }

.aqd-section-label { display: block; margin-bottom: 10px; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--brand-blue); }
.aqd-tech { margin-bottom: 22px; }
.aqd-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.aqd-chip { padding: 8px 14px; border-radius: 999px; background: rgba(136,193,233,0.12); border: 1px solid rgba(136,193,233,0.24); color: var(--brand-blue); font-size: 13px; font-weight: 700; }
.aqd-chip-muted { background: none; border-color: var(--border); color: var(--text-muted); }

.aqd-notes { padding: 18px; border-radius: 18px; background: #fff; border: 1px solid var(--border); }
.aqd-notes p { color: var(--text); font-size: 14px; line-height: 1.6; }

@media (max-width: 620px) {
  .aqd-hero { flex-direction: column; }
  .aqd-hero-thumb { width: 100%; height: 120px; }
}
</style>
