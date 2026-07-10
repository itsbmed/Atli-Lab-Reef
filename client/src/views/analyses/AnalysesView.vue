<template>
  <div class="analysis-page">
    <section class="analysis-hero">
      <div>
        <span class="hero-kicker">Analyse Cockpit</span>
        <h1>Wasserwerte im Überblick</h1>
        <p>Alle Laborberichte, laufende Testkits und auffällige Ergebnisse nach Aquarium, Status und Priorität sortieren.</p>
      </div>
      <RouterLink to="/analyses/activate" class="btn btn-primary btn-lg">Neue Analyse registrieren</RouterLink>
    </section>

    <section class="stat-grid">
      <button v-for="item in statCards" :key="item.key" :class="['stat-card', item.tone, { active: filter.severity === item.key }]" type="button" @click="toggleSeverity(item.key)">
        <span>{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
        <em>{{ item.caption }}</em>
      </button>
    </section>

    <section class="analysis-workspace">
      <aside class="filter-panel">
        <div class="panel-title">
          <h2>Filter</h2>
          <button class="soft-link" type="button" @click="resetFilters">Zurücksetzen</button>
        </div>

        <div class="search-box">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" width="16" height="16"><circle cx="9" cy="9" r="6"/><path d="M15 15l-3-3"/></svg>
          <input v-model="filter.search" type="search" placeholder="Aquarium, Barcode, Paket..." />
        </div>

        <div class="form-group">
          <label>Status</label>
          <select v-model="filter.status">
            <option value="">Alle Status</option>
            <option value="registered">Registriert</option>
            <option value="received">Eingegangen</option>
            <option value="in_analysis">In Analyse</option>
            <option value="completed">Fertig</option>
          </select>
        </div>

        <div class="form-group">
          <label>Zeitraum</label>
          <select v-model="filter.range">
            <option value="all">Alle Daten</option>
            <option value="30">Letzte 30 Tage</option>
            <option value="90">Letzte 90 Tage</option>
            <option value="180">Letzte 180 Tage</option>
          </select>
        </div>

        <div class="form-group">
          <label>Sortierung</label>
          <select v-model="filter.sort">
            <option value="date_desc">Neueste zuerst</option>
            <option value="date_asc">Älteste zuerst</option>
            <option value="score_asc">Probleme zuerst</option>
            <option value="score_desc">Beste zuerst</option>
          </select>
        </div>

        <div class="severity-stack">
          <button v-for="option in severityOptions" :key="option.key" :class="['severity-chip', option.key, { active: filter.severity === option.key }]" type="button" @click="toggleSeverity(option.key)">
            <span>{{ option.label }}</span>
            <b>{{ countBySeverity(option.key) }}</b>
          </button>
        </div>
      </aside>

      <main class="results-area">
        <div class="view-toolbar">
          <div>
            <strong>{{ filteredAnalyses.length }} Berichte</strong>
            <span>{{ activeFilterLabel }}</span>
          </div>
          <div class="view-toggle">
            <button type="button" :class="{ active: viewMode === 'cards' }" @click="viewMode = 'cards'">Karten</button>
            <button type="button" :class="{ active: viewMode === 'table' }" @click="viewMode = 'table'">Tabelle</button>
          </div>
        </div>

        <section v-if="!analyses.count" class="empty-state">
          <span>Analyse-Center</span>
          <h2>Noch keine registrierten Analysen</h2>
          <p>Starten Sie mit einem Testkit-Barcode. Danach ordnen Sie die Probe einem Aquarium zu und verfolgen den Laborstatus.</p>
          <RouterLink to="/analyses/activate" class="btn btn-primary">Erste Analyse registrieren</RouterLink>
        </section>

        <section v-else-if="!filteredAnalyses.length" class="empty-state compact">
          <span>Keine Treffer</span>
          <h2>Keine passenden Analysen</h2>
          <p>Ändern Sie Filter, Zeitraum oder Suchbegriff, um weitere Laborberichte anzuzeigen.</p>
          <button class="btn btn-ghost" type="button" @click="resetFilters">Filter zurücksetzen</button>
        </section>

        <div v-else-if="viewMode === 'cards'" class="analysis-grid">
          <RouterLink v-for="analysis in filteredAnalyses" :key="analysis.id" :to="`/analyses/${analysis.id}`" :class="['analysis-card', analysis.severity]">
            <div class="analysis-card-head">
              <span :class="['status-badge', analysis.status]">{{ analysis.statusLabel }}</span>
              <strong>{{ scoreDisplay(analysis) }}</strong>
            </div>
            <div class="analysis-card-body">
              <span class="card-kicker">{{ analysis.waterType }} · {{ analysis.packageLabel }}</span>
              <h2>{{ analysis.aquariumName }}</h2>
              <p>{{ analysis.reasonLabel }} · {{ formatDate(analysis.createdAt) }} · {{ analysis.barcode }}</p>
              <div v-if="analysis.status === 'completed'" class="issue-preview">
                <span v-for="issue in previewIssues(analysis)" :key="issue">{{ issue }}</span>
              </div>
              <div v-else class="lab-progress">
                <span v-for="step in workflowSteps" :key="step.key" :class="{ done: step.rank <= statusRank(analysis.status), active: step.key === analysis.status }"></span>
              </div>
            </div>
            <div class="analysis-card-footer">
              <span>{{ analysis.issueCount }} Hinweise</span>
              <strong>Bericht öffnen</strong>
            </div>
          </RouterLink>
        </div>

        <div v-else class="table-card">
          <table>
            <thead>
              <tr>
                <th>Aquarium</th>
                <th>Analyse</th>
                <th>Qualität</th>
                <th>Hinweise</th>
                <th>Datum</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="analysis in filteredAnalyses" :key="analysis.id">
                <td><strong>{{ analysis.aquariumName }}</strong><span>{{ analysis.waterType }}</span></td>
                <td><code>{{ analysis.barcode }}</code><span>{{ analysis.packageLabel }} · {{ analysis.statusLabel }}</span></td>
                <td><b :class="analysis.severity">{{ scoreDisplay(analysis) }}</b></td>
                <td>{{ analysis.issueCount }}</td>
                <td>{{ formatDate(analysis.createdAt) }}</td>
                <td><RouterLink :to="`/analyses/${analysis.id}`" class="btn btn-ghost btn-sm">Öffnen</RouterLink></td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAnalysesStore } from '@/stores/analyses'
