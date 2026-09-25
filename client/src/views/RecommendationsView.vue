<template>
  <div class="report-page tasks-page">
    <section class="tasks-hero">
      <div>
        <span class="hero-kicker">Pflegeplan</span>
        <h1>Ihre Aufgaben</h1>
        <p>Alle offenen Maßnahmen aus den neuesten Berichten — über alle Aquarien hinweg, nach Fälligkeit sortiert.</p>
      </div>
      <div class="hero-status">
        <strong>{{ openItems.length }}</strong>
        <span>{{ openItems.length === 1 ? 'offene Aufgabe' : 'offene Aufgaben' }}</span>
        <em v-if="dueNowItems.length">{{ dueNowItems.length }} davon jetzt fällig</em>
        <em v-else-if="openItems.length">nichts überfällig</em>
      </div>
    </section>

    <section v-if="loading" class="tasks-skeleton" aria-live="polite" aria-label="Aufgaben werden geladen">
      <span v-for="item in 3" :key="item"></span>
    </section>

    <EmptyState
      v-else-if="!latestReports.length"
      kicker="Noch kein Pflegeplan"
      title="Aufgaben entstehen nach Ihrer ersten Analyse"
      message="Registrieren Sie ein Testkit und ordnen Sie es einem Aquarium zu. Sobald der Bericht abgeschlossen ist, erscheinen die nächsten Schritte hier."
      mark="ATI"
    >
      <template #actions>
        <RouterLink to="/analyses/activate" class="btn btn-primary">Analyse registrieren</RouterLink>
        <RouterLink to="/analyses" class="btn btn-ghost">Analysen ansehen</RouterLink>
      </template>
    </EmptyState>

    <EmptyState
      v-else-if="!openItems.length && !completedItems.length"
      kicker="Alles erledigt"
      title="Aktuell ist keine Maßnahme nötig"
      message="Alle bewerteten Messwerte der neuesten Berichte liegen in ihrem Zielbereich. Pflege und Dosierung können unverändert weiterlaufen."
      mark="OK"
    >
      <template #actions>
        <RouterLink to="/analyses" class="btn btn-ghost">Berichte ansehen</RouterLink>
      </template>
    </EmptyState>

    <template v-else>
      <section v-for="group in visibleGroups" :key="group.key" :class="['task-group', group.key]">
        <header>
          <h2>{{ group.label }}</h2>
          <span>{{ group.items.length }}</span>
        </header>

        <article v-for="item in group.items" :key="item.id" :class="['task-row', item.tone, { open: expanded[item.id] }]">
          <button
            type="button"
            class="task-check"
            :aria-label="`${item.title} als erledigt markieren`"
            :aria-pressed="false"
            @click="toggleCompleted(item)"
          ><span></span></button>

          <button type="button" class="task-body" :aria-expanded="Boolean(expanded[item.id])" @click="expanded[item.id] = !expanded[item.id]">
            <span class="task-title">{{ item.title }}</span>
            <span class="task-meta">
              <b>{{ item.aquariumName }}</b>
              <em v-if="item.elements.length">{{ item.elements.join(', ') }}</em>
            </span>
          </button>

          <span :class="['task-due', dueTone(item)]">{{ dueLabel(item.dueDate) }}</span>
          <span class="task-chevron" aria-hidden="true">⌄</span>

          <Transition name="task-detail">
            <div v-show="expanded[item.id]" class="task-detail">
              <p>{{ item.summary }}</p>

              <div v-if="item.options.length" class="task-options">
                <article v-for="option in item.options" :key="option.text">
                  <span v-if="option.label">{{ option.label }}</span>
                  <p>{{ option.text }}</p>
                </article>
              </div>

              <div v-if="item.detailLabel && item.detailItems.length" class="task-detail-block">
                <span>{{ item.detailLabel }}</span>
                <ul>
                  <li v-for="entry in item.detailItems" :key="entry.label">{{ entry.label }}<b v-if="entry.value">{{ entry.value }}</b></li>
                </ul>
              </div>

              <footer>
                <RouterLink :to="`/analyses/${item.analysisId}`" class="btn btn-ghost btn-sm">Bericht öffnen</RouterLink>
                <small>Aus {{ item.reportNumber }} · {{ formatDate(item.reportDate) }}</small>
              </footer>
            </div>
          </Transition>
        </article>
      </section>

      <section v-if="completedItems.length" class="task-group done">
        <header>
          <h2>Erledigt</h2>
          <span>{{ completedItems.length }}</span>
          <button type="button" class="soft-link" @click="showDone = !showDone">{{ showDone ? 'Ausblenden' : 'Anzeigen' }}</button>
        </header>
        <template v-if="showDone">
          <article v-for="item in completedItems" :key="item.id" class="task-row completed">
            <button type="button" class="task-check done" :aria-label="`${item.title} wieder öffnen`" :aria-pressed="true" @click="toggleCompleted(item)"><span>✓</span></button>
            <span class="task-body static">
              <span class="task-title">{{ item.title }}</span>
              <span class="task-meta"><b>{{ item.aquariumName }}</b></span>
            </span>
          </article>
        </template>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useAnalysesStore } from '@/stores/analyses'
