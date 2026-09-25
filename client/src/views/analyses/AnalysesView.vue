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
      <RouterLink v-if="attention" :to="`/analyses/${attention.id}`" :class="['attention-banner', attention.severity]">
        <i aria-hidden="true">!</i>
        <span>
          <strong>{{ attentionTitle }}</strong>
          <small>{{ attention.aquariumName }} · {{ attention.issueCount }} {{ attention.issueCount === 1 ? 'Hinweis' : 'Hinweise' }}</small>
        </span>
        <em>Bericht öffnen →</em>
      </RouterLink>

      <div v-if="showFilters" class="list-filters">
        <div class="segmented" role="group" aria-label="Berichte filtern">
          <button v-for="option in filterOptions" :key="option.key" type="button" :class="{ active: activeFilter === option.key }" @click="activeFilter = option.key">
            {{ option.label }} <b>{{ option.count }}</b>
          </button>
        </div>
        <div v-if="analyses.count > SEARCH_THRESHOLD" class="search-box">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" width="16" height="16"><circle cx="9" cy="9" r="6" /><path d="M15 15l-3-3" /></svg>
          <input v-model="search" type="search" placeholder="Aquarium suchen…" aria-label="Analyseberichte durchsuchen" />
        </div>
      </div>

      <section v-if="!visibleAnalyses.length" class="empty-state compact">
        <span>Keine Treffer</span>
        <h2>Keine passenden Analysen</h2>
        <button class="btn btn-ghost" type="button" @click="resetFilters">Alle Berichte anzeigen</button>
      </section>

      <div v-else class="analysis-list">
        <RouterLink v-for="analysis in visibleAnalyses" :key="analysis.id" :to="`/analyses/${analysis.id}`" :class="['analysis-row', analysis.severity]">
          <span class="row-score" :class="analysis.severity">
            <b>{{ analysis.score ?? '—' }}</b>
            <i v-if="analysis.score !== null && analysis.score !== undefined">%</i>
          </span>
          <span class="row-main">
            <strong>{{ analysis.aquariumName }}</strong>
            <small>{{ rowCaption(analysis) }}</small>
          </span>
          <span :class="['row-status', analysis.status]">{{ analysis.statusLabel }}</span>
          <span class="row-chevron" aria-hidden="true">›</span>
        </RouterLink>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAnalysesStore } from '@/stores/analyses'

// Filters only earn their space once the list stops fitting on one screen.
const FILTER_THRESHOLD = 4
const SEARCH_THRESHOLD = 8

const analyses = useAnalysesStore()
const isLoading = ref(true)
const loadError = ref('')
const activeFilter = ref('all')
const search = ref('')

onMounted(loadAnalyses)

const sortedAnalyses = computed(() => [...analyses.items].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)))
const showFilters = computed(() => analyses.count > FILTER_THRESHOLD)
const filterOptions = computed(() => [
  { key: 'all', label: 'Alle', count: analyses.count },
  { key: 'issues', label: 'Auffällig', count: sortedAnalyses.value.filter(isIssue).length },
  { key: 'open', label: 'Laufend', count: sortedAnalyses.value.filter((analysis) => analysis.status !== 'completed').length },
])
const visibleAnalyses = computed(() => {
  const query = search.value.trim().toLowerCase()
  return sortedAnalyses.value.filter((analysis) => {
    if (activeFilter.value === 'issues' && !isIssue(analysis)) return false
    if (activeFilter.value === 'open' && analysis.status === 'completed') return false
    return !query || String(analysis.aquariumName || '').toLowerCase().includes(query)
  })
})
// The single most urgent finished report, so the page opens with the one thing to act on.
const attention = computed(() => sortedAnalyses.value.find((analysis) => analysis.severity === 'critical')
  || sortedAnalyses.value.find((analysis) => analysis.severity === 'watch')
  || null)
