<template>
  <div class="aq-list">
    <div class="aq-list-head">
      <h2>Meine Aquarien <small>{{ aquariums.count }} Becken</small></h2>
      <RouterLink to="/aquariums/new" class="btn btn-primary">＋ Aquarium anlegen</RouterLink>
    </div>

    <!-- Leerzustand -->
    <div v-if="!aquariums.count" class="aq-empty">
      <div class="aq-empty-media"><div class="aq-thumb reef-mixed"></div></div>
      <span class="aq-empty-kicker">Erster Schritt</span>
      <h3>Legen Sie Ihr erstes Aquarium an</h3>
      <p>Ein Aquarium-Profil verbindet Testkits, Laborberichte und Verlauf. Sie können danach direkt eine Analyse registrieren.</p>
      <div class="aq-empty-actions">
        <RouterLink to="/aquariums/new" class="btn btn-primary btn-lg">＋ Aquarium anlegen</RouterLink>
        <RouterLink to="/dashboard" class="btn btn-ghost btn-lg">Zur Übersicht</RouterLink>
      </div>
    </div>

    <!-- Kartenraster -->
    <div v-else class="aq-grid">
      <RouterLink v-for="a in aquariums.items" :key="a.id" :to="`/aquariums/${a.id}`" class="aq-card">
        <div class="aq-card-media">
          <div :class="`aq-thumb ${a.image_theme}`"></div>
          <span :class="['aq-card-badge', waterClass(a.water_type)]">{{ a.water_type }}</span>
        </div>
        <div class="aq-card-body">
          <h3>{{ a.name }}</h3>
          <div class="aq-card-meta">
            <span>🐠 {{ a.net_volume ? `${a.net_volume} L` : 'Volumen offen' }}</span>
            <span v-if="a.aquarium_type">· {{ a.aquarium_type }}</span>
            <span v-if="a.dimensions">· {{ a.dimensions }}</span>
          </div>
          <div class="aq-card-foot">
            <span>📅 Erstellt: {{ formatDate(a.createdAt) }}</span>
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

// Wassertyp → sichere CSS-Klasse für die Badge-Färbung.
function waterClass(type) {
  return { 'Meerwasser': 'wt-sea', 'Süßwasser': 'wt-fresh', 'Osmosewasser': 'wt-osmo', 'Meersalz': 'wt-salt' }[type] || 'wt-sea'
}
</script>

<style scoped>
.aq-list-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.aq-list-head h2 { font-size: clamp(24px, 3vw, 32px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); line-height: 1.05; }
.aq-list-head h2 small { margin-left: 10px; font-size: 14px; font-weight: 600; letter-spacing: 0; color: var(--text-muted); }

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
.aq-empty-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }

/* Kartenraster */
.aq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 18px; }
.aq-card { display: flex; flex-direction: column; border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); text-decoration: none; transition: transform 0.15s, box-shadow 0.15s; }
.aq-card:hover { transform: translateY(-3px); box-shadow: 0 20px 48px rgba(10,27,67,0.12); }
.aq-card-media { position: relative; height: 170px; }
.aq-card-media::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 42%, rgba(10,27,67,0.3)); }
.aq-card-badge { position: absolute; z-index: 2; top: 12px; left: 12px; padding: 4px 11px; border-radius: 999px; background: rgba(255,255,255,0.94); color: var(--brand-blue); font-size: 11px; font-weight: 800; box-shadow: 0 6px 16px rgba(10,27,67,0.14); }
.aq-card-badge.wt-sea { color: var(--brand-blue); }
.aq-card-badge.wt-fresh { color: #0f766e; }
.aq-card-badge.wt-osmo { color: #0e7490; }
.aq-card-badge.wt-salt { color: #7c3aed; }
.aq-card-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.aq-card-body h3 { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: var(--text); }
.aq-card-meta { display: flex; flex-wrap: wrap; gap: 6px; color: var(--text-muted); font-size: 12.5px; }
.aq-card-foot { margin-top: auto; padding-top: 12px; display: flex; align-items: center; justify-content: space-between; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border); }
.aq-card-link { color: var(--brand-blue); font-weight: 700; }

.aq-card-add {
  align-items: center; justify-content: center; gap: 12px; min-height: 270px;
  border: 2px dashed rgba(136,193,233,0.42); box-shadow: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.94), rgba(238,245,251,0.84));
  color: var(--teal-700, #0f5d6b); font-size: 14px; font-weight: 800;
}
.aq-card-add:hover { transform: none; border-color: var(--teal-500); background: var(--teal-50, #eef6fb); }
.aq-add-circle {
  display: grid; place-items: center; width: 58px; height: 58px; border-radius: 20px;
  background: linear-gradient(135deg, var(--teal-100, #d6ecf6), #fff);
  color: var(--teal-600, #1a7f97); font-size: 30px; font-weight: 800;
  box-shadow: 0 16px 34px rgba(10,27,67,0.1);
}

@media (max-width: 620px) {
  .aq-list-head { flex-direction: column; align-items: flex-start; }
}
</style>
