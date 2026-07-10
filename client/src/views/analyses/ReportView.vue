<template>
  <div class="report">
    <RouterLink to="/analyses" class="back-link">← Zurück zu den Analysen</RouterLink>

    <section v-if="!analysis" class="missing-card">
      <span>Analysebericht</span>
      <h1>Bericht nicht gefunden</h1>
      <p>Der gesuchte Laborbericht ist lokal nicht vorhanden.</p>
      <RouterLink to="/analyses" class="btn btn-primary">Alle Analysen öffnen</RouterLink>
    </section>

    <template v-else>
      <section :class="['report-hero', analysis.severity]">
        <div>
          <span class="hero-kicker">{{ analysis.packageLabel }} · {{ analysis.reportNumber }}</span>
          <h1>{{ analysis.aquariumName }}</h1>
          <p>{{ analysis.reasonLabel }} · {{ formatDate(analysis.createdAt) }} · {{ analysis.barcode }}</p>
          <div class="hero-actions">
            <button class="btn btn-primary" type="button">Bericht teilen</button>
            <button class="btn btn-ghost" type="button">PDF vormerken</button>
          </div>
        </div>

        <div class="score-card">
          <div class="score-ring" :style="scoreRingStyle">
            <strong>{{ analysis.score ?? '—' }}</strong>
            <span v-if="analysis.score !== null">%</span>
          </div>
          <div>
            <span>{{ analysis.statusLabel }}</span>
            <strong>{{ resultLabel }}</strong>
            <em>{{ issueCopy }}</em>
          </div>
        </div>
      </section>

      <section class="workflow-card">
        <div v-for="step in WORKFLOW_STEPS" :key="step.key" :class="['workflow-step', { done: step.rank <= currentRank, active: step.key === analysis.status }]">
          <i></i>
          <span>{{ step.label }}</span>
        </div>
      </section>

      <section class="report-layout">
        <main class="report-main">
          <section class="panel">
            <div class="section-head">
              <div>
                <span>Laborwerte</span>
                <h2>Parameterübersicht</h2>
              </div>
              <strong>{{ analysis.parameters.length || '—' }} Werte</strong>
            </div>

            <div v-if="analysis.parameters.length" class="parameter-grid">
              <div v-for="param in analysis.parameters" :key="param.key" :class="['parameter-card', param.tone]">
                <span>{{ param.label }}</span>
                <strong>{{ param.value }} <small>{{ param.unit }}</small></strong>
                <em>Ziel {{ param.target }}</em>
              </div>
            </div>
            <p v-else class="muted">Die Laborwerte werden angezeigt, sobald der Bericht fertig ist.</p>
          </section>

          <section class="panel">
            <div class="section-head">
              <div>
                <span>Empfehlungen</span>
                <h2>Nächste Maßnahmen</h2>
              </div>
            </div>
            <div v-if="analysis.recommendations.length" class="recommendation-list">
              <div v-for="(item, index) in analysis.recommendations" :key="item" class="recommendation-row">
                <b>{{ index + 1 }}</b>
                <p>{{ item }}</p>
              </div>
            </div>
            <p v-else class="muted">Empfehlungen folgen nach abgeschlossener Laborbewertung.</p>
          </section>
        </main>

        <aside class="report-side">
          <section class="panel">
            <div class="section-head compact">
              <div>
                <span>Hinweise</span>
                <h2>Auffälligkeiten</h2>
              </div>
            </div>
            <div v-if="analysis.issues?.length" class="issue-list">
              <span v-for="issue in analysis.issues" :key="issue">{{ issue }}</span>
            </div>
            <p v-else class="muted">Keine Auffälligkeiten dokumentiert.</p>
          </section>

          <section class="panel meta-panel">
            <div><span>Status</span><strong>{{ analysis.statusLabel }}</strong></div>
            <div><span>Wassertyp</span><strong>{{ analysis.waterType }}</strong></div>
            <div><span>Analysepaket</span><strong>{{ analysis.packageLabel }}</strong></div>
            <div><span>Abgeschlossen</span><strong>{{ analysis.completedAt ? formatDate(analysis.completedAt) : 'Offen' }}</strong></div>
          </section>
        </aside>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useAnalysesStore } from '@/stores/analyses'
import { WORKFLOW_STEPS } from '@/services/analysisStore'

const route = useRoute()
const analyses = useAnalysesStore()
onMounted(() => analyses.load())

