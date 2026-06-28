<template>
  <div class="aq-list">
    <div class="aq-list-head">
      <div>
        <h2>Ihre Aquarien</h2>
        <p>Verwalten Sie Ihre Becken, Zielwerte und Technik an einem Ort.</p>
      </div>
      <RouterLink v-if="aquariums.count" to="/aquariums/new" class="btn btn-primary">＋ Aquarium anlegen</RouterLink>
    </div>

    <!-- Leerzustand -->
    <div v-if="!aquariums.count" class="aq-empty">
      <div class="aq-empty-media"><div class="aq-thumb reef-mixed"></div></div>
      <span class="aq-empty-kicker">Erster Schritt</span>
      <h3>Legen Sie Ihr erstes Aquarium an</h3>
      <p>Ein Aquarium-Profil verbindet Testkits, Laborberichte und Verlauf. Danach können Sie direkt eine Analyse registrieren.</p>
      <RouterLink to="/aquariums/new" class="btn btn-primary btn-lg">＋ Aquarium anlegen</RouterLink>
    </div>

    <!-- Kartenraster -->
    <div v-else class="aq-grid">
      <RouterLink v-for="a in aquariums.items" :key="a.id" :to="`/aquariums/${a.id}`" class="aq-card">
        <div class="aq-card-media"><div :class="`aq-thumb ${a.image_theme}`"></div>
          <span class="aq-card-badge">{{ a.water_type }}</span>
        </div>
        <div class="aq-card-body">
          <h3>{{ a.name }}</h3>
          <div class="aq-card-meta">
            <span>{{ a.net_volume ? `${a.net_volume} L` : 'Volumen offen' }}</span>
            <span v-if="a.aquarium_type">· {{ a.aquarium_type }}</span>
          </div>
          <div class="aq-card-foot">
            <span>Angelegt: {{ formatDate(a.createdAt) }}</span>
            <span class="aq-card-link">Details →</span>
          </div>
        </div>
      </RouterLink>

      <RouterLink to="/aquariums/new" class="aq-card aq-card-add">
        <div class="aq-add-circle">＋</div>
        <span>Neues Aquarium anlegen</span>
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAquariumsStore } from '@/stores/aquariums'

const aquariums = useAquariumsStore()
onMounted(() => aquariums.load())

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.aq-list-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.aq-list-head h2 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); line-height: 1.05; }
.aq-list-head p { margin-top: 6px; color: var(--text-muted); font-size: 14px; }

/* Thumb-Themen (rein CSS, ohne externe Bilder) */
.aq-thumb { width: 100%; height: 100%; border-radius: inherit; background: linear-gradient(150deg, var(--brand-blue), #0a1b43); }
.aq-thumb.reef-mixed { background: linear-gradient(150deg, var(--brand-blue), var(--brand-cyan)); }
.aq-thumb.reef-sps { background: linear-gradient(150deg, #0a1b43, var(--brand-cyan)); }
.aq-thumb.freshwater { background: linear-gradient(150deg, #0f766e, #34d399); }
.aq-thumb.osmosis { background: linear-gradient(150deg, #164e63, #67e8f9); }

/* Leerzustand */
.aq-empty { max-width: 560px; margin: 12px auto; padding: 40px 32px; text-align: center; border-radius: 26px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aq-empty-media { width: 96px; height: 96px; margin: 0 auto 20px; border-radius: 22px; overflow: hidden; }
.aq-empty-kicker { color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.aq-empty h3 { margin: 8px 0 10px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.aq-empty p { margin-bottom: 22px; color: var(--text-muted); font-size: 14px; line-height: 1.6; }

/* Kartenraster */
.aq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 18px; }
.aq-card { display: flex; flex-direction: column; border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
.aq-card:hover { transform: translateY(-3px); box-shadow: 0 20px 48px rgba(10,27,67,0.12); }
.aq-card-media { position: relative; height: 132px; }
.aq-card-badge { position: absolute; top: 12px; left: 12px; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.92); color: var(--brand-blue); font-size: 11px; font-weight: 800; }
.aq-card-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.aq-card-body h3 { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.aq-card-meta { display: flex; flex-wrap: wrap; gap: 6px; color: var(--text-muted); font-size: 13px; }
.aq-card-foot { margin-top: auto; padding-top: 8px; display: flex; align-items: center; justify-content: space-between; font-size: 12px; color: var(--text-muted); border-top: 1px solid var(--border); }
.aq-card-link { color: var(--brand-blue); font-weight: 700; }

.aq-card-add { align-items: center; justify-content: center; gap: 10px; min-height: 220px; border-style: dashed; box-shadow: none; color: var(--text-muted); font-size: 13px; font-weight: 700; }
.aq-card-add:hover { color: var(--brand-blue); border-color: var(--teal-400); }
.aq-add-circle { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; background: rgba(136,193,233,0.16); color: var(--brand-blue); font-size: 24px; }

@media (max-width: 620px) {
  .aq-list-head { flex-direction: column; align-items: flex-start; }
}
</style>
