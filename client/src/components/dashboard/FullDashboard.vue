<template>
  <div class="dashboard-home">
    <header class="dashboard-head">
      <div class="head-copy">
        <span class="head-kicker">Übersicht</span>
        <h1>{{ dashboardGreeting }}</h1>
        <p>{{ dashboardSummary }}</p>
      </div>
      <div class="head-actions">
        <RouterLink to="/analyses/activate" class="btn btn-primary">Neue Analyse registrieren</RouterLink>
        <RouterLink to="/analyses" class="btn btn-ghost">Alle Berichte</RouterLink>
      </div>
    </header>

    <section class="command-strip">
      <RouterLink v-for="item in commandCards" :key="item.label" :to="item.to" :class="['command-card', item.tone]">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.caption }}</em>
      </RouterLink>
    </section>

    <section class="overview-layout">
      <main class="tank-section">
        <div class="section-header">
          <div>
            <div class="section-title">Aquarium Health</div>
            <p class="section-sub">Die letzten Laborwerte pro Becken, sortiert nach Aufmerksamkeit.</p>
          </div>
          <RouterLink to="/aquariums" class="section-link">
            {{ hiddenTankCount ? `Alle ${tankCards.length} anzeigen` : 'Alle anzeigen' }}
          </RouterLink>
        </div>

        <div class="tank-grid">
          <RouterLink v-for="tank in visibleTankCards" :key="tank.id" :to="tank.analysisId ? `/analyses/${tank.analysisId}` : `/aquariums/${tank.id}`" :class="['tank-card', tank.tone]">
            <div class="tank-visual">
              <img v-if="tank.image" :src="tank.image" alt="" />
              <div v-else :class="`tank-thumb ${tank.image_theme}`"></div>
              <span>{{ tank.water_type }}</span>
            </div>
            <div class="tank-body">
              <div class="tank-top">
                <div>
                  <h3>{{ tank.name }}</h3>
                  <p>{{ tank.net_volume }} L · {{ tank.aquarium_type || 'Profil' }}</p>
                </div>
                <div class="tank-score">{{ tank.score ?? '—' }}<small v-if="tank.score !== null">%</small></div>
              </div>
              <div class="health-track"><span :style="{ width: `${tank.score ?? 0}%` }"></span></div>
              <div class="tank-footer">
                <span v-if="!tank.analysisId">Noch keine Analyse</span>
                <span v-else-if="tank.score === null">Ergebnis folgt</span>
                <span v-else-if="tank.issueCount">{{ tank.issueCount }} {{ tank.issueCount === 1 ? 'Hinweis' : 'Hinweise' }}</span>
                <span v-else class="clean">Alle Werte im Ziel</span>
                <em v-if="tank.lastDate">{{ formatDateShort(tank.lastDate) }}</em>
              </div>
            </div>
          </RouterLink>
        </div>

        <RouterLink v-if="hiddenTankCount" to="/aquariums" class="tank-more">
          <span>{{ hiddenTankCount }} weitere Becken mit geringerer Priorität</span>
          <b>Alle Becken öffnen →</b>
        </RouterLink>
      </main>

      <aside class="intelligence-panel card">
        <div class="section-header">
          <div>
            <div class="section-title">Zuletzt eingegangen</div>
            <p class="section-sub">Die neuesten Laborberichte, oben der dringendste Fall.</p>
          </div>
          <RouterLink to="/analyses" class="section-link">Alle</RouterLink>
        </div>

        <div v-if="priorityAnalysis" :class="['issue-focus', priorityTone]">
          <span>{{ priorityTone === 'good' ? 'Bestes Ergebnis' : 'Höchste Priorität' }}</span>
          <strong>{{ priorityAnalysis.aquariumName }}</strong>
          <p>{{ priorityCopy(priorityAnalysis) }}</p>
          <RouterLink :to="`/analyses/${priorityAnalysis.id}`" class="btn btn-outline btn-sm">Bericht prüfen</RouterLink>
        </div>

        <div v-if="!recentAnalyses.length" class="feed-empty">
          Noch kein Laborbericht erfasst.
        </div>
        <div v-else class="analysis-feed">
          <RouterLink v-for="a in recentAnalyses" :key="a.id" :to="`/analyses/${a.id}`" class="feed-row">
            <span :class="['feed-dot', analysisTone(a)]"></span>
            <div>
              <strong>{{ a.aquariumName }}</strong>
              <em>{{ formatDate(a.completedAt || a.createdAt) }} · {{ resultLabel(a) }}</em>
            </div>
            <b v-if="a.score !== null && a.score !== undefined" :class="analysisTone(a)">{{ a.score }}%</b>
            <b v-else class="pending">offen</b>
          </RouterLink>
        </div>
      </aside>
    </section>

    <section class="insight-dashboard">
      <div class="card trend-card">
        <div class="section-header">
          <div>
            <div class="section-title">Stabilitätsverlauf</div>
            <p class="section-sub">Score der letzten abgeschlossenen Laborberichte in ihrer Reihenfolge.</p>
          </div>
          <RouterLink to="/analyses" class="section-link">Chronik</RouterLink>
        </div>
        <div v-if="completedAnalyses.length > 1" class="chronik-mini large">
          <Line :data="miniChartData" :options="miniChartOptions" />
        </div>
        <div v-else class="trend-placeholder">
          <strong>Noch kein Verlauf</strong>
          <span>Ab dem zweiten abgeschlossenen Laborbericht erscheint hier die Entwicklung.</span>
        </div>
      </div>

      <div class="card actions-card">
        <div class="section-header">
          <div class="section-title">Nächste Schritte</div>
        </div>
        <div class="next-actions">
          <RouterLink v-for="action in nextActions" :key="action.title" :to="action.to" class="next-action">
            <span>{{ action.code }}</span>
            <div>
              <strong>{{ action.title }}</strong>
              <em>{{ action.caption }}</em>
            </div>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { Line } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAnalysesStore } from '@/stores/analyses'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const aquariums = useAquariumsStore()
