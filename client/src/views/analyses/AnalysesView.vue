<template>
  <div class="an">
    <section class="an-hero">
      <div>
        <span class="an-kicker">Laboranalysen</span>
        <h1>Analysen registrieren und verfolgen</h1>
        <p>Aktivieren Sie neue Testkits und behalten Sie kommende Laborberichte im Blick.</p>
      </div>
      <RouterLink to="/analyses/activate" class="btn btn-primary btn-lg">Analyse registrieren</RouterLink>
    </section>

    <section v-if="analyses.count" class="an-list">
      <RouterLink v-for="analysis in analyses.items" :key="analysis.id" to="/analyses" class="an-card">
        <div class="an-card-status">
          <strong>{{ analysis.score ?? '—' }}<small v-if="analysis.score">%</small></strong>
          <span>{{ statusLabel(analysis.status) }}</span>
        </div>
        <div class="an-card-main">
          <span>{{ analysis.barcode }}</span>
          <h2>{{ analysis.aquariumName }}</h2>
          <p>{{ analysis.packageLabel }} · {{ analysis.reasonLabel }} · {{ formatDate(analysis.createdAt) }}</p>
        </div>
        <div class="an-card-side">
          <strong>{{ analysis.issueCount ?? 0 }}</strong>
          <span>Hinweise</span>
        </div>
      </RouterLink>
    </section>

    <section v-else class="an-empty">
      <div class="an-empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4v16h16" />
          <path d="M8 14l3-3 3 2 4-5" />
        </svg>
      </div>
      <span>Analyse-Center</span>
      <h2>Noch keine registrierten Analysen</h2>
      <p>Starten Sie mit einem Testkit-Barcode. Danach ordnen Sie die Probe einem Aquarium zu und wählen den Analyseumfang.</p>
      <RouterLink to="/analyses/activate" class="btn btn-primary">Erste Analyse registrieren</RouterLink>
    </section>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAnalysesStore } from '@/stores/analyses'

const analyses = useAnalysesStore()
onMounted(() => analyses.load())

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function statusLabel(status) {
  return {
    registered: 'Registriert',
    received: 'Eingegangen',
    completed: 'Fertig',
  }[status] || 'Offen'
}
</script>

<style scoped>
.an { display: flex; flex-direction: column; gap: 22px; }

.an-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 22px;
  padding: clamp(24px, 4vw, 36px);
  border-radius: 24px;
  color: #fff;
  background:
    linear-gradient(120deg, rgba(10,27,67,0.96), rgba(0,51,102,0.84)),
    url('/reef-tank.webp') center / cover;
  box-shadow: var(--shadow);
}
.an-kicker {
  display: block;
  margin-bottom: 8px;
  color: var(--brand-sky);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.an-hero h1 {
  margin-bottom: 10px;
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.an-hero p { max-width: 560px; color: rgba(255,255,255,0.74); line-height: 1.6; }

.an-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 680px;
  width: 100%;
  margin: 26px auto 0;
  padding: clamp(34px, 5vw, 52px);
  border-radius: 24px;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.24);
  box-shadow: var(--shadow);
}
.an-empty-icon {
  display: grid;
  place-items: center;
  width: 74px;
  height: 74px;
  margin-bottom: 18px;
  border-radius: 22px;
  color: #fff;
  background: linear-gradient(135deg, var(--brand-blue), var(--brand-cyan));
}
.an-empty-icon svg { width: 32px; height: 32px; }
.an-empty > span {
  color: var(--brand-blue);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}
.an-empty h2 {
  margin: 9px 0 10px;
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 800;
  letter-spacing: -0.03em;
}
.an-empty p {
  max-width: 470px;
  margin-bottom: 24px;
  color: var(--text-muted);
  line-height: 1.65;
}

.an-list { display: flex; flex-direction: column; gap: 12px; }
.an-card {
  display: grid;
  grid-template-columns: 104px 1fr 88px;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(136,193,233,0.22);
  box-shadow: var(--shadow);
  transition: transform 0.16s, border-color 0.16s;
}
.an-card:hover { transform: translateY(-2px); border-color: rgba(0,114,206,0.34); }
.an-card-status {
  display: grid;
  place-items: center;
  min-height: 76px;
  border-radius: 15px;
  background: rgba(136,193,233,0.14);
  color: var(--brand-blue);
}
.an-card-status strong { font-size: 25px; font-weight: 800; line-height: 1; }
.an-card-status small { font-size: 12px; }
.an-card-status span,
.an-card-side span,
.an-card-main > span {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.an-card-status span { margin-top: 5px; color: var(--text-muted); }
.an-card-main { min-width: 0; }
.an-card-main > span { color: var(--brand-blue); }
.an-card-main h2 {
  margin: 5px 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text);
}
.an-card-main p { color: var(--text-muted); font-size: 13px; }
.an-card-side {
  text-align: right;
  color: var(--text-muted);
}
.an-card-side strong {
  display: block;
  color: var(--text);
  font-size: 24px;
  font-weight: 800;
}

@media (max-width: 640px) {
  .an-hero { align-items: flex-start; flex-direction: column; }
  .an-hero .btn { width: 100%; }
  .an-card { grid-template-columns: 1fr; }
  .an-card-status,
  .an-card-side { text-align: left; place-items: start; }
}
</style>
