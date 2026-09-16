<template>
  <div class="report-page recommendations-page">
    <section class="recommendations-hero">
      <div>
        <span class="hero-kicker">Pflegeplan</span>
        <h1>Was jetzt zu tun ist</h1>
        <p>Die neuesten Laborberichte Ihrer Aquarien werden zu einem priorisierten Pflegeplan zusammengeführt.</p>
      </div>
      <div class="hero-status">
        <strong>{{ scopedOpenItems.length }}</strong>
        <span>{{ scopedOpenItems.length === 1 ? 'offene Maßnahme' : 'offene Maßnahmen' }}</span>
        <em>{{ selectedAquarium === 'all' ? `${latestReports.length} Aquarien geprüft` : selectedAquariumName }}</em>
      </div>
    </section>

    <section v-if="loading" class="recommendation-skeleton" aria-live="polite" aria-label="Empfehlungen werden geladen">
      <span v-for="item in 3" :key="item"></span>
    </section>

    <EmptyState
      v-else-if="!latestReports.length"
      kicker="Noch kein Pflegeplan"
      title="Empfehlungen entstehen nach Ihrer ersten Analyse"
      message="Registrieren Sie ein Testkit und ordnen Sie es einem Aquarium zu. Sobald der Bericht abgeschlossen ist, erscheinen die nächsten Schritte hier."
      mark="ATI"
    >
      <template #actions>
        <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        <RouterLink to="/analyses" class="btn btn-ghost">Analysen ansehen</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
      <section class="recommendation-stats" aria-label="Pflegeplan Übersicht">
        <article>
          <span>Offen</span>
          <strong>{{ scopedOpenItems.length }}</strong>
          <em>aus aktuellen Berichten</em>
        </article>
        <article class="critical">
          <span>Hohe Priorität</span>
          <strong>{{ scopedHighItems.length }}</strong>
          <em>zuerst bearbeiten</em>
        </article>
        <article class="due">
          <span>Kontrolle fällig</span>
          <strong>{{ scopedDueItems.length }}</strong>
          <em>heute oder überfällig</em>
        </article>
        <article class="done">
          <span>Erledigt</span>
          <strong>{{ scopedCompletedItems.length }}</strong>
          <em>im aktuellen Pflegeplan</em>
        </article>
      </section>

      <section class="recommendation-workspace">
        <aside class="recommendation-sidebar">
          <div class="filter-card card">
            <div class="filter-heading">
              <span>Ansicht</span>
              <button v-if="selectedAquarium !== 'all' || statusFilter !== 'open'" type="button" @click="resetFilters">Zurücksetzen</button>
            </div>
            <div class="form-group">
              <label for="recommendation-aquarium">Aquarium</label>
              <select id="recommendation-aquarium" v-model="selectedAquarium">
                <option value="all">Alle Aquarien</option>
                <option v-for="aquarium in aquariumOptions" :key="aquarium.id" :value="aquarium.id">{{ aquarium.name }}</option>
              </select>
            </div>
            <span id="recommendation-status-label" class="filter-label">Status</span>
            <div class="status-switch" role="group" aria-labelledby="recommendation-status-label">
              <button type="button" :class="{ active: statusFilter === 'open' }" :aria-pressed="statusFilter === 'open'" @click="statusFilter = 'open'">Offen</button>
              <button type="button" :class="{ active: statusFilter === 'done' }" :aria-pressed="statusFilter === 'done'" @click="statusFilter = 'done'">Erledigt</button>
              <button type="button" :class="{ active: statusFilter === 'all' }" :aria-pressed="statusFilter === 'all'" @click="statusFilter = 'all'">Alle</button>
            </div>
          </div>

          <div class="source-card card">
            <header>
              <span>Aktuelle Grundlage</span>
              <small>Je Aquarium zählt der neueste fertige Bericht.</small>
            </header>
            <button
              v-for="report in scopedReports"
              :key="report.id"
              type="button"
              :class="['source-report', { active: String(report.aquariumId) === String(selectedAquarium) }]"
              @click="selectedAquarium = report.aquariumId"
            >
              <span :class="['source-score', report.severity]">{{ report.score ?? '–' }}</span>
              <span class="source-copy">
                <strong>{{ report.aquariumName }}</strong>
                <small>{{ report.reportNumber }} · {{ formatDate(reportDate(report)) }}</small>
                <em>{{ report.recommendationGroups?.length || 0 }} Empfehlungen · {{ historicalCount(report) }} ältere Berichte</em>
              </span>
            </button>
          </div>
        </aside>

        <main class="recommendation-results">
          <header class="results-heading">
            <div>
              <span>{{ selectedAquarium === 'all' ? 'Alle aktuellen Pflegepläne' : selectedAquariumName }}</span>
              <h2>{{ resultHeading }}</h2>
            </div>
            <strong>{{ visibleItems.length }}</strong>
          </header>

          <div v-if="visibleItems.length" class="recommendation-list">
            <article
              v-for="item in visibleItems"
              :key="item.id"
              :class="['recommendation-card', item.tone, { completed: isCompleted(item), expanded: expandedItems[item.id] }]"
            >
              <div class="recommendation-card-main">
                <button
                  type="button"
                  class="completion-toggle"
                  :aria-label="isCompleted(item) ? `${item.title} wieder öffnen` : `${item.title} als erledigt markieren`"
                  :aria-pressed="isCompleted(item)"
                  @click="toggleCompleted(item)"
                >
                  {{ isCompleted(item) ? '✓' : '○' }}
                </button>
                <button
                  type="button"
                  class="recommendation-toggle"
                  :aria-expanded="Boolean(expandedItems[item.id])"
                  :aria-controls="`recommendation-detail-${safeId(item.id)}`"
                  @click="expandedItems[item.id] = !expandedItems[item.id]"
                >
                  <span class="recommendation-meta">
                    <b :class="['priority-badge', item.tone]">{{ priorityLabel(item.priority) }}</b>
                    <em>{{ item.aquariumName }}</em>
                    <em>{{ item.reportNumber }}</em>
                  </span>
                  <strong>{{ item.title }}</strong>
                  <span class="recommendation-summary">{{ item.summary }}</span>
                  <span class="parameter-list"><b v-for="parameter in item.parameters" :key="parameter">{{ parameter }}</b></span>
                </button>
                <div class="recommendation-due" :class="dueTone(item)">
                  <span>{{ dueLabel(item) }}</span>
                  <small>{{ formatDate(item.dueDate) }}</small>
                </div>
              </div>

              <Transition name="recommendation-detail">
                <div v-show="expandedItems[item.id]" :id="`recommendation-detail-${safeId(item.id)}`" class="recommendation-detail">
                  <div>
                    <span>Warum diese Maßnahme?</span>
                    <p v-for="why in item.whys" :key="why">{{ why }}</p>
                  </div>
                  <div>
                    <span>So gehen Sie vor</span>
                    <ol><li v-for="step in item.steps" :key="step">{{ step }}</li></ol>
                  </div>
                </div>
              </Transition>
              <ProductSuggestions v-if="productsFor(item).length" class="recommendation-product-section" :products="productsFor(item)" />

              <footer class="recommendation-actions">
                <RouterLink :to="`/analyses/${item.analysisId}`" class="btn btn-ghost btn-sm">Quellbericht öffnen</RouterLink>
                <RouterLink :to="{ path: '/tools', query: { tool: 'dosing', aquarium: item.aquariumId, analysis: item.analysisId } }" class="btn btn-ghost btn-sm">Dosierplan prüfen</RouterLink>
                <button type="button" class="btn btn-primary btn-sm" @click="toggleCompleted(item)">{{ isCompleted(item) ? 'Wieder öffnen' : 'Als erledigt markieren' }}</button>
              </footer>
            </article>
          </div>

          <EmptyState
            v-else
            :kicker="statusFilter === 'done' ? 'Noch nichts abgeschlossen' : 'Aktueller Pflegeplan'"
            :title="emptyTitle"
            :message="emptyMessage"
            :mark="statusFilter === 'done' ? '00' : 'OK'"
            tone="compact"
          >
            <template #actions>
              <button v-if="statusFilter !== 'open'" type="button" class="btn btn-primary" @click="statusFilter = 'open'">Offene Maßnahmen zeigen</button>
              <RouterLink v-else to="/analyses" class="btn btn-ghost">Berichte ansehen</RouterLink>
            </template>
          </EmptyState>
        </main>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAnalysesStore } from '@/stores/analyses'