const analyses = useAnalysesStore()

onMounted(() => {
  aquariums.load()
  analyses.load()
})

const TANK_LIMIT = 6

const recentAnalyses = computed(() => analyses.items
  .slice()
  .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
  .slice(0, 6))
const completedAnalyses = computed(() => analyses.items.filter((a) => a.score !== null && a.score !== undefined))

function latestAnalysisForTank(tank) {
  return analyses.items.find((a) => a.aquariumId === tank.id || a.aquariumName === tank.name) || null
}

// The report, the analyses list and this dashboard must agree, so the severity
// the store already derived is the only source used here.
function analysisTone(analysis) {
  return analysis?.severity || 'open'
}

const tankCards = computed(() => aquariums.items.map((profile) => {
  const latest = latestAnalysisForTank(profile)
  return {
    ...profile,
    analysisId: latest?.id || '',
    score: latest?.score ?? null,
    issueCount: latest?.issueCount ?? null,
    lastDate: latest?.createdAt || '',
    tone: latest ? analysisTone(latest) : 'none',
  }
}).sort((a, b) => (a.score ?? 101) - (b.score ?? 101)))

const visibleTankCards = computed(() => tankCards.value.slice(0, TANK_LIMIT))
const hiddenTankCount = computed(() => Math.max(0, tankCards.value.length - TANK_LIMIT))
const criticalAnalyses = computed(() => analyses.items.filter((a) => analysisTone(a) === 'critical'))
const watchAnalyses = computed(() => analyses.items.filter((a) => analysisTone(a) === 'watch'))
const priorityAnalysis = computed(() => {
  if (!analyses.items.length) return null
  return [...analyses.items].sort((a, b) => (a.score ?? 100) - (b.score ?? 100))[0]
})

