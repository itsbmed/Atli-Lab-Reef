<template>
  <div class="analysis-page">
    <section class="analysis-hero">
      <div>
        <span class="hero-kicker">Analysen</span>
        <h1>Ihre Laborberichte</h1>
        <p>Jede eingesendete Wasserprobe mit ihrem aktuellen Stand.</p>
      </div>
      <RouterLink to="/analyses/activate" class="btn btn-primary btn-lg">Neue Analyse registrieren</RouterLink>
    </section>

    <section v-if="isLoading" class="analysis-skeleton" aria-live="polite" aria-label="Analyseberichte werden geladen">
      <article v-for="item in 3" :key="item" class="skeleton-row" aria-hidden="true">
        <span class="skeleton-dot"></span>
        <span class="skeleton-lines"><b></b><i></i></span>
      </article>
    </section>

    <section v-else-if="loadError" class="empty-state error-state" role="alert">
      <span>Laden fehlgeschlagen</span>
      <h2>Die Analyseberichte konnten nicht geladen werden</h2>
      <p>{{ loadError }}</p>
      <button class="btn btn-primary" type="button" @click="loadAnalyses">Erneut versuchen</button>
    </section>

    <section v-else-if="!analyses.count" class="empty-state">
      <span>Analyse-Center</span>
      <h2>Noch keine registrierten Analysen</h2>
      <p>Starten Sie mit einem Testkit-Barcode. Danach ordnen Sie die Probe einem Aquarium zu und verfolgen den Laborstatus.</p>
      <RouterLink to="/analyses/activate" class="btn btn-primary">Erste Analyse registrieren</RouterLink>
    </section>

    <template v-else>
      <div v-if="showFilters" class="list-filters">
        <div class="segmented" role="group" aria-label="Berichte filtern">
          <button v-for="option in filterOptions" :key="option.key" type="button" :class="{ active: activeFilter === option.key }" @click="activeFilter = option.key">
            {{ option.label }} <b>{{ option.count }}</b>
          </button>
        </div>
        <div class="list-tools">
          <label v-if="aquariumOptions.length > 1" class="list-select">
            <span>Aquarium</span>
            <select v-model="aquariumFilter" aria-label="Nach Aquarium filtern">
              <option value="">Alle Aquarien</option>
              <option v-for="option in aquariumOptions" :key="option.key" :value="option.key">{{ option.label }} ({{ option.count }})</option>
            </select>
          </label>
          <label class="list-select">
            <span>Sortieren</span>
            <select v-model="sortKey" aria-label="Berichte sortieren">
              <option v-for="option in SORT_OPTIONS" :key="option.key" :value="option.key">{{ option.label }}</option>
            </select>
          </label>
          <div class="search-box">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" width="16" height="16"><circle cx="9" cy="9" r="6" /><path d="M15 15l-3-3" /></svg>
            <input v-model="search" type="search" placeholder="Aquarium oder Nr. suchen…" aria-label="Analyseberichte durchsuchen" />
          </div>
        </div>
      </div>
      <p v-if="showFilters && filtered" class="list-count">
        {{ visibleAnalyses.length }} von {{ analyses.count }} Berichten
        <button type="button" class="link" @click="resetFilters">Filter zurücksetzen</button>
      </p>

      <section v-if="!visibleAnalyses.length" class="empty-state compact">
        <span>Keine Treffer</span>
        <h2>Keine passenden Analysen</h2>
        <button class="btn btn-ghost" type="button" @click="resetFilters">Alle Berichte anzeigen</button>
      </section>

      <div v-else class="analysis-list">
        <RouterLink v-for="analysis in visibleAnalyses" :key="analysis.id" :to="`/analyses/${analysis.id}`" :class="['analysis-row', analysis.severity]">
          <span class="row-score-cell">
            <span class="row-score" :class="analysis.severity">
              <b>{{ analysis.score ?? '—' }}</b>
              <i v-if="analysis.score !== null && analysis.score !== undefined">%</i>
            </span>
            <em v-if="trendFor(analysis)" :class="['row-trend', trendFor(analysis).tone]" :title="trendFor(analysis).title">{{ trendFor(analysis).label }}</em>
          </span>
          <span class="row-main">
            <strong>{{ analysis.aquariumName }}</strong>
            <span class="row-meta">
              <b class="row-number">Nr. {{ reportLabel(analysis) }}</b>
              <b v-if="analysis.demo" class="row-demo" title="Für die Demo abgeleitet – keine Labormessung">Beispiel</b>
              <span>{{ formatDate(analysis.createdAt) }}</span>
              <span>{{ findingLabel(analysis) }}</span>
            </span>
          </span>
          <AnalysisTimeline class="row-timeline" :analysis="analysis" />
          <span :class="['row-status', analysis.status]">{{ analysis.statusLabel }}</span>
          <span class="row-chevron" aria-hidden="true"><ArrowIcon direction="next" /></span>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import ArrowIcon from '@/components/ui/ArrowIcon.vue'