const attentionTitle = computed(() => (attention.value?.severity === 'critical' ? 'Dieser Bericht braucht Ihre Aufmerksamkeit' : 'Ein Bericht zeigt Auffälligkeiten'))

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
  search.value = ''
}
function rowCaption(analysis) {
  const date = formatDate(analysis.createdAt)
  if (analysis.status !== 'completed') return `Eingereicht am ${date} · Ergebnis folgt`
  if (!analysis.issueCount) return `${date} · Alle Werte im Zielbereich`
  return `${date} · ${analysis.issueCount} ${analysis.issueCount === 1 ? 'Hinweis' : 'Hinweise'}`
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

.attention-banner { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 14px; padding: 16px 18px; border: 1px solid #fed7aa; border-left: 4px solid #f59e0b; border-radius: 16px; background: #fff7ed; color: inherit; text-decoration: none; transition: border-color .16s, box-shadow .16s; }
.attention-banner.critical { border-color: #f8c9c4; border-left-color: #e85d4f; background: #fff7f5; }
.attention-banner:hover { box-shadow: 0 8px 22px rgba(10,27,67,0.08); }
.attention-banner > i { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; background: #f59e0b; color: #fff; font-size: 18px; font-style: normal; font-weight: 900; }
.attention-banner.critical > i { background: #e85d4f; }
.attention-banner strong { display: block; color: var(--text); font-size: 15px; font-weight: 800; }
.attention-banner small { display: block; margin-top: 2px; color: var(--text-muted); font-size: 12px; }
.attention-banner em { color: var(--brand-blue); font-size: 12px; font-style: normal; font-weight: 850; white-space: nowrap; }

.list-filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.segmented { display: inline-flex; gap: 4px; padding: 4px; border-radius: 999px; background: rgba(136,193,233,0.16); }
.segmented button { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border: 0; border-radius: 999px; background: transparent; color: var(--text-muted); font-size: 12.5px; font-weight: 800; cursor: pointer; }
.segmented button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 6px 16px rgba(10,27,67,0.08); }
.segmented b { color: var(--text-muted); font-size: 11px; }
.segmented button.active b { color: var(--brand-blue); }
.search-box { position: relative; min-width: min(100%, 250px); }
.search-box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-box input { width: 100%; min-height: 42px; padding: 0 12px 0 36px; border: 1px solid var(--border); border-radius: 13px; background: #fff; color: var(--text); font: inherit; font-size: 13px; outline: 0; }
.search-box input:focus { border-color: var(--brand-blue); box-shadow: var(--shadow-focus); }

.analysis-list { display: grid; gap: 9px; }
.analysis-row { display: grid; grid-template-columns: 54px minmax(0, 1fr) auto 18px; align-items: center; gap: 15px; padding: 15px 18px; border: 1px solid rgba(136,193,233,0.22); border-left: 4px solid #10b981; border-radius: 16px; background: #fff; box-shadow: var(--shadow); color: inherit; text-decoration: none; transition: transform .16s, border-color .16s, box-shadow .16s; }
.analysis-row:hover { transform: translateY(-1px); border-color: var(--teal-400); box-shadow: 0 10px 24px rgba(10,27,67,0.09); }
.analysis-row.watch { border-left-color: #f59e0b; }
.analysis-row.critical { border-left-color: #e85d4f; }
.analysis-row.open { border-left-color: #88c1e9; }
.row-score { display: grid; place-items: center; align-content: center; width: 52px; height: 52px; border-radius: 50%; background: #ecfdf5; color: #047857; }
.row-score.watch { background: #fff7ed; color: #92400e; }
.row-score.critical { background: #fdecea; color: #b53a2e; }
.row-score.open { background: #eef5fb; color: var(--brand-blue); }
.row-score b { font-size: 16px; font-weight: 850; line-height: 1; }
.row-score i { margin-top: 1px; font-size: 9px; font-style: normal; font-weight: 800; opacity: 0.75; }
.row-main { min-width: 0; }
.row-main strong { display: block; overflow: hidden; color: var(--text); font-size: 17px; font-weight: 800; letter-spacing: -0.02em; text-overflow: ellipsis; white-space: nowrap; }
.row-main small { display: block; margin-top: 3px; color: var(--text-muted); font-size: 12.5px; }
.row-status { padding: 6px 11px; border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: 11px; font-weight: 800; white-space: nowrap; }
.row-status.completed { background: #dcfce7; color: #047857; }
.row-status.received, .row-status.in_analysis { background: #fff7ed; color: #92400e; }
.row-chevron { color: var(--brand-blue); font-size: 22px; line-height: 1; }

.empty-state { display: grid; justify-items: center; text-align: center; gap: 10px; padding: clamp(30px, 5vw, 48px); border: 1px solid rgba(136,193,233,0.22); border-radius: 22px; background: #fff; box-shadow: var(--shadow); }
.empty-state.compact { padding: 28px; }
.empty-state span { color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.empty-state h2 { color: var(--text); font-size: 24px; font-weight: 800; letter-spacing: -0.03em; }
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
  .attention-banner { grid-template-columns: 38px minmax(0, 1fr); }
  .attention-banner em { grid-column: 2; }
  .analysis-row { grid-template-columns: 46px minmax(0, 1fr) auto; gap: 12px; padding: 14px; }
  .row-score { width: 44px; height: 44px; }
  .row-chevron { display: none; }
  .list-filters { align-items: stretch; flex-direction: column; }
  .segmented { justify-content: space-between; }
}
</style>