import { useAquariumsStore } from '@/stores/aquariums'
import { useAuthStore } from '@/stores/auth'
import { buildRecommendationItems, latestCompletedByAquarium } from '@/services/recommendationsHub'
import { loadRecommendationProgress, saveRecommendationProgress } from '@/services/recommendationProgress'
import { recommendedProductsForKeys } from '@/services/dosingConfig'
import '@/assets/styles/report-base.css'
import EmptyState from '@/components/ui/EmptyState.vue'
import ProductSuggestions from '@/components/analyses/ProductSuggestions.vue'

const analyses = useAnalysesStore()
const aquariums = useAquariumsStore()
const auth = useAuthStore()
const loading = ref(true)
const selectedAquarium = ref('all')
const statusFilter = ref('open')
const expandedItems = reactive({})
const progressByAnalysis = reactive({})

const aquariumOptions = computed(() => aquariums.items.filter((item) => !['Osmosewasser', 'Meersalz'].includes(item.water_type)))
const completedAnalyses = computed(() => analyses.items.filter((item) => item.status === 'completed'))
const latestReports = computed(() => latestCompletedByAquarium(completedAnalyses.value))
const recommendationItems = computed(() => buildRecommendationItems(latestReports.value))
const scopedReports = computed(() => selectedAquarium.value === 'all'
  ? latestReports.value
  : latestReports.value.filter((report) => String(report.aquariumId) === String(selectedAquarium.value)))