import { computed, onMounted, ref } from 'vue'
import { useAnalysesStore } from '@/stores/analyses'
import AnalysisTimeline from '@/components/analyses/AnalysisTimeline.vue'

// Filters only earn their space once the list stops fitting on one screen.
const FILTER_THRESHOLD = 4
const SORT_OPTIONS = [
  { key: 'newest', label: 'Neueste zuerst' },
  { key: 'oldest', label: 'Älteste zuerst' },
  { key: 'worst', label: 'Niedrigste Bewertung zuerst' },
  { key: 'best', label: 'Höchste Bewertung zuerst' },
  { key: 'aquarium', label: 'Aquarium A–Z' },
]

const analyses = useAnalysesStore()
const isLoading = ref(true)
const loadError = ref('')
const activeFilter = ref('all')
const search = ref('')
const aquariumFilter = ref('')
const sortKey = ref('newest')

onMounted(loadAnalyses)

const sortedAnalyses = computed(() => [...analyses.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
const aquariumKey = (analysis) => String(analysis.aquariumId || analysis.aquariumName || '')
// Ein Eintrag je Aquarium mit Berichten, alphabetisch.
const aquariumOptions = computed(() => {
  const options = new Map()
  for (const analysis of sortedAnalyses.value) {
    const key = aquariumKey(analysis)
    if (!key) continue
    const option = options.get(key) || { key, label: analysis.aquariumName || 'Ohne Aquarium', count: 0 }
    option.count += 1
    options.set(key, option)
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label, 'de'))
})
// Ohne Bewertung (noch im Labor) stehen beim Sortieren nach Bewertung immer am Ende.
function scoreOf(analysis, fallback) {
  const score = Number(analysis.score)
  return analysis.score === null || analysis.score === undefined || !Number.isFinite(score) ? fallback : score
}
const SORTERS = {
  newest: () => 0,
  oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  worst: (a, b) => scoreOf(a, Infinity) - scoreOf(b, Infinity),
  best: (a, b) => scoreOf(b, -Infinity) - scoreOf(a, -Infinity),
  aquarium: (a, b) => String(a.aquariumName || '').localeCompare(String(b.aquariumName || ''), 'de'),
}
const showFilters = computed(() => analyses.count > FILTER_THRESHOLD)
const filterOptions = computed(() => [
  { key: 'all', label: 'Alle', count: analyses.count },
  { key: 'issues', label: 'Auffällig', count: sortedAnalyses.value.filter(isIssue).length },
  { key: 'open', label: 'Laufend', count: sortedAnalyses.value.filter((analysis) => analysis.status !== 'completed').length },
])
const visibleAnalyses = computed(() => {
  const query = search.value.trim().toLowerCase()
  const rows = sortedAnalyses.value.filter((analysis) => {
    if (activeFilter.value === 'issues' && !isIssue(analysis)) return false
    if (activeFilter.value === 'open' && analysis.status === 'completed') return false
    if (aquariumFilter.value && aquariumKey(analysis) !== aquariumFilter.value) return false
    if (!query) return true
    return [analysis.aquariumName, analysis.reportNumber, analysis.barcode].some((field) => String(field || '').toLowerCase().includes(query))
  })
  // Stabil sortiert: bei Gleichstand bleibt die Reihenfolge „neueste zuerst“.
  return rows.sort(SORTERS[sortKey.value] || SORTERS.newest)
})
const filtered = computed(() => activeFilter.value !== 'all' || Boolean(aquariumFilter.value) || Boolean(search.value.trim()))
// Each completed report remembers the score of the one before it for the same aquarium.
const previousScores = computed(() => {
  const result = {}
  const latestPerAquarium = new Map()
  for (const analysis of [...analyses.items].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
    if (analysis.status !== 'completed' || !Number.isFinite(Number(analysis.score))) continue
    const key = String(analysis.aquariumId || analysis.aquariumName || analysis.id)
    if (latestPerAquarium.has(key)) result[analysis.id] = latestPerAquarium.get(key)
    latestPerAquarium.set(key, Number(analysis.score))
  }
  return result
})
async function loadAnalyses() {
  isLoading.value = true
  loadError.value = ''
  try {
    await Promise.resolve(analyses.load())
  } catch (error) {
    loadError.value = error?.error || error?.message || 'Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut.'
  } finally {
    isLoading.value = false
  }
}

function isIssue(analysis) {
  return analysis.severity === 'critical' || analysis.severity === 'watch'
}
function resetFilters() {
  activeFilter.value = 'all'
  aquariumFilter.value = ''
  search.value = ''
}
function reportLabel(analysis) {
  return analysis.reportNumber || analysis.barcode || '—'
}
function findingLabel(analysis) {
  if (analysis.status !== 'completed') return 'Ergebnis folgt'
  if (!analysis.issueCount) return 'Alle Werte im Zielbereich'
  return `${analysis.issueCount} ${analysis.issueCount === 1 ? 'Hinweis' : 'Hinweise'}`
}
function trendFor(analysis) {
  const previous = previousScores.value[analysis.id]
  if (previous === undefined || !Number.isFinite(Number(analysis.score))) return null
  const delta = Math.round(Number(analysis.score) - previous)
  if (!delta) return { tone: 'flat', label: '±0', title: `Unverändert gegenüber dem letzten Bericht (${previous}%)` }
  return {
    tone: delta > 0 ? 'up' : 'down',
    label: `${delta > 0 ? '▲' : '▼'} ${delta > 0 ? '+' : '−'}${Math.abs(delta)}`,
    title: `${delta > 0 ? 'Besser' : 'Schlechter'} als der letzte Bericht dieses Aquariums (${previous}%)`,
  }
}
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.analysis-page { display: grid; gap: 18px; }
.analysis-hero { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: clamp(22px, 3vw, 30px); border-radius: 24px; color: #fff; background: linear-gradient(120deg, rgba(10,27,67,0.96), rgba(0,51,102,0.84)), url('/reef-tank.webp') center / cover; box-shadow: var(--shadow); }
.hero-kicker { display: block; margin-bottom: 7px; color: var(--brand-sky); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.analysis-hero h1 { margin-bottom: 6px; font-size: clamp(26px, 3.4vw, 38px); line-height: 1.05; font-weight: 800; letter-spacing: -0.03em; }
.analysis-hero p { color: rgba(255,255,255,0.74); font-size: 14px; line-height: 1.55; }


.list-filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.segmented { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(136,193,233,0.16); }
.segmented button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border: 0; border-radius: 999px; background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 800; cursor: pointer; }
.segmented button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 6px 16px rgba(10,27,67,0.08); }
.segmented b { color: var(--text-muted); font-size: 11px; }
.segmented button.active b { color: var(--brand-blue); }
.list-tools { display: flex; flex: 1 1 auto; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.list-select { position: relative; display: block; }
/* Die Beschriftung steht nur für Screenreader; das Feld nennt seinen Wert selbst. */
.list-select > span { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.list-select select { min-height: 42px; max-width: 220px; padding: 0 12px; border: 1px solid var(--border); border-radius: 13px; background-color: #fff; color: var(--text); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; outline: 0; }
.list-select select:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }
.list-count { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; margin-top: -6px; color: var(--text-muted); font-size: 12.5px; font-weight: 600; }
.list-count .link { padding: 0; border: 0; background: none; color: var(--brand-blue); font: inherit; cursor: pointer; }
.list-count .link:hover { text-decoration: underline; }
.search-box { position: relative; flex: 0 1 230px; min-width: min(100%, 180px); }
.search-box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-box input { width: 100%; min-height: 42px; padding: 0 12px 0 36px; border: 1px solid var(--border); border-radius: 13px; background: #fff; color: var(--text); font: inherit; font-size: 13px; outline: 0; }
.search-box input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }

.analysis-list { display: grid; gap: 9px; }
.analysis-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto 18px; align-items: center; gap: 15px; padding: 15px 18px; border: 1px solid rgba(136,193,233,0.22); border-left: 4px solid #10b981; border-radius: 16px; background: #fff; box-shadow: var(--shadow); color: inherit; text-decoration: none; transition: transform .16s, border-color .16s, box-shadow .16s; }
.analysis-row:hover { transform: translateY(-1px); border-color: var(--teal-400); box-shadow: 0 10px 24px rgba(10,27,67,0.09); }
.analysis-row.watch { border-left-color: #f59e0b; }
.analysis-row.critical { border-left-color: #e85d4f; }
.analysis-row.open { border-left-color: #88c1e9; }
.row-score-cell { display: grid; justify-items: center; gap: 5px; }
.row-score { display: grid; place-items: center; align-content: center; width: 52px; height: 52px; border-radius: 50%; background: #ecfdf5; color: #047857; }
.row-trend { display: inline-flex; align-items: center; gap: 2px; padding: 2px 7px; border-radius: 999px; background: #eef3f8; color: var(--text-muted); font-size: 9.5px; font-style: normal; font-weight: 850; white-space: nowrap; font-variant-numeric: tabular-nums; }
.row-trend.up { background: #dcfce7; color: #047857; }
.row-trend.down { background: #fdecea; color: #b53a2e; }
.row-score.watch { background: #fff7ed; color: #92400e; }
.row-score.critical { background: #fdecea; color: #b53a2e; }
.row-score.open { background: #eef5fb; color: var(--brand-blue); }
.row-score b { font-size: 16px; font-weight: 850; line-height: 1; }
.row-score i { margin-top: 1px; font-size: 9px; font-style: normal; font-weight: 800; opacity: 0.75; }
.row-main { min-width: 0; }
.row-main strong { display: block; overflow: hidden; color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -0.02em; text-overflow: ellipsis; white-space: nowrap; }
.row-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 4px; color: var(--text-muted); font-size: 12.5px; }
.row-meta > span::before { margin-right: 6px; color: #b9c7d1; content: '·'; }
.row-demo { padding: 2px 7px; border-radius: 6px; background: #f1f5f9; color: var(--text-muted); font-size: 10.5px; font-weight: 700; letter-spacing: 0.02em; }
.row-number { padding: 2px 7px; border-radius: 6px; background: #eef5fb; color: var(--brand-blue); font-size: 11px; font-weight: 850; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.row-timeline { display: none; }
@media (min-width: 1180px) {
  .analysis-row { grid-template-columns: 54px minmax(0, 1fr) minmax(300px, 380px) 18px; gap: 26px; }
  .row-timeline { display: block; margin-right: 18px; }
  /* Die Zeitleiste zeigt den Status schon; der Text bleibt nur für Screenreader. */
  .row-status { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
}
.row-status { padding: 6px 11px; border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: 11px; font-weight: 800; white-space: nowrap; }
.row-status.completed { background: #dcfce7; color: #047857; }
.row-status.received, .row-status.in_analysis { background: #fff7ed; color: #92400e; }
.row-chevron { color: var(--brand-blue); font-size: 22px; line-height: 1; }

.empty-state { display: grid; justify-items: center; text-align: center; gap: 10px; padding: clamp(30px, 5vw, 48px); border: 1px solid rgba(136,193,233,0.22); border-radius: 22px; background: #fff; box-shadow: var(--shadow); }
.empty-state.compact { padding: 28px; }
.empty-state span { color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.empty-state h2 { color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
.empty-state p { max-width: 520px; color: var(--text-muted); line-height: 1.6; }
.error-state { border-color: rgba(232,93,79,0.28); }
.error-state > span { color: var(--coral); }

.analysis-skeleton { display: grid; gap: 9px; }
.skeleton-row { display: grid; grid-template-columns: 52px minmax(0, 1fr); align-items: center; gap: 15px; padding: 15px 18px; border: 1px solid rgba(136,193,233,0.18); border-radius: 16px; background: #fff; box-shadow: var(--shadow); }
.skeleton-dot, .skeleton-lines b, .skeleton-lines i { display: block; border-radius: 999px; background: linear-gradient(90deg, #e8eff6 20%, #f7fafe 42%, #e8eff6 64%); background-size: 220% 100%; animation: skeleton-shimmer 1.25s ease-in-out infinite; }
.skeleton-dot { width: 52px; height: 52px; border-radius: 50%; }
.skeleton-lines { display: grid; gap: 8px; }
.skeleton-lines b { width: 42%; height: 15px; }
.skeleton-lines i { width: 64%; height: 11px; }
@keyframes skeleton-shimmer { to { background-position: -120% 0; } }

@media (max-width: 680px) {
  .analysis-hero { align-items: flex-start; flex-direction: column; }
  .analysis-hero .btn { width: 100%; }
  .analysis-row { grid-template-columns: 46px minmax(0, 1fr) auto; gap: 12px; padding: 14px; }
  .row-score { width: 44px; height: 44px; }
  .row-meta { font-size: 11.5px; }
  .row-trend { font-size: 9px; }
  .row-chevron { display: none; }
  .list-filters { align-items: stretch; flex-direction: column; }
  .list-tools { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .list-tools .search-box { grid-column: 1 / -1; }
  .list-select select { width: 100%; max-width: none; }
  .segmented { justify-content: space-between; }
}
</style>