import { useAuthStore } from '@/stores/auth'
import { buildRecommendationItems, dueBucket, dueLabel, latestCompletedByAquarium } from '@/services/recommendationsHub'
import { loadRecommendationProgress, saveRecommendationProgress } from '@/services/recommendationProgress'
import { buildDosingPlan } from '@/services/dosingPlan'
import '@/assets/styles/report-base.css'
import EmptyState from '@/components/ui/EmptyState.vue'

const GROUPS = [
  { key: 'now', label: 'Jetzt fällig' },
  { key: 'week', label: 'Diese Woche' },
  { key: 'later', label: 'Später' },
]

const analyses = useAnalysesStore()
const auth = useAuthStore()
const loading = ref(true)
const expanded = reactive({})
const completed = reactive({})
const showDone = ref(false)

onMounted(async () => {
  await Promise.resolve(analyses.load())
  for (const report of latestCompletedByAquarium(analyses.items)) {
    Object.assign(completed, mapProgress(report.id, loadRecommendationProgress(auth.user?.id, report.id)))
  }
  loading.value = false
})

const latestReports = computed(() => latestCompletedByAquarium(analyses.items))
const items = computed(() => buildRecommendationItems(latestReports.value, {
  dosingKeysFor: (analysis) => buildDosingPlan(
    analysis.parameters || [],
    Number(analysis.aquariumProfile?.volumeLiters || analysis.aquariumProfile?.net_volume || 0),
  ).filter((entry) => entry.dose).map((entry) => entry.key),
}))
const openItems = computed(() => items.value.filter((item) => !completed[item.id]))
const completedItems = computed(() => items.value.filter((item) => completed[item.id]))
const dueNowItems = computed(() => openItems.value.filter((item) => dueBucket(item.dueDate) === 'now'))
const visibleGroups = computed(() => GROUPS
  .map((group) => ({ ...group, items: openItems.value.filter((item) => dueBucket(item.dueDate) === group.key) }))
  .filter((group) => group.items.length))