import { WORKFLOW_STEPS } from '@/services/analysisStore'

const analyses = useAnalysesStore()
const viewMode = ref('cards')
const filter = ref({ search: '', status: '', range: 'all', severity: '', sort: 'date_desc' })
const severityOptions = [
  { key: 'critical', label: 'Kritisch' },
  { key: 'watch', label: 'Beobachten' },
  { key: 'good', label: 'Stabil' },
  { key: 'open', label: 'Laufend' },
]
const workflowSteps = WORKFLOW_STEPS

onMounted(() => analyses.load())

const statCards = computed(() => [
  { key: 'all', label: 'Berichte', value: analyses.count, caption: 'gesamt', tone: 'neutral' },
  { key: 'critical', label: 'Kritisch', value: countBySeverity('critical'), caption: 'sofort prüfen', tone: 'critical' },
  { key: 'watch', label: 'Beobachten', value: countBySeverity('watch'), caption: 'auffällig', tone: 'watch' },
  { key: 'open', label: 'Laufend', value: countBySeverity('open'), caption: 'im Laborprozess', tone: 'open' },
])
const filteredAnalyses = computed(() => {
  const query = filter.value.search.trim().toLowerCase()
  const now = Date.now()
  const rangeDays = filter.value.range === 'all' ? null : Number(filter.value.range)
  return analyses.items
    .filter((analysis) => {
      if (query) {
        const haystack = [analysis.aquariumName, analysis.barcode, analysis.packageLabel, analysis.reasonLabel].join(' ').toLowerCase()
        if (!haystack.includes(query)) return false
      }
      if (filter.value.status && analysis.status !== filter.value.status) return false
      if (filter.value.severity && analysis.severity !== filter.value.severity) return false
      if (rangeDays) {
        const ageDays = (now - new Date(analysis.createdAt).getTime()) / 86400000
        if (ageDays > rangeDays) return false
      }
      return true
    })
    .sort((a, b) => {
      if (filter.value.sort === 'date_asc') return new Date(a.createdAt) - new Date(b.createdAt)
      if (filter.value.sort === 'score_asc') return (a.score ?? 999) - (b.score ?? 999)
      if (filter.value.sort === 'score_desc') return (b.score ?? -1) - (a.score ?? -1)
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
})
const activeFilterLabel = computed(() => {
  if (!filter.value.search && !filter.value.status && !filter.value.severity && filter.value.range === 'all') return 'Alle sichtbaren Laborberichte'
  return 'Gefilterte Ansicht'
})

function toggleSeverity(key) {
  filter.value.severity = key === 'all' || filter.value.severity === key ? '' : key
}
function resetFilters() {
  filter.value = { search: '', status: '', range: 'all', severity: '', sort: 'date_desc' }
}
function countBySeverity(key) {
  return analyses.items.filter((analysis) => analysis.severity === key).length
}
function statusRank(status) {
  return WORKFLOW_STEPS.find((step) => step.key === status)?.rank || 0
}
function scoreDisplay(analysis) {
  return analysis.score === null || analysis.score === undefined ? '—' : `${analysis.score}%`
}
function previewIssues(analysis) {
  return (analysis.issues || []).slice(0, 3)
}
function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<style scoped>
.analysis-page { display: grid; gap: 22px; }
.analysis-hero { display: flex; align-items: center; justify-content: space-between; gap: 22px; padding: clamp(24px, 4vw, 36px); border-radius: 28px; color: #fff; background: linear-gradient(120deg, rgba(10,27,67,0.96), rgba(0,51,102,0.84)), url('/reef-tank.webp') center / cover; box-shadow: var(--shadow); }
.hero-kicker { display: block; margin-bottom: 8px; color: var(--brand-sky); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.analysis-hero h1 { margin-bottom: 10px; font-size: clamp(32px, 5vw, 54px); line-height: 0.98; font-weight: 800; letter-spacing: -0.04em; }
.analysis-hero p { max-width: 620px; color: rgba(255,255,255,0.74); line-height: 1.6; }
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.stat-card { text-align: left; padding: 18px; border: 1px solid rgba(136,193,233,0.22); border-radius: 20px; background: #fff; box-shadow: var(--shadow); cursor: pointer; }
.stat-card.active { outline: 3px solid rgba(0,114,206,0.18); border-color: var(--teal-400); }
.stat-card span,
.stat-card strong,
.stat-card em { display: block; }
.stat-card span { color: var(--text-muted); font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; }
.stat-card strong { margin-top: 6px; color: var(--text); font-size: 32px; font-weight: 800; }
.stat-card em { color: var(--text-muted); font-style: normal; font-size: 12px; font-weight: 700; }
.stat-card.critical { border-color: rgba(232,93,79,0.28); }
.stat-card.watch { border-color: rgba(245,158,11,0.28); }
.analysis-workspace { display: grid; grid-template-columns: 290px minmax(0, 1fr); gap: 18px; align-items: start; }
.filter-panel,
.empty-state,
.table-card { border-radius: 22px; background: #fff; border: 1px solid rgba(136,193,233,0.22); box-shadow: var(--shadow); }
.filter-panel { position: sticky; top: 88px; display: grid; gap: 14px; padding: 18px; }
.panel-title,
.view-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
.panel-title h2 { color: var(--text); font-size: 18px; font-weight: 800; }
.soft-link { border: 0; background: none; color: var(--brand-blue); font-size: 12px; font-weight: 800; cursor: pointer; }
.search-box { position: relative; }
.search-box svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.search-box input,
.form-group select { width: 100%; min-height: 44px; border: 1px solid var(--border); border-radius: 13px; background: #fff; color: var(--text); outline: 0; }
.search-box input { padding: 0 12px 0 36px; }
.form-group { display: grid; gap: 7px; }
.form-group label { color: var(--text-muted); font-size: 12px; font-weight: 700; }
.form-group select { padding: 0 12px; }
.severity-stack { display: grid; gap: 8px; }
.severity-chip { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--border); border-radius: 14px; background: #fff; color: var(--text); font-weight: 800; cursor: pointer; }
.severity-chip.active { border-color: var(--teal-400); background: var(--teal-50); color: var(--brand-blue); }
.results-area { display: grid; gap: 14px; }
.view-toolbar { padding: 2px 2px 4px; }
.view-toolbar strong,
.view-toolbar span { display: block; }
.view-toolbar strong { color: var(--text); font-size: 18px; }
.view-toolbar span { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
.view-toggle { display: inline-flex; padding: 4px; border-radius: 999px; background: rgba(136,193,233,0.14); }
.view-toggle button { border: 0; border-radius: 999px; background: transparent; padding: 8px 13px; color: var(--text-muted); font-size: 12px; font-weight: 800; cursor: pointer; }
.view-toggle button.active { background: #fff; color: var(--brand-blue); box-shadow: 0 8px 20px rgba(10,27,67,0.08); }
.empty-state { display: grid; justify-items: center; text-align: center; gap: 10px; padding: clamp(32px, 5vw, 52px); }
.empty-state.compact { padding: 30px; }
.empty-state span { color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
.empty-state h2 { color: var(--text); font-size: 28px; font-weight: 800; letter-spacing: -0.03em; }
.empty-state p { max-width: 520px; color: var(--text-muted); line-height: 1.6; }
.analysis-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 330px), 1fr)); gap: 14px; }
.analysis-card { display: grid; gap: 16px; padding: 18px; border-radius: 22px; background: #fff; border: 1px solid rgba(136,193,233,0.22); box-shadow: var(--shadow); color: inherit; text-decoration: none; transition: transform 0.16s, border-color 0.16s; }
.analysis-card:hover { transform: translateY(-2px); border-color: var(--teal-400); }
.analysis-card.critical { border-color: rgba(232,93,79,0.34); }
.analysis-card.watch { border-color: rgba(245,158,11,0.34); }
.analysis-card-head,
.analysis-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.analysis-card-head strong { color: var(--text); font-size: 30px; font-weight: 800; letter-spacing: -0.04em; }
.status-badge { padding: 6px 10px; border-radius: 999px; background: var(--teal-50); color: var(--teal-700); font-size: 11px; font-weight: 800; }
.status-badge.completed { background: #dcfce7; color: #047857; }
.status-badge.received,
.status-badge.in_analysis { background: #fff7ed; color: #92400e; }
.card-kicker { color: var(--brand-blue); font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
.analysis-card h2 { margin: 5px 0; color: var(--text); font-size: 22px; font-weight: 800; letter-spacing: -0.03em; }
.analysis-card p { color: var(--text-muted); font-size: 13px; }
.issue-preview { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 14px; }
.issue-preview span { padding: 6px 9px; border-radius: 999px; background: #fff7ed; color: #92400e; font-size: 11px; font-weight: 800; }
.lab-progress { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 16px; }
.lab-progress span { height: 8px; border-radius: 999px; background: rgba(100,130,165,0.16); }
.lab-progress span.done { background: var(--teal-400); }
.lab-progress span.active { background: var(--brand-blue); }
.analysis-card-footer { color: var(--text-muted); font-size: 12px; font-weight: 800; }
.analysis-card-footer strong { color: var(--brand-blue); }
.table-card { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; }
th { color: var(--text-muted); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; }
td strong,
td span { display: block; }
td span { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
td code { color: var(--brand-blue); font-weight: 800; }
td b.good { color: #047857; }
td b.watch { color: #92400e; }
td b.critical { color: var(--coral); }
@media (max-width: 980px) {
  .analysis-workspace,
  .stat-grid { grid-template-columns: 1fr; }
  .filter-panel { position: static; }
}
@media (max-width: 680px) {
  .analysis-hero { align-items: flex-start; flex-direction: column; }
  .analysis-hero .btn,
  .view-toggle { width: 100%; }
  .view-toolbar { align-items: stretch; flex-direction: column; }
}
</style>