const dashboardGreeting = computed(() => {
  // Ohne Becken oder ohne Auswertung wäre „läuft stabil“ eine leere Behauptung.
  if (!aquariums.count) return 'Legen Sie Ihr erstes Becken an'
  if (!completedAnalyses.value.length) return 'Noch kein ausgewerteter Laborbericht'
  if (criticalAnalyses.value.length) return `${criticalAnalyses.value.length} Berichte brauchen Aufmerksamkeit`
  if (watchAnalyses.value.length) return 'Ihre Aquarien sind stabil, mit Beobachtungspunkten'
  return 'Ihre Aquarien laufen stabil'
})
const dashboardSummary = computed(() => {
  if (!completedAnalyses.value.length) {
    return `${aquariums.count} Becken angelegt. Die Bewertung erscheint mit dem ersten fertigen Laborbericht.`
  }
  const parts = [`${aquariums.count} Becken`, `${analyses.count} Laborberichte`]
  if (criticalAnalyses.value.length) parts.push(`${criticalAnalyses.value.length} kritisch`)
  if (watchAnalyses.value.length) parts.push(`${watchAnalyses.value.length} zu beobachten`)
  return `${parts.join(' · ')}.`
})
const openAnalyses = computed(() => analyses.items.filter((analysis) => analysis.status !== 'completed'))
// A tank waiting on a result is not a tank without an analysis.
const tanksWithoutAnalysis = computed(() => tankCards.value.filter((tank) => tank.tone === 'none').length)
const commandCards = computed(() => [
  { label: 'Becken', value: aquariums.count, caption: !aquariums.count ? 'noch keins angelegt' : tanksWithoutAnalysis.value ? `${tanksWithoutAnalysis.value} ohne Analyse` : 'alle mit Laborwerten', to: '/aquariums', tone: 'good' },
  { label: 'Zu prüfen', value: criticalAnalyses.value.length + watchAnalyses.value.length, caption: criticalAnalyses.value.length ? `${criticalAnalyses.value.length} davon kritisch` : watchAnalyses.value.length ? 'leichte Abweichungen' : 'nichts offen', to: '/analyses', tone: criticalAnalyses.value.length ? 'critical' : watchAnalyses.value.length ? 'watch' : 'good' },
  { label: 'Im Labor', value: openAnalyses.value.length, caption: 'noch ohne Ergebnis', to: '/analyses', tone: 'neutral' },
  { label: 'Laborberichte', value: analyses.count, caption: 'insgesamt erfasst', to: '/analyses', tone: 'neutral' },
])
const priorityTone = computed(() => analysisTone(priorityAnalysis.value))
const nextActions = computed(() => [
  { code: 'ICP', title: 'Neue Analyse registrieren', caption: 'Barcode scannen oder manuell eingeben', to: '/analyses/activate' },
  { code: 'FIX', title: priorityAnalysis.value ? `${priorityAnalysis.value.aquariumName} prüfen` : 'Berichte prüfen', caption: priorityAnalysis.value ? priorityCopy(priorityAnalysis.value) : 'Alle Laborberichte öffnen', to: '/analyses' },
  { code: 'TRD', title: 'Trends vergleichen', caption: 'Langzeitverlauf der wichtigsten Elemente', to: '/analyses' },
])

const miniChartData = computed(() => {
  const series = completedAnalyses.value.slice().reverse().slice(-6)
  const labels = series.map((analysis) => formatDateShort(analysis.createdAt))
  const data = series.map((analysis) => analysis.score)
  return {
    labels,
    datasets: [{
      data,
      borderColor: '#0072CE',
      backgroundColor: 'rgba(136,193,233,0.08)',
      borderWidth: 2,
      pointRadius: 5,
      pointBackgroundColor: '#fff',
      pointBorderColor: '#0072CE',
      pointBorderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  }
})
const miniChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#5b7a99' } },
    y: { min: 0, max: 100, grid: { color: '#e9f1fb' }, ticks: { font: { size: 10 }, color: '#5b7a99', callback: v => `${v}%` } },
  },
}