const scopedItems = computed(() => selectedAquarium.value === 'all'
  ? recommendationItems.value
  : recommendationItems.value.filter((item) => String(item.aquariumId) === String(selectedAquarium.value)))
const scopedOpenItems = computed(() => scopedItems.value.filter((item) => !isCompleted(item)))
const scopedCompletedItems = computed(() => scopedItems.value.filter(isCompleted))
const scopedHighItems = computed(() => scopedOpenItems.value.filter((item) => item.priority === 'Hoch'))
const scopedDueItems = computed(() => scopedOpenItems.value.filter((item) => item.dueDate <= startOfTomorrow()))
const visibleItems = computed(() => scopedItems.value.filter((item) => {
  if (statusFilter.value === 'open') return !isCompleted(item)
  if (statusFilter.value === 'done') return isCompleted(item)
  return true
}))
const selectedAquariumName = computed(() => aquariumOptions.value.find(
  (item) => String(item.id) === String(selectedAquarium.value),
)?.name || scopedReports.value[0]?.aquariumName || 'Aquarium')
const resultHeading = computed(() => {
  if (statusFilter.value === 'done') return 'Erledigte Maßnahmen'
  if (statusFilter.value === 'all') return 'Alle Maßnahmen'
  return 'Offene Maßnahmen nach Priorität'
})
const emptyTitle = computed(() => {
  if (statusFilter.value === 'done') return 'Noch keine Maßnahme erledigt'
  if (scopedItems.value.length) return 'Alle Maßnahmen sind erledigt'
  return 'Für den aktuellen Bericht ist kein Eingriff nötig'
})
const emptyMessage = computed(() => {
  if (statusFilter.value === 'done') return 'Erledigte Schritte erscheinen hier und bleiben mit dem Quellbericht synchronisiert.'
  if (scopedItems.value.length) return 'Der aktuelle Pflegeplan ist abgeschlossen. Neue Empfehlungen entstehen mit dem nächsten fertigen Laborbericht.'
  return 'Die Werte des neuesten Berichts lösen keine aktive Empfehlung aus. Behalten Sie die bestehende Pflege bei.'
})

function syncProgress() {
  for (const report of latestReports.value) {
    progressByAnalysis[report.id] = loadRecommendationProgress(auth.user?.id, report.id)
  }
}

function isCompleted(item) {
  return Boolean(progressByAnalysis[item.analysisId]?.[item.key])
}