function mapProgress(analysisId, progress) {
  return Object.fromEntries(Object.entries(progress).filter(([, done]) => done).map(([key]) => [`${analysisId}:${key}`, true]))
}
function toggleCompleted(item) {
  completed[item.id] = !completed[item.id]
  const forReport = items.value.filter((entry) => entry.analysisId === item.analysisId)
  saveRecommendationProgress(auth.user?.id, item.analysisId, Object.fromEntries(forReport.map((entry) => [entry.key, Boolean(completed[entry.id])])))
}
function dueTone(item) {
  return dueBucket(item.dueDate) === 'now' ? 'now' : item.tone
}
function formatDate(value) {
  return new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.tasks-page { display: grid; gap: 18px; }
.tasks-hero { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: clamp(22px, 3vw, 30px); border-radius: 24px; color: #fff; background: linear-gradient(120deg, rgba(10,27,67,0.96), rgba(0,51,102,0.84)); box-shadow: var(--shadow); }
.hero-kicker { display: block; margin-bottom: 7px; color: var(--brand-sky); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.tasks-hero h1 { margin-bottom: 6px; font-size: clamp(26px, 3.4vw, 38px); line-height: 1.05; font-weight: 800; letter-spacing: -0.03em; }
.tasks-hero p { max-width: 560px; color: rgba(255,255,255,0.74); font-size: 14px; line-height: 1.55; }
.hero-status { flex: none; padding: 16px 20px; border-radius: 18px; background: rgba(255,255,255,0.1); text-align: center; }
.hero-status strong { display: block; font-size: 34px; font-weight: 850; line-height: 1; }
.hero-status span { display: block; margin-top: 5px; color: rgba(255,255,255,0.8); font-size: 12px; font-weight: 800; }
.hero-status em { display: block; margin-top: 7px; color: var(--brand-sky); font-size: 11px; font-style: normal; font-weight: 800; }

.task-group { display: grid; gap: 9px; }
.task-group > header { display: flex; align-items: center; gap: 10px; padding: 4px 2px; }
.task-group h2 { color: var(--text); font-size: 15px; font-weight: 850; letter-spacing: -0.01em; }
.task-group > header > span { display: grid; place-items: center; min-width: 22px; height: 22px; padding: 0 7px; border-radius: 999px; background: rgba(136,193,233,0.22); color: var(--brand-blue); font-size: 11px; font-weight: 850; }
.task-group.now h2 { color: #b53a2e; }
.task-group.now > header > span { background: #fdecea; color: #b53a2e; }
.soft-link { margin-left: auto; border: 0; background: none; color: var(--brand-blue); font-size: 12px; font-weight: 800; cursor: pointer; }
.soft-link:hover { text-decoration: underline; }

.task-row { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto 16px; align-items: center; gap: 13px; padding: 14px 17px; border: 1px solid rgba(136,193,233,0.22); border-left: 4px solid #f59e0b; border-radius: 15px; background: #fff; box-shadow: var(--shadow); transition: border-color .16s, box-shadow .16s; }
.task-row.critical { border-left-color: #e85d4f; }
.task-row:hover { border-color: var(--teal-400); }
.task-row.open { box-shadow: 0 10px 26px rgba(10,27,67,0.09); }
.task-row.completed { grid-template-columns: 30px minmax(0, 1fr); border-left-color: #10b981; opacity: 0.6; }
.task-check { display: grid; place-items: center; width: 26px; height: 26px; padding: 0; border: 2px solid var(--border-strong, #b8c9dd); border-radius: 9px; background: #fff; color: transparent; cursor: pointer; transition: border-color .15s, background .15s; }
.task-check:hover { border-color: #10b981; }
.task-check.done { border-color: #10b981; background: #10b981; color: #fff; font-size: 14px; font-weight: 900; }
.task-body { min-width: 0; padding: 0; border: 0; background: none; text-align: left; cursor: pointer; }
.task-body.static { cursor: default; }
.task-title { display: block; overflow: hidden; color: var(--text); font-size: 15px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }
.task-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 3px; }
.task-meta b { color: var(--brand-blue); font-size: 12px; font-weight: 800; }
.task-meta em { overflow: hidden; color: var(--text-muted); font-size: 11.5px; font-style: normal; text-overflow: ellipsis; white-space: nowrap; }
.task-due { padding: 6px 11px; border-radius: 999px; background: #fff7ed; color: #92400e; font-size: 11px; font-weight: 800; white-space: nowrap; }
.task-due.now { background: #fdecea; color: #b53a2e; }
.task-due.watch { background: #f4f8fb; color: var(--text-muted); }
.task-chevron { color: var(--brand-blue); font-size: 17px; line-height: 1; transition: transform .2s; }
.task-row.open .task-chevron { transform: rotate(180deg); }

.task-detail { grid-column: 1 / -1; display: grid; gap: 12px; margin-top: 12px; padding-top: 14px; border-top: 1px solid var(--border); }
.task-detail > p { color: var(--text-muted); font-size: 13px; line-height: 1.6; }
.task-options { display: grid; gap: 8px; padding: 14px 16px; border-radius: 12px; background: #eff8ff; }
.task-options span { display: block; margin-bottom: 4px; color: var(--brand-blue); font-size: 11px; font-weight: 850; }
.task-options p { color: #0c4a6e; font-size: 12.5px; line-height: 1.55; }
.task-detail-block { padding: 13px 15px; border-radius: 12px; background: #f6fafc; }
.task-detail-block > span { display: block; margin-bottom: 8px; color: var(--teal-700); font-size: 10px; font-weight: 850; letter-spacing: 0.07em; text-transform: uppercase; }
.task-detail-block ul { display: flex; flex-wrap: wrap; gap: 7px; margin: 0; padding: 0; list-style: none; }
.task-detail-block li { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; border: 1px solid var(--border); border-radius: 9px; background: #fff; color: var(--text); font-size: 12px; font-weight: 700; }
.task-detail-block li b { padding: 2px 6px; border-radius: 999px; background: var(--brand-blue); color: #fff; font-size: 10.5px; }
.task-detail footer { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; }
.task-detail footer small { color: var(--text-muted); font-size: 11px; }
.task-detail-enter-active, .task-detail-leave-active { overflow: hidden; transition: max-height .3s ease, opacity .3s ease; }
.task-detail-enter-from, .task-detail-leave-to { max-height: 0; opacity: 0; }
.task-detail-enter-to, .task-detail-leave-from { max-height: 700px; opacity: 1; }

.tasks-skeleton { display: grid; gap: 9px; }
.tasks-skeleton span { display: block; height: 68px; border-radius: 15px; background: linear-gradient(90deg, #e8eff6 20%, #f7fafe 42%, #e8eff6 64%); background-size: 220% 100%; animation: task-shimmer 1.25s ease-in-out infinite; }
@keyframes task-shimmer { to { background-position: -120% 0; } }

@media (max-width: 680px) {
  .tasks-hero { align-items: stretch; flex-direction: column; }
  .task-row { grid-template-columns: 26px minmax(0, 1fr) auto; gap: 11px; padding: 13px 14px; }
  .task-chevron { display: none; }
  .task-due { grid-column: 2 / -1; justify-self: start; }
}
</style>