function priorityCopy(analysis) {
  if (analysis.score === null || analysis.score === undefined) return 'Wartet auf Laborwerte'
  return `${analysis.issueCount || 0} auffällige Werte · Score ${analysis.score}%`
}
function resultLabel(analysis) {
  if (analysis.score === null || analysis.score === undefined) return 'Wartet auf Labor'
  const issues = analysis.issueCount || 0
  return issues ? `${issues} ${issues === 1 ? 'Hinweis' : 'Hinweise'}` : 'Alles in Ordnung'
}
function formatDate(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
function formatDateShort(d) { return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
</script>

<style scoped>
.trend-placeholder { min-height: 150px; display: grid; place-content: center; justify-items: center; gap: 5px; padding: 20px; border: 1px dashed rgba(136,193,233,0.45); border-radius: 14px; text-align: center; }
.trend-placeholder strong { color: var(--text); font-size: 13px; }
.trend-placeholder span { max-width: 320px; color: var(--text-muted); font-size: 11.5px; line-height: 1.5; }
.tank-footer .clean { color: #047857; }
.dashboard-home {
  display: grid;
  gap: 22px;
  --home-blue: #0072CE;
  --home-panel: rgba(255,255,255,0.9);
  --home-line: rgba(10,27,67,0.1);
  --green: #10b981;
  --amber: #f59e0b;
  --coral: #e85d4f;
  --fw-heading-strong: 800;
  --fw-heading: 800;
  --fw-label: 800;
  --fw-bold: 700;
}
/* Kopfzeile: sagt die Lage in einem Satz und bietet die Hauptaktion an. */
.dashboard-head {
  position: relative;
  overflow: hidden;
  display: flex;
  flex-wrap: wrap;
  gap: 18px;
  align-items: flex-end;
  justify-content: space-between;
  padding: 24px 26px;
  border-radius: 24px;
  background: linear-gradient(104deg, var(--brand-dark) 0%, #0d2f6b 48%, var(--home-blue) 100%);
  color: #fff;
  box-shadow: 0 18px 44px rgba(10,27,67,0.18);
}
/* Feiner Lichtverlauf, damit das Blau nicht flach wirkt. */
.dashboard-head::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(760px 200px at 88% -10%, rgba(136,193,233,0.32), transparent 70%);
  pointer-events: none;
}
.head-copy,
.head-actions { position: relative; z-index: 1; }
.head-copy { min-width: 0; }
.head-kicker { display: block; color: rgba(190,225,250,0.92); font-size: 10.5px; font-weight: var(--fw-label); letter-spacing: 0.12em; text-transform: uppercase; }
.dashboard-head h1 { margin: 7px 0 5px; color: #fff; font-size: clamp(21px, 2.5vw, 29px); font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; line-height: 1.18; }
.dashboard-head p { max-width: 68ch; color: rgba(226,240,252,0.88); font-size: 13px; font-weight: var(--fw-bold); line-height: 1.5; }
.head-actions { display: flex; flex-wrap: wrap; gap: 10px; }
/* Der zweite Knopf muss auf dem Blau lesbar bleiben. */
.head-actions .btn-ghost {
  border: 1px solid rgba(255,255,255,0.42);
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.head-actions .btn-ghost:hover { border-color: #fff; background: rgba(255,255,255,0.2); }

.command-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 190px), 1fr));
  gap: 12px;
}
.command-card {
  display: block;
  min-height: 104px;
  padding: 18px 20px;
  border-radius: 20px;
  color: inherit;
  text-decoration: none;
  background: linear-gradient(180deg, rgba(255,255,255,0.92), rgba(248,250,252,0.82));
  border: 1px solid rgba(136,193,233,0.2);
  border-top: 3px solid var(--home-blue);
  box-shadow: 0 14px 36px rgba(10,27,67,0.055);
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}
.command-card:hover { transform: translateY(-2px); box-shadow: 0 22px 60px rgba(10,27,67,0.1); border-color: rgba(136,193,233,0.36); }
.command-card span { display: block; color: var(--text-muted); font-size: 11px; font-weight: var(--fw-label); letter-spacing: 0.08em; text-transform: uppercase; }
.command-card strong { display: block; margin-top: 10px; color: var(--text); font-size: 28px; line-height: 1; font-weight: var(--fw-heading-strong); letter-spacing: -0.05em; }
.command-card em { display: block; margin-top: 6px; color: var(--teal-700); font-style: normal; font-size: 12px; font-weight: var(--fw-bold); }
.command-card.critical em { color: var(--coral); }
.command-card.watch em { color: var(--amber); }
.overview-layout {
  display: grid;
  grid-template-columns: minmax(min(100%, 620px), 1fr) minmax(min(100%, 340px), 0.38fr);
  gap: 22px;
  align-items: start;
}
.section-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.section-title { color: var(--text); font-size: 19px; font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; }
.section-sub { color: var(--text-muted); font-size: 12px; font-weight: var(--fw-bold); margin-top: 2px; }
.section-link { color: var(--brand-blue); font-size: 13px; font-weight: var(--fw-bold); white-space: nowrap; }
.tank-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 16px; }
.tank-card {
  overflow: hidden;
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr);
  min-height: 190px;
  color: inherit;
  text-decoration: none;
  border-radius: 22px;
  background: var(--home-panel);
  border: 1px solid rgba(136,193,233,0.18);
  box-shadow: 0 18px 52px rgba(10,27,67,0.07);
  transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s;
}
.tank-card:hover { transform: translateY(-3px); box-shadow: 0 26px 70px rgba(10,27,67,0.12); border-color: rgba(136,193,233,0.36); }
.tank-card.critical { border-color: rgba(232,93,79,0.32); }
.tank-card.watch { border-color: rgba(245,158,11,0.3); }
.tank-card.good { border-color: rgba(16,185,129,0.24); }
.tank-card.none { border-style: dashed; border-color: rgba(136,193,233,0.4); }
.tank-card.none .tank-score { color: var(--text-muted); }
.tank-card.none .health-track span { background: #e4ecf3; }
.tank-visual { position: relative; width: 190px; height: 100%; min-height: 190px; overflow: hidden; }
.tank-visual img { width: 100%; height: 100%; object-fit: cover; object-position: center; display: block; }
/* Echte Beckenfotos aus /public/tanks statt einer Farbfläche.
   Für reef-sps und reef-nano gibt es kein eigenes Foto – sie teilen das
   Riffbild und unterscheiden sich über den Farbschleier. */
.tank-visual .tank-thumb {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 0;
  background:
    linear-gradient(168deg, rgba(10,27,67,0.34), rgba(0,190,208,0.12)),
    url('/tanks/reef-mixed.png') center / cover no-repeat;
}
.tank-visual .tank-thumb.reef-sps { background-image: linear-gradient(168deg, rgba(10,27,67,0.5), rgba(0,114,206,0.2)), url('/tanks/reef-mixed.png'); }
.tank-visual .tank-thumb.reef-nano { background-image: linear-gradient(168deg, rgba(15,118,110,0.4), rgba(94,234,212,0.18)), url('/tanks/reef-mixed.png'); }
.tank-visual .tank-thumb.freshwater { background-image: linear-gradient(168deg, rgba(15,118,110,0.32), rgba(52,211,153,0.14)), url('/tanks/freshwater.png'); }
.tank-visual .tank-thumb.osmosis { background-image: linear-gradient(168deg, rgba(22,78,99,0.42), rgba(103,232,249,0.16)), url('/tanks/osmosis.png'); }
.tank-visual span {
  position: absolute;
  left: 14px;
  top: 14px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(10,27,67,0.58);
  color: #fff;
  font-size: 11px;
  font-weight: var(--fw-bold);
  backdrop-filter: blur(10px);
}
.tank-body { padding: 20px; display: flex; flex-direction: column; justify-content: space-between; }
.tank-top { display: flex; justify-content: space-between; gap: 14px; align-items: start; }
.tank-top h3 { font-size: 18px; font-weight: var(--fw-heading-strong); color: var(--text); letter-spacing: -0.03em; }
.tank-top p { color: var(--text-muted); font-size: 12px; font-weight: var(--fw-label); margin-top: 2px; }
.tank-score { display: inline-flex; align-items: baseline; flex-wrap: nowrap; white-space: nowrap; color: var(--text); font-size: 28px; line-height: 1; font-weight: var(--fw-heading-strong); letter-spacing: -0.05em; }
.tank-score small { font-size: 12px; color: var(--text-muted); margin-left: 1px; }
.health-track { height: 10px; border-radius: 999px; background: rgba(100,130,165,0.14); overflow: hidden; margin: 15px 0 12px; }
.health-track span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--teal-400), var(--green)); }
.tank-card.watch .health-track span { background: linear-gradient(90deg, var(--amber), var(--teal-400)); }
.tank-card.critical .health-track span { background: linear-gradient(90deg, var(--coral), var(--amber)); }
.tank-footer { display: flex; justify-content: space-between; gap: 12px; color: var(--text-muted); font-size: 12px; font-weight: var(--fw-bold); }
.tank-footer em { font-style: normal; color: var(--teal-700); }
.card,
.intelligence-panel.card,
.trend-card.card,
.actions-card.card {
  background: var(--home-panel);
  border: 1px solid rgba(136,193,233,0.18);
  border-radius: var(--radius);
  box-shadow: 0 18px 52px rgba(10,27,67,0.07);
}
/* Kein sticky: die Spalte ist hoch genug, dass ein mitlaufendes Panel
   vom linken Inhalt abkoppelt statt zu helfen. */