function productsFor(item) {
  return recommendedProductsForKeys(item.parameterKeys, item.sourceParameters)
}

function toggleCompleted(item) {
  const current = progressByAnalysis[item.analysisId] || {}
  progressByAnalysis[item.analysisId] = { ...current, [item.key]: !current[item.key] }
  saveRecommendationProgress(auth.user?.id, item.analysisId, progressByAnalysis[item.analysisId])
}

function resetFilters() {
  selectedAquarium.value = 'all'
  statusFilter.value = 'open'
}

function reportDate(report) {
  return report.completedAt || report.createdAt
}

function historicalCount(report) {
  return Math.max(0, completedAnalyses.value.filter(
    (item) => String(item.aquariumId) === String(report.aquariumId),
  ).length - 1)
}

function startOfTomorrow() {
  const date = new Date()
  date.setHours(24, 0, 0, 0)
  return date
}

function calendarDaysUntil(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

function dueLabel(item) {
  if (isCompleted(item)) return 'Erledigt'
  const days = calendarDaysUntil(item.dueDate)
  if (days < 0) return `${Math.abs(days)} T. überfällig`
  if (days === 0) return 'Heute kontrollieren'
  if (days === 1) return 'Morgen kontrollieren'
  return `Kontrolle in ${days} Tagen`
}

function priorityLabel(priority) {
  return priority === 'Hoch' ? 'Hohe Priorität' : 'Mittlere Priorität'
}

function dueTone(item) {
  if (isCompleted(item)) return 'done'
  const days = calendarDaysUntil(item.dueDate)
  if (days <= 0) return 'overdue'
  if (days <= 3) return 'soon'
  return ''
}

function formatDate(value) {
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '-')
}