const analysis = computed(() => analyses.items.find((item) => item.id === route.params.id) || null)
const currentRank = computed(() => WORKFLOW_STEPS.find((step) => step.key === analysis.value?.status)?.rank || 0)
const resultLabel = computed(() => {
  if (!analysis.value || analysis.value.status !== 'completed') return 'Laborprozess läuft'
  if (analysis.value.severity === 'critical') return 'Korrektur nötig'
  if (analysis.value.severity === 'watch') return 'Beobachten'
  return 'Stabil'
})
const issueCopy = computed(() => {
  if (!analysis.value) return ''
  if (analysis.value.status !== 'completed') return 'Ergebnisse werden vorbereitet.'
  return `${analysis.value.issueCount} Hinweise im Bericht`
})
const scoreRingStyle = computed(() => {
  const score = analysis.value?.score ?? 0
  const color = analysis.value?.severity === 'critical' ? '#e85d4f' : analysis.value?.severity === 'watch' ? '#f59e0b' : '#10b981'
  return { background: `conic-gradient(${color} ${score * 3.6}deg, rgba(255,255,255,0.16) 0deg)` }
})

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.report { display: grid; gap: 18px; }
.back-link { color: var(--teal-700); font-weight: 800; text-decoration: none; }
.missing-card,
.report-hero,
.workflow-card,
.panel { border-radius: 24px; background: #fff; border: 1px solid rgba(136,193,233,0.22); box-shadow: var(--shadow); }
.missing-card { max-width: 620px; padding: 34px; }
.missing-card span,
.hero-kicker,
.section-head span,
.meta-panel span { color: var(--teal-700); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
.missing-card h1 { margin: 8px 0; color: var(--text); font-size: 34px; font-weight: 800; }
.missing-card p { margin-bottom: 18px; color: var(--text-muted); }
.report-hero { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: clamp(24px, 4vw, 34px); color: #fff; background: linear-gradient(115deg, rgba(10,27,67,0.98), rgba(0,114,206,0.72)), url('/reef-tank.webp') center / cover; }
.report-hero.critical { background: linear-gradient(115deg, rgba(10,27,67,0.98), rgba(232,93,79,0.72)), url('/reef-tank.webp') center / cover; }
.report-hero.watch { background: linear-gradient(115deg, rgba(10,27,67,0.98), rgba(245,158,11,0.56)), url('/reef-tank.webp') center / cover; }
.report-hero .hero-kicker { color: var(--teal-200); }
.report-hero h1 { margin: 8px 0; font-size: clamp(34px, 5vw, 58px); line-height: 0.96; font-weight: 800; letter-spacing: -0.05em; }
.report-hero p { color: rgba(255,255,255,0.72); }
.hero-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
.score-card { min-width: 310px; display: flex; align-items: center; gap: 18px; padding: 18px; border-radius: 22px; background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.16); }
.score-ring { width: 112px; height: 112px; border-radius: 50%; display: grid; place-items: center; position: relative; }
.score-ring::after { content: ''; position: absolute; inset: 12px; border-radius: 50%; background: rgba(10,27,67,0.94); }
.score-ring strong,
.score-ring span { position: relative; z-index: 1; }
.score-ring strong { font-size: 34px; line-height: 1; }
.score-ring span { margin-top: 34px; margin-left: -18px; font-size: 12px; }
.score-card span,
.score-card strong,
.score-card em { display: block; }
.score-card span { color: var(--teal-200); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.score-card strong { margin-top: 5px; font-size: 22px; }
.score-card em { margin-top: 4px; color: rgba(255,255,255,0.7); font-style: normal; font-size: 13px; }
.workflow-card { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; padding: 14px; }
.workflow-step { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 16px; color: var(--text-muted); background: rgba(238,245,251,0.72); font-size: 12px; font-weight: 800; }
.workflow-step i { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; }
.workflow-step.done i { background: var(--teal-500); }
.workflow-step.active { color: var(--brand-blue); background: var(--teal-50); }
.report-layout { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 18px; align-items: start; }
.report-main,
.report-side { display: grid; gap: 18px; }
.panel { padding: 22px; }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; margin-bottom: 16px; }
.section-head.compact { margin-bottom: 12px; }
.section-head h2 { color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.02em; }
.section-head strong { color: var(--text); font-size: 13px; }
.parameter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 12px; }
.parameter-card { padding: 15px; border-radius: 18px; background: rgba(238,245,251,0.72); border: 1px solid var(--border); }
.parameter-card.watch { background: #fff7ed; border-color: #fed7aa; }
.parameter-card.critical { background: #fdecea; border-color: #f8c9c4; }
.parameter-card span,
.parameter-card strong,
.parameter-card em { display: block; }
.parameter-card span { color: var(--text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.parameter-card strong { margin-top: 5px; color: var(--text); font-size: 24px; }
.parameter-card small { color: var(--text-muted); font-size: 12px; }
.parameter-card em { margin-top: 5px; color: var(--text-muted); font-style: normal; font-size: 12px; font-weight: 700; }
.recommendation-list,
.issue-list,
.meta-panel { display: grid; gap: 10px; }
.recommendation-row { display: grid; grid-template-columns: 34px 1fr; gap: 12px; align-items: start; padding: 13px; border-radius: 16px; background: var(--teal-50); }
.recommendation-row b { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 10px; background: var(--teal-500); color: #fff; }
.recommendation-row p,
.muted { color: var(--text-muted); line-height: 1.55; }
.issue-list span { padding: 10px 12px; border-radius: 999px; background: #fff7ed; color: #92400e; font-size: 12px; font-weight: 800; }
.meta-panel div { display: flex; justify-content: space-between; gap: 14px; padding: 11px 0; border-bottom: 1px solid var(--border); }
.meta-panel div:last-child { border-bottom: 0; }
.meta-panel strong { color: var(--text); font-size: 13px; text-align: right; }
@media (max-width: 900px) {
  .report-hero,
  .score-card { align-items: flex-start; flex-direction: column; }
  .score-card { min-width: 0; width: 100%; }
  .workflow-card,
  .report-layout { grid-template-columns: 1fr; }
}
</style>