.intelligence-panel { padding: 18px; }
.issue-focus {
  padding: 15px 16px;
  border-radius: 18px;
  border: 1px solid rgba(10,27,67,0.1);
  border-left: 4px solid var(--amber);
  background: #fffdf6;
  margin-bottom: 4px;
}
.issue-focus.critical { border-left-color: var(--coral); background: #fff7f5; }
.issue-focus.good { border-left-color: var(--green); background: #f3fdf8; }
.issue-focus.open { border-left-color: var(--home-blue); background: var(--teal-50); }
.issue-focus span { display: block; color: #b45309; font-size: 10.5px; font-weight: var(--fw-label); letter-spacing: 0.08em; text-transform: uppercase; }
.issue-focus.critical span { color: var(--coral); }
.issue-focus.good span { color: #047857; }
.issue-focus.open span { color: var(--home-blue); }
.issue-focus strong { display: block; margin-top: 4px; overflow: hidden; color: var(--text); font-size: 18px; font-weight: var(--fw-heading-strong); letter-spacing: -0.02em; text-overflow: ellipsis; white-space: nowrap; }
.issue-focus p { color: var(--text-muted); font-size: 12px; font-weight: var(--fw-bold); margin: 3px 0 11px; }
.feed-empty { padding: 14px 2px; color: var(--text-muted); font-size: 12.5px; font-weight: var(--fw-bold); }
/* Flache Zeilen mit Trennlinie – vorher standen weiße Kärtchen in einer weißen Karte. */
.analysis-feed { display: grid; }
.feed-row {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 11px 2px;
  border-top: 1px solid rgba(10,27,67,0.08);
  color: inherit;
  text-decoration: none;
}
.feed-row:hover strong { color: var(--home-blue); }
.feed-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); }
.feed-dot.watch { background: var(--amber); }
.feed-dot.critical { background: var(--coral); }
.feed-dot.open { background: var(--home-blue); }
.feed-row strong { display: block; overflow: hidden; color: var(--text); font-size: 13px; font-weight: var(--fw-label); text-overflow: ellipsis; white-space: nowrap; }
.feed-row em { display: block; color: var(--text-muted); font-size: 11px; font-style: normal; font-weight: var(--fw-bold); }
.feed-row b { white-space: nowrap; color: var(--text); font-size: 13.5px; font-weight: var(--fw-heading-strong); }
.feed-row b.good { color: #047857; }
.feed-row b.watch { color: #b45309; }
.feed-row b.critical { color: var(--coral); }
.feed-row b.pending { color: var(--text-muted); font-size: 11px; font-weight: var(--fw-bold); }
.tank-more {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 12px 15px;
  border: 1px dashed rgba(10,27,67,0.16);
  border-radius: 14px;
  background: rgba(255,255,255,0.6);
  text-decoration: none;
}
.tank-more:hover { border-color: var(--home-blue); background: var(--teal-50); }
.tank-more span { color: var(--text-muted); font-size: 12px; font-weight: var(--fw-bold); }
.tank-more b { color: var(--home-blue); font-size: 12px; font-weight: var(--fw-label); white-space: nowrap; }
.insight-dashboard {
  display: grid;
  grid-template-columns: minmax(min(100%, 560px), 1fr) minmax(min(100%, 320px), 0.38fr);
  gap: 24px;
}
.trend-card,
.actions-card { padding: 18px; }
.chronik-mini.large { height: 250px; }
.next-actions { display: grid; gap: 10px; }
.next-action {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border-radius: 18px;
  color: inherit;
  text-decoration: none;
  background: rgba(255,255,255,0.72);
  border: 1px solid rgba(10,27,67,0.08);
}
.next-action:hover { background: var(--teal-50); }
.next-action > span {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  display: grid;
  place-items: center;
  background: var(--teal-100);
  color: var(--teal-800);
  font-size: 11px;
  font-weight: var(--fw-heading-strong);
}
.next-action strong { display: block; color: var(--text); font-size: 14px; font-weight: var(--fw-heading-strong); }
.next-action em { display: block; color: var(--text-muted); font-size: 12px; font-style: normal; font-weight: var(--fw-bold); }
@media (max-width: 1040px) {
  .overview-layout,
  .insight-dashboard { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .dashboard-head { align-items: flex-start; }
  .head-actions { width: 100%; }
  .head-actions .btn { flex: 1 1 auto; }
  .command-strip,
  .tank-grid { grid-template-columns: 1fr; }
  .tank-card { grid-template-columns: 1fr; min-height: 0; }
  .tank-visual { width: 100%; height: 170px; min-height: 170px; }
}
</style>