onMounted(() => {
  try {
    aquariums.load()
    analyses.load()
    syncProgress()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.recommendations-page { display: grid; gap: 20px; }
.recommendations-hero {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 30px;
  min-height: 220px; padding: 34px 38px; overflow: hidden; position: relative;
  border-radius: 28px; color: #fff; box-shadow: var(--shadow-md);
  background: linear-gradient(112deg, rgba(10,27,67,.98), rgba(18,66,109,.92) 58%, rgba(0,114,206,.74)), url('/reeftech-pattern.jpg') center / cover;
}
.recommendations-hero::after { content: ''; position: absolute; width: 260px; height: 260px; right: -70px; top: -105px; border: 1px solid rgba(136,225,239,.22); border-radius: 50%; }
.recommendations-hero > * { position: relative; z-index: 1; }
.hero-kicker { display: block; margin-bottom: 10px; color: var(--brand-cyan); font-size: 11px; font-weight: 900; letter-spacing: .14em; text-transform: uppercase; }
.recommendations-hero h1 { max-width: 690px; margin: 0 0 12px; font-size: clamp(34px, 5vw, 54px); line-height: 1; letter-spacing: -.05em; }
.recommendations-hero p { max-width: 650px; margin: 0; color: rgba(255,255,255,.72); line-height: 1.65; }
.hero-status { min-width: 190px; padding: 24px; border: 1px solid rgba(255,255,255,.16); border-radius: 22px; background: rgba(255,255,255,.1); backdrop-filter: blur(12px); }
.hero-status strong,.hero-status span,.hero-status em { display: block; }
.hero-status strong { font-size: 50px; line-height: .9; letter-spacing: -.06em; }
.hero-status span { margin-top: 8px; font-size: 13px; font-weight: 800; }
.hero-status em { margin-top: 9px; color: rgba(255,255,255,.62); font-size: 11px; font-style: normal; }
.recommendation-skeleton { display: grid; gap: 14px; }
.recommendation-skeleton span { height: 140px; border-radius: 20px; background: linear-gradient(90deg,#eef4f8,#f8fbfd,#eef4f8); background-size: 200% 100%; animation: pulse 1.4s infinite; }
@keyframes pulse { to { background-position: -200% 0; } }
.recommendation-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.recommendation-stats article { padding: 18px 20px; border: 1px solid rgba(136,193,233,.24); border-top: 3px solid var(--brand-blue); border-radius: 17px; background: #fff; box-shadow: var(--shadow); }
.recommendation-stats article.critical { border-top-color: #e85d4f; }.recommendation-stats article.due { border-top-color: #f59e0b; }.recommendation-stats article.done { border-top-color: #10b981; }
.recommendation-stats span,.recommendation-stats em { display: block; }.recommendation-stats span { color: var(--text-muted); font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
.recommendation-stats strong { display: block; margin: 4px 0; color: var(--brand-navy); font-size: 28px; }.recommendation-stats em { color: var(--text-muted); font-size: 11px; font-style: normal; }
.recommendation-workspace { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 18px; align-items: start; }
.recommendation-sidebar { display: grid; gap: 14px; position: sticky; top: 84px; }.filter-card,.source-card { padding: 18px; }
.filter-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }.filter-heading span,.source-card header span { color: var(--brand-navy); font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; }.filter-heading button { border: 0; background: none; color: var(--brand-blue); font: inherit; font-size: 11px; font-weight: 800; cursor: pointer; }
.filter-label { display: block; margin: 14px 0 7px; color: var(--text); font-size: 11px; font-weight: 850; }.status-switch { display: grid; grid-template-columns: repeat(3,1fr); padding: 3px; border-radius: 11px; background: #edf4f8; }.status-switch button { padding: 8px 4px; border: 0; border-radius: 8px; background: transparent; color: var(--text-muted); font-size: 11px; font-weight: 800; cursor: pointer; }.status-switch button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 3px 10px rgba(10,27,67,.09); }
.source-card header { display: grid; gap: 4px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }.source-card header small { color: var(--text-muted); line-height: 1.4; }
.source-report { display: grid; grid-template-columns: 40px 1fr; gap: 10px; width: 100%; padding: 13px 4px; border: 0; border-bottom: 1px solid var(--border); background: transparent; text-align: left; cursor: pointer; }.source-report:last-child { border-bottom: 0; }.source-report.active .source-copy strong { color: var(--brand-blue); }
.source-score { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; background: var(--teal-50); color: var(--teal-700); font-size: 13px; font-weight: 900; }.source-score.critical { background: var(--coral-bg); color: #c74338; }.source-score.watch { background: var(--amber-bg); color: #a16207; }
.source-copy strong,.source-copy small,.source-copy em { display: block; }.source-copy strong { color: var(--text); font-size: 12px; }.source-copy small { margin-top: 2px; color: var(--text-muted); font-size: 10px; }.source-copy em { margin-top: 5px; color: var(--teal-700); font-size: 9px; font-style: normal; font-weight: 750; }
.recommendation-results { min-width: 0; }.results-heading { display: flex; align-items: end; justify-content: space-between; margin: 4px 2px 13px; }.results-heading span { color: var(--text-muted); font-size: 10px; font-weight: 850; letter-spacing: .08em; text-transform: uppercase; }.results-heading h2 { margin-top: 3px; color: var(--brand-navy); font-size: 21px; }.results-heading > strong { display: grid; place-items: center; min-width: 38px; height: 38px; border-radius: 12px; background: var(--brand-navy); color: #fff; }
.recommendation-list { display: grid; gap: 13px; }.recommendation-card { overflow: hidden; border: 1px solid rgba(136,193,233,.26); border-left: 4px solid #f59e0b; border-radius: 18px; background: #fff; box-shadow: var(--shadow); }.recommendation-card.critical { border-left-color: #e85d4f; }.recommendation-card.completed { border-left-color: #10b981; opacity: .78; }.recommendation-card.completed .recommendation-toggle > strong { text-decoration: line-through; text-decoration-color: #8aa1b4; }
.recommendation-card-main { display: grid; grid-template-columns: 40px minmax(0,1fr) 132px; gap: 12px; align-items: start; padding: 18px; }.completion-toggle { display: grid; place-items: center; width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 50%; background: #f7fbfd; color: var(--brand-blue); font-size: 20px; cursor: pointer; }.completed .completion-toggle { border-color: #10b981; background: #10b981; color: #fff; }
.recommendation-toggle { min-width: 0; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; }.recommendation-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }.recommendation-meta em { color: var(--text-muted); font-size: 10px; font-style: normal; }.priority-badge { padding: 4px 7px; border-radius: 999px; background: var(--amber-bg); color: #9a5c00; font-size: 9px; text-transform: uppercase; letter-spacing: .06em; }.priority-badge.critical { background: var(--coral-bg); color: #bd3d34; }
.recommendation-toggle > strong { display: block; margin-top: 8px; color: var(--brand-navy); font-size: 16px; line-height: 1.25; }.recommendation-summary { display: block; margin-top: 5px; color: var(--text-muted); font-size: 12px; line-height: 1.55; }.parameter-list { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 9px; }.parameter-list b { padding: 4px 7px; border-radius: 7px; background: var(--teal-50); color: var(--teal-700); font-size: 9px; }
.recommendation-due { padding: 9px 10px; border-radius: 11px; background: #f4f8fb; text-align: right; }.recommendation-due span,.recommendation-due small { display: block; }.recommendation-due span { color: var(--text); font-size: 10px; font-weight: 850; }.recommendation-due small { margin-top: 3px; color: var(--text-muted); font-size: 9px; }.recommendation-due.overdue { background: var(--coral-bg); }.recommendation-due.overdue span { color: #bd3d34; }.recommendation-due.soon { background: var(--amber-bg); }.recommendation-due.done { background: #e9f8f3; }.recommendation-due.done span { color: #087f5b; }
.recommendation-detail { display: grid; grid-template-columns: .85fr 1.15fr; gap: 22px; padding: 18px 70px; border-top: 1px solid var(--border); background: #f8fbfd; }.recommendation-detail span { display: block; margin-bottom: 8px; color: var(--brand-blue); font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }.recommendation-detail p,.recommendation-detail li { color: var(--text-muted); font-size: 12px; line-height: 1.6; }.recommendation-detail ol { display: grid; gap: 5px; margin: 0; padding-left: 18px; }
.recommendation-products { grid-column: 1 / -1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 14px; border-top: 1px solid var(--border); }.recommendation-products > span { flex-basis: 100%; margin-bottom: 0; }.product-shop-link { display: inline-flex; align-items: center; gap: 7px; padding: 6px 13px 6px 6px; border: 1px solid var(--brand-blue); border-radius: 999px; background: #fff; color: var(--brand-blue); font-size: 11px; font-weight: 850; text-decoration: none; transition: background .15s, color .15s; }.product-shop-link img { width: 26px; height: 26px; object-fit: contain; border-radius: 999px; background: var(--teal-50); flex-shrink: 0; }.product-shop-link:hover { background: var(--brand-blue); color: #fff; }.product-plain { padding: 7px 13px; border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: 11px; font-weight: 850; }
.recommendation-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 11px 18px; border-top: 1px solid var(--border); }.recommendation-detail-enter-active,.recommendation-detail-leave-active { transition: .2s ease; }.recommendation-detail-enter-from,.recommendation-detail-leave-to { opacity: 0; transform: translateY(-5px); }
.recommendation-product-section { padding: 14px 18px; border-top: 1px solid var(--border); background: var(--surface-soft); }
@media (max-width: 1000px) { .recommendation-workspace { grid-template-columns: 1fr; }.recommendation-sidebar { position: static; grid-template-columns: 1fr 1fr; }.source-card { max-height: 300px; overflow: auto; } }
@media (max-width: 760px) { .recommendations-hero { grid-template-columns: 1fr; padding: 28px 24px; }.hero-status { min-width: 0; }.recommendation-stats { grid-template-columns: 1fr 1fr; }.recommendation-sidebar { grid-template-columns: 1fr; }.recommendation-card-main { grid-template-columns: 36px minmax(0,1fr); }.recommendation-due { grid-column: 2; text-align: left; }.recommendation-detail { grid-template-columns: 1fr; padding: 18px; }.recommendation-actions { align-items: stretch; flex-direction: column; }.recommendation-actions .btn { justify-content: center; } }
@media (max-width: 430px) { .recommendation-stats { grid-template-columns: 1fr; }.recommendations-hero h1 { font-size: 36px; } }
</style>
