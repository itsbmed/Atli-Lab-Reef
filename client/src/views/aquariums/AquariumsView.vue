<template>
  <div class="aq-list">
    <div class="aq-list-head">
      <h2>Meine Aquarien <small>{{ aquariums.count }} Becken</small></h2>
      <RouterLink to="/aquariums/new" class="btn btn-primary">＋ Aquarium anlegen</RouterLink>
    </div>

    <!-- Leerzustand -->
    <div v-if="!aquariums.count" class="aq-empty">
      <div class="aq-empty-hero">
        <div class="aq-empty-glow"></div>
        <div class="aq-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" width="30" height="30"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 12c2 0 2.2 1.6 4.5 1.6S10 12 12 12s2.2 1.6 4.5 1.6S19 12 21 12"/><circle cx="7.5" cy="9" r=".8" fill="currentColor" stroke="none"/></svg>
        </div>
        <span class="aq-empty-kicker">Willkommen · Erster Schritt</span>
        <h3>Richten Sie Ihr erstes Aquarium ein</h3>
        <p>Ein Aquarium-Profil bündelt Testkits, Laborberichte und Verlaufsdaten an einem Ort — die Grundlage für Ihre erste ICP-Analyse.</p>
        <div class="aq-empty-actions">
          <RouterLink to="/aquariums/new" class="btn btn-primary btn-lg">＋ Aquarium anlegen</RouterLink>
          <RouterLink to="/dashboard" class="btn btn-ghost btn-lg">Zur Übersicht</RouterLink>
        </div>
      </div>

      <div class="aq-empty-steps">
        <div class="aq-empty-step">
          <span class="step-num">1</span>
          <span class="step-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="19" height="19"><rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 11c2 0 2.2 1.6 4.5 1.6S10 11 12 11s2.2 1.6 4.5 1.6S19 11 21 11"/></svg></span>
          <strong>Aquarium anlegen</strong>
          <p>Volumen, Wassertyp und Technik hinterlegen.</p>
        </div>
        <div class="aq-empty-step">
          <span class="step-num">2</span>
          <span class="step-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="19" height="19"><rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M7 8v8M10.5 8v8M14 8v8M17 8v8"/></svg></span>
          <strong>Testkit aktivieren</strong>
          <p>Barcode scannen und mit dem Becken verknüpfen.</p>
        </div>
        <div class="aq-empty-step">
          <span class="step-num">3</span>
          <span class="step-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" width="19" height="19"><path d="M4 4v16h16"/><path d="M8 14l3-3 3 2 4-5"/></svg></span>
          <strong>Ergebnisse erhalten</strong>
          <p>Scores, Trends und Empfehlungen einsehen.</p>
        </div>
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
.aq-list { flex: 1; display: flex; flex-direction: column; }
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
.aq-empty { max-width: 700px; margin: auto; width: 100%; }
.aq-empty-hero {
  position: relative; overflow: hidden; text-align: center;
  padding: clamp(32px, 4.5vw, 46px) 32px;
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.28);
  box-shadow: 0 18px 50px rgba(10,27,67,0.07);
}
.aq-empty-glow {
  position: absolute; top: -70px; left: 50%; transform: translateX(-50%);
  width: 300px; height: 220px; border-radius: 50%; pointer-events: none;
  background: radial-gradient(circle, rgba(0,190,208,0.16), transparent 70%);
}
.aq-empty-icon {
  position: relative; display: grid; place-items: center;
  width: 76px; height: 76px; margin: 0 auto 20px; border-radius: 22px; color: #fff;
  background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan));
  box-shadow: 0 12px 28px rgba(0,114,206,0.28);
  animation: aqFloat 4s ease-in-out infinite;
}
@keyframes aqFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
.aq-empty-kicker { position: relative; color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.aq-empty h3 { position: relative; margin: 10px 0 12px; font-size: clamp(24px, 3.4vw, 33px); font-weight: 800; letter-spacing: -0.03em; color: var(--text); }
.aq-empty-hero p { position: relative; max-width: 448px; margin: 0 auto 26px; color: var(--text-muted); font-size: 15px; line-height: 1.65; }
.aq-empty-actions { position: relative; display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }

.aq-empty-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 16px; }
.aq-empty-step { position: relative; padding: 20px 18px; border-radius: 20px; background: #fff; border: 1px solid rgba(136,193,233,0.2); box-shadow: var(--shadow); }
.aq-empty-step .step-num { position: absolute; top: 14px; right: 16px; font-size: 12px; font-weight: 800; color: rgba(136,193,233,0.75); }
.aq-empty-step .step-ic { display: grid; place-items: center; width: 42px; height: 42px; margin-bottom: 12px; border-radius: 13px; background: rgba(136,193,233,0.14); color: var(--brand-blue); }
.aq-empty-step strong { display: block; margin-bottom: 5px; font-size: 14px; font-weight: 800; color: var(--text); }
.aq-empty-step p { color: var(--text-muted); font-size: 12.5px; line-height: 1.5; }

/* Kartenraster */
.aq-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 22px; }
.aq-card { display: flex; flex-direction: column; border-radius: 22px; overflow: hidden; background: #fff; border: 1px solid rgba(136,193,233,0.18); box-shadow: var(--shadow); text-decoration: none; transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
.aq-card:hover { transform: translateY(-4px); border-color: rgba(136,193,233,0.5); box-shadow: 0 22px 50px rgba(10,27,67,0.13); }
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
  .aq-list-head { flex-direction: column; align-items: flex-start; gap: 12px; }
  .aq-list-head .btn { width: 100%; }
  .aq-grid { gap: 16px; }
  .aq-card-media { height: 150px; }
  .aq-card-add { min-height: 200px; }
  .aq-empty-steps { grid-template-columns: 1fr; }
  .aq-empty-actions { flex-direction: column; }
  .aq-empty-actions .btn { width: 100%; }
}
</style>
